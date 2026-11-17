import {escapeText,formulaSVG,potentialSVG,layout2D,tickStep,roundRange,ticks,tickLabel} from './display.mjs';
export function renderBinary(r,{view='1d',camera={},selected=null,own=false,formula=''}={}){
  const interval=view==='1d',W=860,H=interval?320:490,L=90,R=50,T=45,B=75;
  const raw=r.vertices.length?[r.vertices[0][0],r.vertices.at(-1)[0]]:[Math.min(-1,r.h/r.composition[r.x]),0];
  let xr,yr,step;
  if(interval){const pad=Math.max(.5,raw[1]-raw[0])*.16;xr=[raw[0]-pad,Math.min(0,raw[1]+pad)];step=tickStep([xr],camera.tickInterval);xr=roundRange(xr,step);}
  else{const ys=r.vertices.map(p=>p[1]);const layout=layout2D([raw,ys.length?[Math.min(...ys),Math.max(...ys)]:[Math.min(-1,r.h/r.composition[r.y]),0]],W-L-R,H-T-B,camera);[xr,yr]=layout.ranges;step=layout.step;}
  const sx=x=>L+(x-xr[0])/(xr[1]-xr[0])*(W-L-R),sy=y=>interval?150:H-B-(y-yr[0])/(yr[1]-yr[0])*(H-T-B);
  const project=p=>[sx(p[0]),sy(p[1])];
  const text=(x,y,s,kind='',anchor='middle')=>`<text ${kind?`data-plot-label="${kind}"`:''} x="${x}" y="${y}" text-anchor="${anchor}" font-family="system-ui" font-size="15" fill="#264655" stroke="white" stroke-width="3" paint-order="stroke">${s}</text>`;
  let svg=`<svg id="diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeText(formula)} binary chemical-potential ${interval?'interval':'stability line'}"><title>${escapeText(formula)} binary stability</title><desc>The host has one independent chemical potential. The highlighted interval or line contains the allowed host conditions.</desc><rect width="${W}" height="${H}" fill="white"/>`;
  for(const value of ticks(xr,step)){const x=sx(value);svg+=`<path d="M${x} ${interval?142:T}V${interval?158:H-B}" fill="none" stroke="#d6e1e6"/>`+text(x,interval?190:H-B+25,tickLabel(value,step));}
  if(!interval)for(const value of ticks(yr,step)){const y=sy(value);svg+=`<path d="M${L} ${y}H${W-R}" fill="none" stroke="#e7eef2"/>`+text(L-12,y+5,tickLabel(value,step),'','end');}
  svg+=`<path d="${interval?`M${L} 150H${W-R}`:`M${L} ${T}V${H-B}H${W-R}`}" fill="none" stroke="#9bb0bb"/>`;
  if(!interval){
    svg+=`<defs><clipPath id="binary-clip"><rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}"/></clipPath></defs><g clip-path="url(#binary-clip)">`;
    for(const q of r.constraints){let p0,p1;if(q.B){p0=[xr[0],(q.C-q.A*xr[0])/q.B];p1=[xr[1],(q.C-q.A*xr[1])/q.B];}else{p0=[q.C/q.A,yr[0]];p1=[q.C/q.A,yr[1]];}
      svg+=`<line x1="${sx(p0[0])}" y1="${sy(p0[1])}" x2="${sx(p1[0])}" y2="${sy(p1[1])}" stroke="#8ba2b1" stroke-dasharray="5 5"/>`;
    }svg+='</g>';
  }
  if(r.vertices.length===2){const [a,b]=r.vertices.map(project);svg+=`<line data-host-line="true" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#087f78" stroke-width="${interval?8:4}" stroke-linecap="round"/>`;}
  r.vertices.forEach((p,i)=>{const [x,y]=project(p),anchor=i===0?'start':'end';
    svg+=`<g data-vertex="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="13" fill="transparent"/><circle cx="${x}" cy="${y}" r="5" fill="white" stroke="#087f78" stroke-width="2"/>${text(x+(i===0?9:-9),y-12,`V${i+1}`,'vertex',anchor)}</g>`;
    svg+=text(Math.max(L,Math.min(W-R,x)),interval?100:Math.max(T+18,Math.min(H-B-12,y+32)),r.active(p).map(q=>formulaSVG(q.label.replace(' elemental limit',' (element)'))).join(' · '),'phase',anchor);
  });
  if(selected&&camera.showSelectedPoint!==false){const [x,y]=project(selected);svg+=`<circle data-selected-point="true" cx="${x}" cy="${y}" r="6" fill="#c25b26" stroke="white" stroke-width="2"/>`;}
  svg+=text((L+W-R)/2,H-22,potentialSVG(`Δμ${r.x}`)+' (eV / atom)','axis');
  if(!interval)svg+=`<g transform="translate(22 ${(T+H-B)/2}) rotate(-90)">${text(0,0,potentialSVG(`Δμ${r.y}`)+' (eV / atom)','axis')}</g>`;
  if(!r.vertices.length)svg+=text(W/2,H/2,'No stable host interval');
  svg+=`</svg>`;
  const unproject=([x,y])=>{
    if(interval||r.vertices.length!==2)return r.pointAt(xr[0]+(x-L)/(W-L-R)*(xr[1]-xr[0]));
    const [a,b]=r.vertices.map(project),dx=b[0]-a[0],dy=b[1]-a[1],t=((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy);
    return r.pointAt(r.vertices[0][0]+t*(r.vertices[1][0]-r.vertices[0][0]));
  };
  return {svg,step,project,unproject,bounds:{L,R,T,B,W,H}};
}
