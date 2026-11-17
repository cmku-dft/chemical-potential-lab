import {ticks,tickLabel,potentialSVG} from './display.mjs';

// Select a silhouette edge for each axis, preferring the nearest visible edge.
// This only changes annotation placement, never the physical projection.
export function frontEdges(p){
  const {axes,ranges,project}=p;
  const corners=Array.from({length:8},(_,mask)=>Object.fromEntries(axes.map((e,i)=>[e,ranges[i][(mask>>i)&1]])));
  const center=project(Object.fromEntries(axes.map((e,i)=>[e,(ranges[i][0]+ranges[i][1])/2])));
  return axes.map((e,i)=>{
    const others=[0,1,2].filter(j=>j!==i);
    const candidates=Array.from({length:4},(_,mask)=>{
      const a=Object.fromEntries(axes.map((f,j)=>[f,ranges[j][0]]));
      others.forEach((j,k)=>a[axes[j]]=ranges[j][(mask>>k)&1]);
      const b={...a,[e]:ranges[i][1]},u=project(a),v=project(b),dx=v[0]-u[0],dy=v[1]-u[1],length=Math.hypot(dx,dy);
      const sides=corners.map(c=>{const q=project(c);return dx*(q[1]-u[1])-dy*(q[0]-u[0]);});
      const silhouette=sides.every(s=>s>=-1e-6)||sides.every(s=>s<=1e-6);
      const mid=[(u[0]+v[0])/2,(u[1]+v[1])/2];
      let normal=[-dy/(length||1),dx/(length||1)];
      if(normal[0]*(mid[0]-center[0])+normal[1]*(mid[1]-center[1])<0)normal=normal.map(x=>-x);
      return {e,i,a,b,u,v,mid,normal,length,silhouette,depth:(p.depth(a)+p.depth(b))/2};
    });
    return candidates.filter(q=>q.length>1e-6).sort((a,b)=>Number(b.silhouette)-Number(a.silhouette)||b.depth-a.depth)[0];
  }).filter(Boolean);
}

export function renderFrontAxes(p){
  let svg='<g data-front-axes="true" fill="#243746" stroke="#243746" font-family="system-ui">';
  for(const q of frontEdges(p)){
    const {e,i,a,u,v,normal:n,mid}=q;
    svg+=`<line x1="${u[0]}" y1="${u[1]}" x2="${v[0]}" y2="${v[1]}" stroke-width="1.2"/>`;
    for(const t of ticks(p.ranges[i],p.interval)){
      const s=p.project({...a,[e]:t});
      svg+=`<line data-axis-tick="${i}" x1="${s[0]}" y1="${s[1]}" x2="${s[0]+5*n[0]}" y2="${s[1]+5*n[1]}" stroke-width="1"/>`;
      const anchor=n[0]<-.3?'end':n[0]>.3?'start':'middle';
      svg+=`<text x="${s[0]+10*n[0]}" y="${s[1]+10*n[1]}" dominant-baseline="middle" text-anchor="${anchor}" font-size="11" stroke="white" stroke-width="2" paint-order="stroke">${tickLabel(t,p.interval)}</text>`;
    }
    svg+=`<text data-plot-label="axis" x="${mid[0]+52*n[0]}" y="${mid[1]+52*n[1]}" dominant-baseline="middle" text-anchor="middle" font-size="13" stroke="white" stroke-width="3" paint-order="stroke">${potentialSVG(`Δμ${e}`)} (eV / atom)</text>`;
  }
  return svg+'</g>';
}
