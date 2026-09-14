import test from 'node:test';
import assert from 'node:assert/strict';
import {solve,binaryExamples,parseFormula} from './dist/engine.mjs';
import {renderBinary} from './dist/binary-plot.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const model=(formula='ZnO',energy=-3.5,phases=[])=>({mode:'formation',refs:{},target:{formula,energy,basis:'formula'},phases});
function verify(r){for(const p of r.vertices){assert.ok(r.feasible(p));const mu=r.chemicalPotentials(p);near(Object.entries(r.composition).reduce((s,[e,n])=>s+n*mu[e],0),r.h);assert.equal(Object.keys(mu).length,2);for(const q of r.constraints)assert.ok(Object.entries(q.counts).reduce((s,[e,n])=>s+n*mu[e],0)<=q.enthalpy+1e-7);assert.ok(r.active(p).length);}}
test('ZnO, ZnF2 and In2O3 elemental limits use the correct stoichiometric factors',()=>{
 for(const [formula,energy,expected] of [['ZnO',-3.5,[[-3.5,0],[0,-3.5]]],['ZnF2',-7,[[-7,0],[0,-3.5]]],['In2O3',-9,[[-4.5,0],[0,-3]]]]){
  const r=solve(model(formula,energy));assert.equal(r.system,'binary');assert.equal(r.dimension,1);assert.equal(r.expectedDimension,1);assert.equal(r.z,null);assert.equal(r.dependent,r.y);r.vertices.forEach((p,i)=>p.forEach((v,j)=>near(v,expected[i][j])));verify(r);
 }
});
test('competing phases truncate the binary interval at analytic bounds',()=>{
 const r=solve(model('ZnO',-3.5,[{formula:'ZnO2',energy:-5},{formula:'Zn2O',energy:-4.5}]));
 near(r.interval[0],-2);near(r.interval[1],-1);assert.deepEqual(r.vertices.map(p=>r.active(p).map(q=>q.label)),[['ZnO2'],['Zn2O']]);verify(r);
 assert.ok(!r.feasible([-1.5,-1.5]));assert.ok(r.feasible(r.pointAt(-1.5)));assert.ok(!r.feasible(r.pointAt(0)));
});
test('swapping binary axes or eliminated elements preserves physical endpoints',()=>{
 const m=model('In2O3',-9,[{formula:'InO',energy:-3.5}]),a=solve(m);
 for(const opts of [{axes:['O','In']},{eliminated:'In'}]){const b=solve({...m,...opts});verify(b);for(const p of a.vertices){const mu=a.chemicalPotentials(p);assert.ok(b.vertices.some(q=>b.elements.every(e=>Math.abs(b.chemicalPotentials(q)[e]-mu[e])<1e-7)));}}
});
test('binary atom and cell total energies normalize identically to formation energies',()=>{
 const m=model('In2O3',-9,[{formula:'InO',energy:-3.5}]),base=solve(m);
 for(const mode of ['formation','total'])for(const basis of ['atom','cell']){
  const n=structuredClone(m);n.mode=mode;n.refs={In:-2,O:-4};
  for(const row of [n.target,...n.phases]){const c=parseFormula(row.formula),total=Object.values(c).reduce((a,b)=>a+b,0);if(mode==='total')row.energy+=Object.entries(c).reduce((s,[e,v])=>s+v*n.refs[e],0);row.basis=basis;row.units=4;row.energy*=basis==='atom'?1/total:4;}
  const r=solve(n);r.vertices.forEach((p,i)=>p.forEach((v,j)=>near(v,base.vertices[i][j])));verify(r);
 }
});
test('polymorph exclusion, proportional formulas, redundant and disabled phases',()=>{
 const m=model();m.phases=[{formula:'Zn2O2',energy:-7.2}];assert.equal(solve(m).dimension,-1);
 m.phases=[{formula:'Zn2O2',energy:-7},{formula:'ZnO',energy:-3.4},{enabled:false,formula:'bad',energy:''}];assert.equal(solve(m).dimension,1);verify(solve(m));
 m.phases[0].energy=-6.9;assert.equal(solve(m).vertices.length,2);
});
test('binary marginal points and empty intervals are classified correctly',()=>{
 assert.equal(solve(model('ZnO',0)).dimension,0);assert.equal(solve(model('ZnO',1)).dimension,-1);
 const phases=[{formula:'ZnO2',energy:-5},{formula:'Zn2O',energy:-5.5}];const r=solve(model('ZnO',-3.5,phases));assert.equal(r.dimension,0);near(r.vertices[0][0],-2);verify(r);
 phases[1].energy=-6;assert.equal(solve(model('ZnO',-3.5,phases)).dimension,-1);
});
test('binary validation rejects extra elements, duplicate axes and incomplete references',()=>{
 assert.throws(()=>solve({...model(),axes:['Zn','Zn']}),/X and Y/);assert.throws(()=>solve({...model(),axes:['Zn','O','F']}));assert.throws(()=>solve({...model(),eliminated:'F'}));
 assert.throws(()=>solve(model('ZnO',-3.5,[{formula:'ZnF2',energy:-7}])) ,/outside/);
 assert.throws(()=>solve({...model(),mode:'total'}),/reference/);
 assert.throws(()=>solve(model('Zn',-1)),/two or three/);assert.throws(()=>solve(model('ZnInOF',-1)),/two or three/);
});
test('fractional coefficients and formula scaling preserve binary stability',()=>{
 const a=solve(model('In2O3',-9)),b=solve(model('In0.2O0.3',-.9));b.vertices.forEach((p,i)=>p.forEach((v,j)=>near(v,a.vertices[i][j])));verify(b);
});
test('binary plots support stable, point and empty states with safe picking and no third axis',()=>{
 for(const m of [...Object.values(binaryExamples),model('ZnO',0),model('ZnO',1)])for(const view of ['1d','2d']){
  const r=solve(m),plot=renderBinary(r,{view,formula:m.target.formula,selected:r.vertices[0]});assert.doesNotMatch(plot.svg,/NaN|Infinity|undefined/);assert.doesNotMatch(plot.svg,/Z ·|Δμnull/);assert.match(plot.svg,/baseline-shift="sub"/);
  if(r.vertices.length===2){for(const point of [...r.vertices,r.pointAt((r.interval[0]+r.interval[1])/2)]){const picked=plot.unproject(plot.project(point));near(picked[0],point[0]);near(picked[1],point[1]);assert.ok(r.feasible(picked));}const {L,R,W}=plot.bounds,p=plot.unproject([(L+W-R)/2,150]);assert.ok(p.every(Number.isFinite));near(r.composition[r.x]*p[0]+r.composition[r.y]*p[1],r.h);}
  const hidden=renderBinary(r,{view,formula:m.target.formula,selected:r.vertices[0],camera:{showSelectedPoint:false}});assert.doesNotMatch(hidden.svg,/data-selected-point/);
 }
});
test('seeded binary systems satisfy all original inequalities and preserve swapped solutions',()=>{
 let seed=91;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
 for(let k=0;k<60;k++){const a=1+Math.floor(rand()*5),b=1+Math.floor(rand()*5),mu=[-1-rand()*3,-1-rand()*3],m=model(`Zn${a}O${b}`,a*mu[0]+b*mu[1]);m.phases=Array.from({length:8},()=>{const p=1+Math.floor(rand()*4),q=1+Math.floor(rand()*4);return {formula:`Zn${p}O${q}`,energy:p*mu[0]+q*mu[1]+.1+rand()};});const r=solve(m);assert.equal(r.dimension,1);assert.ok(r.feasible(mu));verify(r);const swapped=solve({...m,axes:['O','Zn']});for(const p of r.vertices)assert.ok(swapped.feasible([p[1],p[0]]));}
});
