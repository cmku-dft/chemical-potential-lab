import {renderFrontAxes} from './front-axes.mjs';
import {maskLineArtwork} from './occlusion.mjs';
// Orthographic 3D geometry: equal physical units on every axis, no data distortion.
import {potentialSVG,ticks,tickStep,tickLabel,roundRange,formulaSVG} from './display.mjs';
import {buildPhaseFaces} from './faces3d.mjs';
import {renderPhaseSpace} from './render-faces.mjs';
export const defaultCamera={azimuth:-135,elevation:25,zoom:1,frontAxes:false,showHost:false,showFaces:true,bounds:null,opacity:.75,tickInterval:0,equalScale:true,showPhaseLabels:true,showVertexLabels:true,showAxisLabels:true,showSelectedPoint:true};
const faceCache=new WeakMap();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(n,d=2)=>Math.abs(n)<.5*10**-d?(0).toFixed(d):n.toFixed(d);
export function makeProjection(r,camera=defaultCamera,space=null){
  const axes=[r.x,r.y,r.z],muPoints=r.vertices.map(p=>r.chemicalPotentials(p));
  const host=r.h<=0?axes.map(e=>Object.fromEntries(axes.map(f=>[f,f===e?r.h/r.composition[f]:0]))):[];
  const extentPoints=camera.showHost&&host.length?host:muPoints;
  let ranges=axes.map(e=>{if(space)return space.bounds[e];const values=extentPoints.map(p=>p[e]);if(!values.length)return [-1,0];const lo=Math.min(...values),hi=Math.max(...values);return hi-lo<1e-10?[lo-.25,hi+.25]:[lo,hi];});
  const interval=tickStep(ranges,camera.tickInterval);
  // Phase faces and the frame must use the same exact display bounds.
  // Only the automatically fitted host-only view may round its limits.
  if(!space)ranges=ranges.map(a=>roundRange(a,interval));
  const spans=ranges.map(([lo,hi])=>hi-lo),span=Math.max(.5,...spans),center=ranges.map(([lo,hi])=>(lo+hi)/2);
  const az=camera.azimuth*Math.PI/180,el=camera.elevation*Math.PI/180;
  // Horizontal screen vector and vertical screen vector form an orthonormal camera basis.
  const right=[Math.cos(az),-Math.sin(az),0],up=[Math.sin(az)*Math.sin(el),Math.cos(az)*Math.sin(el),Math.cos(el)];
  const forward=[-Math.sin(az)*Math.cos(el),-Math.cos(az)*Math.cos(el),Math.sin(el)];
  const depth=mu=>axes.reduce((s,e,i)=>s+(mu[e]-center[i])*forward[i],0);
  const scale=300/span*camera.zoom;
  const project=mu=>{const p=axes.map((e,i)=>mu[e]-center[i]);return [430+scale*p.reduce((v,n,i)=>v+n*right[i],0),255-scale*p.reduce((v,n,i)=>v+n*up[i],0)];};
  const origin=project(r.chemicalPotentials([0,0])),px=project(r.chemicalPotentials([1,0])),py=project(r.chemicalPotentials([0,1]));
  const u=[px[0]-origin[0],px[1]-origin[1]],v=[py[0]-origin[0],py[1]-origin[1]],det=u[0]*v[1]-u[1]*v[0];
  const edgeOn=Math.abs(det)<1e-6*Math.hypot(...u)*Math.hypot(...v);
  const unproject=([x,y])=>{if(edgeOn)return null;const dx=x-origin[0],dy=y-origin[1];return [(dx*v[1]-dy*v[0])/det,(u[0]*dy-u[1]*dx)/det];};
  return {axes,ranges,interval,host,project,unproject,edgeOn,scale,depth,direction:Object.fromEntries(axes.map((e,i)=>[e,forward[i]]))};
}
export function render3D(r,{camera=defaultCamera,selected=null,own=false,formula='',color=()=> '#087f78'}={}){
  if(camera.showSelectedPoint===false)selected=null;
  if(camera.showFaces){
    const key=JSON.stringify([camera.bounds,formula]);let cached=faceCache.get(r);
    if(!cached||cached.key!==key){cached={key,space:buildPhaseFaces(r,{...(camera.bounds?{bounds:camera.bounds}:{}),formula})};faceCache.set(r,cached);}
    const space=cached.space,projection=makeProjection(r,camera,space);
    return {svg:renderPhaseSpace(r,space,projection,{selected,own,formula,opacity:camera.opacity??.75,frontAxes:camera.frontAxes}),projection,space};
  }
  const projection=makeProjection(r,camera),{axes,ranges,host,project}=projection;
  const point=p=>project(p).join(','),mu=p=>r.chemicalPotentials(p);
  const occupied=[],annotations=[];
  const label=(p,t,fill='#546e7b',size=13,anchor='middle',avoid=false,chemical=false)=>{
    const width=t.length*size*.57,box=q=>[q[0]-(anchor==='middle'?width/2:anchor==='end'?width:0)-3,q[1]-size-3,width+6,size+6];
    let at=p;
    if(avoid){const candidates=[[0,0],[0,-20],[0,20],[22,-20],[-22,-20],[22,20],[-22,20],[0,-40],[0,40],[40,-40],[-40,-40]];for(const [dx,dy]of candidates){const q=[p[0]+dx,p[1]+dy],b=box(q);if(!occupied.some(a=>b[0]<a[0]+a[2]&&b[0]+b[2]>a[0]&&b[1]<a[1]+a[3]&&b[1]+b[3]>a[1])){at=q;break;}}}
    occupied.push(box(at));const leader=at===p?'':`<line x1="${p[0]}" y1="${p[1]}" x2="${at[0]}" y2="${at[1]-size/2}" stroke="${fill}" opacity=".4"/>`;
    const kind=chemical?'phase':/^V\d+$/.test(t)?'vertex':t.includes('μ')?'axis':null;
    return `<g ${kind?`data-plot-label="${kind}"`:""}>${leader}<text x="${at[0]}" y="${at[1]}" text-anchor="${anchor}" font-family="system-ui" font-size="${size}" fill="${fill}" stroke="white" stroke-width="4" paint-order="stroke">${chemical?formulaSVG(t):potentialSVG(t)}</text></g>`;
  };
  const line=(a,b,stroke='#d1dfe6',width=1,dash='')=>`<line x1="${project(a)[0]}" y1="${project(a)[1]}" x2="${project(b)[0]}" y2="${project(b)[1]}" stroke="${stroke}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
  let svg=`<svg id="diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 510" role="img" aria-label="Rotatable 3D chemical-potential stability diagram for ${esc(formula)}"><title>${esc(formula)} — 3D chemical-potential stability</title><desc>X: ${r.x}, Y: ${r.y}, Z: ${r.z}. All axes in eV/atom with equal physical scales. ${own?'User-supplied':'Illustrative'} energies. The allowed set lies on the host equality plane.</desc><rect width="860" height="510" fill="white"/>`;
  const surfaces=(camera.showHost&&host.length===3)?[{vertices:host}]:r.vertices.length>=3?[{vertices:r.vertices.map(mu)}]:[];
  let frame='';
  const corner=Object.fromEntries(axes.map((e,i)=>[e,ranges[i][0]]));
  // Wireframe extent box provides depth without hiding the phase region.
  for(let i=0;i<3;i++)for(let mask=0;mask<4;mask++){
    const a={...corner},others=[0,1,2].filter(j=>j!==i);others.forEach((j,k)=>a[axes[j]]=ranges[j][(mask>>k)&1]);
    const b={...a,[axes[i]]:ranges[i][1]};frame+=line(a,b,'#d9e4e9',1,'4 5');
  }
  svg+=`<g data-frame="true">${frame}</g>`;
  if(camera.showHost&&host.length===3){svg+=`<polygon points="${host.map(point).join(' ')}" fill="#dce7f4" fill-opacity="${camera.opacity??.75}" stroke="#93a9c0" stroke-width="1.2" stroke-dasharray="5 4"/>`;
    // Draw each nonconstant phase boundary where it intersects the host triangle.
    for(const q of r.constraints.filter(c=>c.kind==='phase')){const pts=[];
      for(let i=0;i<3;i++){const a=host[i],b=host[(i+1)%3],da=q.A*a[r.x]+q.B*a[r.y]-q.C,db=q.A*b[r.x]+q.B*b[r.y]-q.C;
        if(Math.abs(da)<r.tolerance)pts.push(a);
        if(da*db<0){const t=da/(da-db);pts.push(Object.fromEntries(axes.map(e=>[e,a[e]+t*(b[e]-a[e])])));}
      }
      const unique=pts.filter((p,i)=>!pts.slice(0,i).some(q=>axes.every(e=>Math.abs(p[e]-q[e])<r.tolerance)));
      if(unique.length===2)svg+=line(unique[0],unique[1],color(q),1,'5 5');
    }
  }
  const vertices=r.vertices.map(p=>mu(p));
  if(vertices.length>=3)svg+=`<polygon points="${vertices.map(point).join(' ')}" fill="#59c5ad" fill-opacity="${camera.opacity??.75}" stroke="#087f78" stroke-width="2.5"/>`;
  if(vertices.length===2)svg+=line(vertices[0],vertices[1],'#087f78',3);
  if(vertices.length>2){const center=vertices.map(project).reduce((p,q)=>[p[0]+q[0]/vertices.length,p[1]+q[1]/vertices.length],[0,0]);
    r.vertices.forEach((p,i)=>{const q=r.vertices[(i+1)%vertices.length],mid=[(p[0]+q[0])/2,(p[1]+q[1])/2],active=r.active(mid),pos=project(mu(mid)),n=Math.hypot(pos[0]-center[0],pos[1]-center[1])||1;
      if(active.length)annotations.push([[pos[0]+20*(pos[0]-center[0])/n,pos[1]+20*(pos[1]-center[1])/n],active.map(q=>q.label.replace(' elemental limit','')).join(' / '),color(active[0])]);
    });
  }
  const axisColors=['#386bb8','#aa6422','#8853a1'];
  if(!camera.frontAxes)axes.forEach((e,i)=>{const end={...corner,[e]:ranges[i][1]};let artwork=line(corner,end,axisColors[i],2);
    for(const value of ticks(ranges[i],projection.interval)){const p=project({...corner,[e]:value});artwork+=`<circle cx="${p[0]}" cy="${p[1]}" r="2" fill="${axisColors[i]}"/>`;artwork+=label([p[0]+(i===2?-12:0),p[1]+(i===2?4:18)],tickLabel(value,projection.interval),axisColors[i],12,i===2?'end':'middle');}
    const p=project(end),o=project(corner),n=Math.hypot(p[0]-o[0],p[1]-o[1])||1;artwork+=label([p[0]+32*(p[0]-o[0])/n,p[1]+32*(p[1]-o[1])/n],`${['X','Y','Z'][i]} · Δμ${e}`,axisColors[i],15);svg+=maskLineArtwork(`axis-${i}`,artwork,corner,end,surfaces,projection,camera.opacity??.75);
  });
  for(const [p,t,c] of annotations)svg+=label(p,t,c,13,'middle',true,true);
  vertices.forEach((p,i)=>{const [x,y]=project(p);svg+=`<g data-vertex="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="12" fill="transparent"/><circle cx="${x}" cy="${y}" r="4.5" fill="white" stroke="#087f78" stroke-width="2"/>${label([x+9,y-10],`V${i+1}`,'#183441',12,'start',true)}</g>`;});
  if(selected){const s=mu(selected),p=project(s);for(const [i,e]of axes.entries()){const end={...s,[e]:corner[e]};svg+=maskLineArtwork(`guide-${i}`,line(s,end,'#bb7b4d',1,'3 4'),s,end,surfaces,projection,camera.opacity??.75);}svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#c25b26" stroke="white" stroke-width="2" pointer-events="none"/>`;}
  svg+='<g data-export-omit="true">';svg+=label([430,491],`${camera.showHost?'Pale plane: host equality + elemental limits   ·   ':''}Teal: allowed region`,'#5f7480',13);svg+='</g>';
  if(!vertices.length)svg+=label([430,245],'No feasible stability region','#a45a27',21);
  if(projection.edgeOn)svg+='<g data-export-omit="true">'+label([430,465],'Edge-on view — rotate to select an interior point','#a45a27',13)+'</g>';
  if(camera.frontAxes)svg+=renderFrontAxes(projection);
  return {svg:svg+'</svg>',projection};
}
