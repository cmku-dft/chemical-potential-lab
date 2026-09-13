import {pickFace} from './faces3d.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palette=['#65a7de','#60c5cf','#afa7de','#7ac9ad','#e6be77','#91b5d8','#d99bb3','#9ac775'];
export const faceColor=face=>face.kind==='host'?'#eb8fcd':face.kind==='element'?'#a5b4d8':palette[(face.rows[0].index??face.id)%palette.length];
const labelOf=face=>face.labels.map(t=>t.replace(' elemental limit',' (element)')).join(' / ');
const equation=row=>Object.entries(row.counts).map(([e,n])=>`${n===1?'':n}Δμ${e}`).join(' + ')+` = ${row.enthalpy.toFixed(4)} eV/formula`;

export function renderPhaseSpace(r,space,p,{selected,own,formula}){
  const {axes,ranges,project}=p,point=mu=>project(mu).join(','),occupied=[];
  const line=(a,b,stroke,width=1,dash='')=>`<line x1="${project(a)[0]}" y1="${project(a)[1]}" x2="${project(b)[0]}" y2="${project(b)[1]}" stroke="${stroke}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
  const text=(pos,value,fill='#264655',size=13,anchor='middle',avoid=false)=>{
    let [x,y]=pos;const width=value.length*size*.57;
    if(avoid)for(const [dx,dy]of [[0,0],[0,-20],[0,20],[25,-20],[-25,-20],[25,20],[-25,20],[0,-40],[0,40]]){
      const nx=Math.max(width/2+8,Math.min(852-width/2,pos[0]+dx)),ny=Math.max(66,Math.min(443,pos[1]+dy));
      const box=[nx-width/2-3,ny-size-3,width+6,size+6];
      if(!occupied.some(b=>box[0]<b[0]+b[2]&&box[0]+box[2]>b[0]&&box[1]<b[1]+b[3]&&box[1]+box[3]>b[1])){x=nx;y=ny;break;}
    }
    occupied.push([x-(anchor==='middle'?width/2:anchor==='end'?width:0)-3,y-size-3,width+6,size+6]);
    return `${avoid&&(x!==pos[0]||y!==pos[1])?`<line x1="${pos[0]}" y1="${pos[1]}" x2="${x}" y2="${y-5}" stroke="${fill}" opacity=".45"/>`:''}<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="system-ui" font-size="${size}" fill="${fill}" stroke="white" stroke-width="3" paint-order="stroke" pointer-events="none">${esc(value)}</text>`;
  };
  let svg=`<svg id="diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 510" role="img" aria-label="Interactive 3D phase faces for ${esc(formula)}"><title>${esc(formula)} — calculated 3D phase faces</title><desc>X: ${r.x}, Y: ${r.y}, Z: ${r.z}. All axes in eV/atom with equal physical scales. Pink is the host equilibrium face. Other colored faces are stable parts of competing-phase equilibrium planes, clipped to display bounds. ${own?'User-supplied':'Illustrative'} energies.</desc><rect width="860" height="510" fill="white"/>`;
  const corner=Object.fromEntries(axes.map((e,i)=>[e,ranges[i][0]]));
  for(let i=0;i<3;i++)for(let mask=0;mask<4;mask++){
    const a={...corner},others=[0,1,2].filter(j=>j!==i);others.forEach((j,k)=>a[axes[j]]=ranges[j][(mask>>k)&1]);
    svg+=line(a,{...a,[axes[i]]:ranges[i][1]},'#ccd8e0',1,'4 5');
  }
  const center=face=>Object.fromEntries(axes.map(e=>[e,face.vertices.reduce((s,v)=>s+v[e]/face.vertices.length,0)]));
  const facing=face=>face.normal.reduce((s,n,i)=>s+n*p.direction[space.elements[i]],0);
  // Convex facets facing away are behind facets facing the camera; facets
  // within each facing group cannot overlap except at a common boundary.
  const sorted=[...space.faces].sort((a,b)=>(facing(a)>0)-(facing(b)>0)||p.depth(center(a))-p.depth(center(b)));
  for(const face of sorted){
    svg+=`<polygon data-phase-face="${face.id}" points="${face.vertices.map(point).join(' ')}" fill="${faceColor(face)}" stroke="${face.kind==='host'?'#96246f':'#426684'}" stroke-width="${face.kind==='host'?2.6:1.2}" stroke-linejoin="round"><title>${esc(labelOf(face))}: ${esc(equation(face.rows[0]))}</title></polygon>`;
  }
  // A convex surface can be viewed from either side. Labels and markers appear
  // only where the host/face is actually the nearest physical surface.
  const visible=(mu,face)=>{const hit=pickFace(space,p,project(mu));return hit&&(hit.face===face||Math.abs(hit.depth-p.depth(mu))<space.tolerance*8);};
  const axisColors=['#386bb8','#aa6422','#8853a1'];
  axes.forEach((e,i)=>{
    const end={...corner,[e]:ranges[i][1]};svg+=line(corner,end,axisColors[i],2);
    for(let j=0;j<=3;j++){const value=ranges[i][0]+(ranges[i][1]-ranges[i][0])*j/3,pos=project({...corner,[e]:value});svg+=`<circle cx="${pos[0]}" cy="${pos[1]}" r="2" fill="${axisColors[i]}"/>`;if(j>0||i===0)svg+=text([pos[0]+(i===2?-10:0),pos[1]+(i===2?4:17)],Math.abs(value)<.005?'0.00':value.toFixed(2),axisColors[i],12,i===2?'end':'middle');}
    const q=project(end),o=project(corner),length=Math.hypot(q[0]-o[0],q[1]-o[1])||1;
    svg+=text([q[0]+31*(q[0]-o[0])/length,q[1]+31*(q[1]-o[1])/length],`${['X','Y','Z'][i]} · Δμ${e}`,axisColors[i],15);
  });
  const hostFace=space.faces.find(f=>f.kind==='host');
  if(r.dimension===1){
    // A marginal host may be only a segment, not a finite face.
    let a=r.chemicalPotentials(r.vertices[0]),b=r.chemicalPotentials(r.vertices[1]),lo=0,hi=1;
    for(const e of axes){const d=b[e]-a[e];if(Math.abs(d)<1e-12){if(a[e]<space.bounds[e][0]||a[e]>space.bounds[e][1])hi=-1;continue;}
      const t=space.bounds[e].map(v=>(v-a[e])/d).sort((x,y)=>x-y);lo=Math.max(lo,t[0]);hi=Math.min(hi,t[1]);}
    if(lo<=hi){const at=t=>Object.fromEntries(axes.map(e=>[e,a[e]+t*(b[e]-a[e])]));svg+=line(at(lo),at(hi),'#96246f',3);}
  }
  const shownVertices=[];
  r.vertices.forEach((vertex,i)=>{
    const mu=r.chemicalPotentials(vertex);if(!space.within(mu)|| (hostFace&&!visible(mu,hostFace)))return;
    const [x,y]=project(mu);shownVertices.push([x,y,i]);
    svg+=`<g data-vertex="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="11" fill="transparent"/><circle cx="${x}" cy="${y}" r="4.3" fill="white" stroke="#96246f" stroke-width="2"/></g>`;
  });
  if(selected){const mu=r.chemicalPotentials(selected);if(space.within(mu)&&(!hostFace||visible(mu,hostFace))){const [x,y]=project(mu);svg+=`<circle cx="${x}" cy="${y}" r="6" fill="#b64c11" stroke="white" stroke-width="2" pointer-events="none"/>`;}}
  for(const [x,y,i]of shownVertices)svg+=text([x+11,y-10],`V${i+1}`,'#69245e',12,'middle',true);
  // Label host last in the face order but first for collision placement.
  for(const face of [...space.faces].sort((a,b)=>(b.kind==='host')-(a.kind==='host'))){const mu=center(face);if(!visible(mu,face))continue;svg+=text(project(mu),labelOf(face),face.kind==='host'?'#7e155c':'#1d4268',face.kind==='host'?15:14,'middle',true);}
  svg+=text([430,24],`X = Δμ${r.x} · Y = Δμ${r.y} · Z = Δμ${r.z} | eV / atom`,'#425f70',14);
  svg+=text([430,475],'Pink: host stability · Other colors: competing-phase faces','#425f70',13);
  svg+=text([430,496],'Display bounds trim the faces; they do not set the host stability limits.','#657b86',12);
  svg+=text([842,45],own?'USER-SUPPLIED ENERGIES':'ILLUSTRATIVE ENERGIES','#71858e',11,'end');
  if(!space.faces.length)svg+=text([430,245],'No phase faces inside these display bounds.','#a45a27',19);
  return svg+'</svg>';
}
