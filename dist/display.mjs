export const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalizeFormula=s=>String(s).replace(/[₀₁₂₃₄₅₆₇₈₉]/g,c=>String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)));
// Apply only to chemical labels, never axis values, vertex IDs, or energies.
const format=(s,wrap)=>normalizeFormula(s).split(/(\d+(?:\.\d+)?|\.\d+)/g).map((part,i)=>i%2?wrap(part):escapeText(part)).join('');
export const formulaHTML=s=>format(s,n=>`<sub>${n}</sub>`);
export const formulaSVG=s=>format(s,n=>`<tspan baseline-shift="sub" font-size="75%">${n}</tspan>`);
export const formulaText=s=>normalizeFormula(s).replace(/\d/g,c=>'₀₁₂₃₄₅₆₇₈₉'[Number(c)]);
// Format the element attached to μ without subscripting stoichiometric
// coefficients, numerical values, or the entire chemical-potential symbol.
const potential=(s,wrap)=>String(s).split(/(μ[A-Z][a-z]?)/g).map((part,i)=>i%2?'μ'+wrap(part.slice(1)):escapeText(part)).join('');
export const potentialHTML=s=>potential(s,e=>`<sub>${e}</sub>`);
export const potentialSVG=s=>potential(s,e=>`<tspan baseline-shift="sub" font-size="75%">${e}</tspan>`);
export const potentialText=s=>String(s).replace(/μ([A-Z][a-z]?)/g,'μ_$1');
export function niceStep(raw){
  if(!(raw>0)||!Number.isFinite(raw))return .5;
  const power=10**Math.floor(Math.log10(raw)),fraction=raw/power;
  return [1,2,2.5,5,10].find(v=>v>=fraction-1e-10)*power;
}
export function tickStep(ranges,requested=0){
  const span=Math.max(...ranges.map(([lo,hi])=>hi-lo),1e-6);
  // Bound excessively dense manual ticks with the same interval on all axes.
  return requested>0&&Number.isFinite(requested)?Math.max(requested,niceStep(span/24)):niceStep(span/5);
}
export function ticks([lo,hi],step){
  const start=Math.ceil(lo/step-1e-9),end=Math.floor(hi/step+1e-9);
  return Array.from({length:Math.max(0,Math.min(100,end-start+1))},(_,i)=>Number(((start+i)*step).toPrecision(12)));
}
export const roundRange=([lo,hi],step)=>[Math.floor(lo/step+1e-9)*step,Math.ceil(hi/step-1e-9)*step];
export function tickLabel(value,step,decimals=-1){const digits=Number.isInteger(decimals)&&decimals>=0&&decimals<=3?decimals:Math.min(10,Math.max(2,Math.ceil(-Math.log10(step))+1));const label=value.toFixed(digits);return Number(label)===0?(0).toFixed(digits):label;}
export function layout2D(raw,width,height,{tickInterval=0,equalScale=true}={}){
  let ranges=raw.map(([lo,hi])=>{const pad=Math.max(.5,hi-lo)*.16;return [lo-pad,Math.min(0,hi+pad)];});
  let step=tickStep(ranges,tickInterval);ranges=ranges.map(a=>roundRange(a,step));
  if(equalScale){const unit=Math.max((ranges[0][1]-ranges[0][0])/width,(ranges[1][1]-ranges[1][0])/height);
    ranges=ranges.map(([lo,hi],i)=>{const span=unit*[width,height][i],top=Math.min(0,(lo+hi+span)/2);return [top-span,top];});}
  step=tickStep(ranges,tickInterval);
  return {ranges,step};
}
