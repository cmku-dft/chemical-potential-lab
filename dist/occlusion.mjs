// Clip each face to the part nearer than a projected 3D line. Depth varies
// affinely along the line; extending it across the screen also masks its ticks.
export function lineOccluders(a,b,faces,p){
  const start=p.project(a),end=p.project(b),dx=end[0]-start[0],dy=end[1]-start[1],length2=dx*dx+dy*dy;
  const da=p.depth(a),db=p.depth(b),tol=1e-8*Math.max(1,Math.abs(da),Math.abs(db));
  const distance=v=>{const q=p.project(v),t=length2>1e-12?((q[0]-start[0])*dx+(q[1]-start[1])*dy)/length2:0;
    return p.depth(v)-(length2>1e-12?da+t*(db-da):Math.max(da,db))-tol;};
  const polygons=[];
  for(const face of faces){const out=[];
    for(let i=0;i<face.vertices.length;i++){
      const u=face.vertices[i],v=face.vertices[(i+1)%face.vertices.length],du=distance(u),dv=distance(v);
      if(du>=0)out.push(u);
      if((du<0&&dv>0)||(du>0&&dv<0)){const t=du/(du-dv);out.push(Object.fromEntries(p.axes.map(e=>[e,u[e]+t*(v[e]-u[e])])));}
    }
    if(out.length>=3)polygons.push(out.map(p.project));
  }
  return polygons;
}
export function maskLineArtwork(id,art,a,b,faces,p,opacity){
  if(opacity<=0||!faces.length)return art;
  const polygons=lineOccluders(a,b,faces,p);
  if(!polygons.length)return art;
  const mask=`<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="860" height="510" style="mask-type:luminance"><rect width="860" height="510" fill="white"/>${polygons.map(pts=>`<polygon points="${pts.map(v=>v.join(',')).join(' ')}" fill="black" fill-opacity="${opacity}"/>`).join('')}</mask>`;
  return `<defs>${mask}</defs><g data-depth-masked="true" mask="url(#${id})">${art}</g>`;
}
