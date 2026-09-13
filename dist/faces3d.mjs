// Physical facets of intersection {n_i · Δμ <= H_i}, including the host.
// Display bounds truncate unbounded faces only; they never enter the host solver.
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);

export function automaticBounds(r){
  const points=r.vertices.map(r.chemicalPotentials);
  const span=Math.max(.5,...r.elements.map(e=>points.length?Math.max(...points.map(p=>p[e]))-Math.min(...points.map(p=>p[e])):0));
  const pad=Math.max(.6,span*.45);
  return Object.fromEntries(r.elements.map(e=>[e,points.length
    ? [Math.min(...points.map(p=>p[e]))-pad,Math.min(0,Math.max(...points.map(p=>p[e]))+pad)]
    : [Math.min(-1,r.h/r.composition[e]*1.2),0]]));
}

export function validateBounds(r,value){
  if(!value||typeof value!=='object')throw Error('Enter a minimum and maximum for each element.');
  return Object.fromEntries(r.elements.map(e=>{
    const row=value[e];
    if(!Array.isArray(row)||row.length!==2||!row.every(v=>typeof v==='number'&&Number.isFinite(v)))throw Error(`Δμ${e}: enter finite display limits.`);
    if(row[0]>=row[1]||row[1]-row[0]<1e-6)throw Error(`Δμ${e}: minimum must be below maximum by at least 0.000001 eV.`);
    if(row[1]>0)throw Error(`Δμ${e}: maximum must be ≤ 0 (the elemental reference).`);
    return [e,[...row]];
  }));
}

function clean(points,tol){
  return points.filter((p,i)=>!points.slice(0,i).some(q=>norm(sub(p,q))<tol));
}
function order(points,n){
  if(points.length<3)return points;
  const center=points[0].map((_,i)=>points.reduce((s,p)=>s+p[i]/points.length,0));
  const v=sub(points[0],center),u=v.map(x=>x/norm(v)),w=cross(n,u);
  return [...points].sort((a,b)=>Math.atan2(dot(sub(a,center),w),dot(sub(a,center),u))-Math.atan2(dot(sub(b,center),w),dot(sub(b,center),u)));
}
function clip(points,plane,tol){
  if(!points.length)return [];
  const out=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    let da=dot(plane.normal,a)-plane.offset,db=dot(plane.normal,b)-plane.offset;
    if(Math.abs(da)<tol)da=0;if(Math.abs(db)<tol)db=0;
    if(da<=0)out.push(a);
    if((da<0&&db>0)||(da>0&&db<0)){const t=da/(da-db);out.push(a.map((v,j)=>v+t*(b[j]-v)));}
  }
  return clean(out,tol);
}

export function buildPhaseFaces(r,{bounds=automaticBounds(r),formula='Host'}={}){
  bounds=validateBounds(r,bounds);
  // Work in element order so changing plot axes cannot change any physical face.
  const elements=r.elements,limits=elements.map(e=>bounds[e]);
  const scale=Math.max(1,...limits.flat().map(Math.abs),Math.abs(r.h)/Math.hypot(...Object.values(r.composition)));
  const tol=1e-9*scale;
  const rows=[{kind:'host',label:formula,counts:r.composition,enthalpy:r.h},...r.constraints];
  const planes=[];
  for(const row of rows){
    const a=elements.map(e=>row.counts[e]||0),length=norm(a),normal=a.map(v=>v/length),offset=row.enthalpy/length;
    const same=planes.find(p=>norm(sub(p.normal,normal))<1e-11&&Math.abs(p.offset-offset)<tol);
    if(same){same.labels.push(row.label);same.rows.push(row);continue;}
    planes.push({normal,offset,kind:row.kind,labels:[row.label],rows:[row]});
  }
  const edges=[];
  for(let i=0;i<3;i++)for(let mask=0;mask<4;mask++){
    const a=limits.map(x=>x[0]),others=[0,1,2].filter(j=>j!==i);
    others.forEach((j,k)=>a[j]=limits[j][(mask>>k)&1]);
    const b=[...a];b[i]=limits[i][1];edges.push([a,b]);
  }
  const faces=[];
  planes.forEach((plane,index)=>{
    let points=[];
    for(const [a,b]of edges){const da=dot(plane.normal,a)-plane.offset,db=dot(plane.normal,b)-plane.offset;
      if(Math.abs(da)<tol)points.push(a);if(Math.abs(db)<tol)points.push(b);
      if(da*db<0){const t=da/(da-db);points.push(a.map((v,j)=>v+t*(b[j]-v)));}
    }
    points=order(clean(points,tol),plane.normal);
    for(const other of planes){if(other===plane)continue;points=clip(points,other,tol);if(points.length<3)break;}
    if(points.length<3)return;
    let area=0;for(let i=1;i<points.length-1;i++)area+=norm(cross(sub(points[i],points[0]),sub(points[i+1],points[0])))/2;
    if(area<tol*tol*10)return;
    faces.push({...plane,id:index,area,vertices:points.map(p=>Object.fromEntries(elements.map((e,i)=>[e,p[i]]))),
      clipped:points.some(p=>p.some((v,i)=>Math.abs(v-limits[i][0])<tol*4||(limits[i][1]<0&&Math.abs(v-limits[i][1])<tol*4)))});
  });
  const within=mu=>elements.every(e=>mu[e]>=bounds[e][0]-tol&&mu[e]<=bounds[e][1]+tol);
  return {faces,bounds,elements,tolerance:tol,within,hostClipped:r.vertices.some(p=>!within(r.chemicalPotentials(p))),
    missing:rows.filter(row=>!faces.some(f=>f.rows.includes(row)))};
}

// Solve the clicked screen coordinate on a particular face, then check its edges.
export function pickFace(space,projection,screen){
  let picked=null;
  for(const face of space.faces){
    const vertices=face.vertices,base=projection.project(vertices[0]);
    // Search for a well-conditioned screen triangle (edge-on faces are skipped).
    for(let i=1;i<vertices.length-1;i++){
      const a=projection.project(vertices[i]),b=projection.project(vertices[i+1]);
      const u=sub(a,base),v=sub(b,base),d=sub(screen,base),det=u[0]*v[1]-u[1]*v[0];
      if(Math.abs(det)<1e-9*Math.max(1,norm(u)*norm(v)))continue;
      const s=(d[0]*v[1]-d[1]*v[0])/det,t=(u[0]*d[1]-u[1]*d[0])/det;
      if(s< -1e-8||t< -1e-8||s+t>1+1e-8)continue;
      const mu=Object.fromEntries(space.elements.map(e=>[e,vertices[0][e]+s*(vertices[i][e]-vertices[0][e])+t*(vertices[i+1][e]-vertices[0][e])]));
      const depth=projection.depth(mu);
      if(!picked||depth>picked.depth+space.tolerance||(Math.abs(depth-picked.depth)<=space.tolerance&&face.kind==='host'))picked={face,mu,depth};
      break;
    }
  }
  return picked;
}
