import test from 'node:test';
import assert from 'node:assert/strict';
import {solve,examples,parseFormula} from './dist/engine.mjs';
import {buildPhaseFaces,automaticBounds,validateBounds,pickFace} from './dist/faces3d.mjs';
import {render3D,makeProjection,defaultCamera} from './dist/plot3d.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const same=(a,b,e)=>e.every(k=>Math.abs(a[k]-b[k])<1e-7);
const permutations=a=>a.length===1?[a]:a.flatMap((e,i)=>permutations(a.filter((_,j)=>j!==i)).map(t=>[e,...t]));
function verify(space,r){
  for(const face of space.faces)for(const p of face.vertices){
    for(const row of [{counts:r.composition,enthalpy:r.h},...r.constraints]){
      const d=r.elements.reduce((s,e)=>s+(row.counts[e]||0)*p[e],0)-row.enthalpy;
      assert.ok(d<1e-7,`${face.labels}: violates ${row.label}: ${d}`);
    }
    for(const row of face.rows)near(r.elements.reduce((s,e)=>s+(row.counts[e]||0)*p[e],0),row.enthalpy);
    assert.ok(space.within(p));
  }
}
test('all example host facets equal the independent 2D vertices in every axis order',()=>{
  for(const m of Object.values(examples))for(const axes of permutations(Object.keys(solve(m).composition))){
    const r=solve({...m,axes}),space=buildPhaseFaces(r),host=space.faces.find(f=>f.kind==='host');verify(space,r);
    assert.equal(host.vertices.length,r.vertices.length);assert.equal(space.hostClipped,false);
    for(const v of r.vertices)assert.ok(host.vertices.some(p=>same(p,r.chemicalPotentials(v),r.elements)));
  }
});
test('paper input produces ZnO, both antimony oxides, Sb and host faces; changed input updates them',()=>{
  const m=structuredClone(examples.ZnSb2O4_HSE_prose),r=solve(m),space=buildPhaseFaces(r);
  assert.deepEqual(space.faces.map(f=>f.labels[0]).sort(),['Host','Sb elemental limit','Sb2O3','Sb2O5','ZnO']);
  const rich=Math.max(...space.faces.find(f=>f.kind==='host').vertices.map(v=>v.O));near(rich,-1.6);
  m.phases[0].energy=-3.45;const updated=buildPhaseFaces(solve(m));
  near(Math.max(...updated.faces.find(f=>f.kind==='host').vertices.map(v=>v.O)),-1.65);
  for(const v of updated.faces.find(f=>f.labels[0]==='ZnO').vertices)near(v.Zn+v.O,-3.45);
  m.phases[2].enabled=false;assert.ok(!buildPhaseFaces(solve(m)).faces.some(f=>f.labels.includes('Sb2O5')));
});
test('display clipping changes visible facets without changing target stability',()=>{
  const r=solve(examples.ZnSb2O4_HSE_prose),original=structuredClone(r.vertices),bounds=automaticBounds(r);
  bounds.Sb=[-.7,-.2];const space=buildPhaseFaces(r,{bounds});verify(space,r);
  assert.ok(space.hostClipped);assert.deepEqual(r.vertices,original);
  assert.ok(space.faces.find(f=>f.kind==='host').vertices.every(v=>v.Sb>=-.7-1e-7&&v.Sb<=-.2+1e-7));
  const outside=buildPhaseFaces(r,{bounds:{Zn:[-10,-9],Sb:[-10,-9],O:[-10,-9]}});assert.equal(outside.faces.length,0);
  assert.throws(()=>validateBounds(r,{...bounds,Sb:[0,-1]}),/minimum/);
  assert.throws(()=>validateBounds(r,{...bounds,Sb:[-1,.1]}),/maximum/);
});
test('duplicate and proportional planes coalesce; unstable hosts have no spurious host facet',()=>{
  const m=structuredClone(examples.ZnSb2O4_HSE_prose);m.phases.push({formula:'Zn2O2',energy:-6.7});
  let space=buildPhaseFaces(solve(m));assert.equal(space.faces.length,5);assert.ok(space.faces.some(f=>f.labels.includes('ZnO')&&f.labels.includes('Zn2O2')));
  m.phases.push({formula:'ZnSb2O4',energy:-11});space=buildPhaseFaces(solve(m));
  assert.ok(!space.faces.some(f=>f.kind==='host'));verify(space,solve(m));
});
test('face picking returns actual three-dimensional potentials and the nearest surface',()=>{
  const r=solve(examples.ZnSb2O4_HSE_prose),space=buildPhaseFaces(r),p=makeProjection(r,defaultCamera,space);
  for(const face of space.faces){const mu=Object.fromEntries(r.elements.map(e=>[e,face.vertices.reduce((s,v)=>s+v[e]/face.vertices.length,0)]));const hit=pickFace(space,p,p.project(mu));assert.equal(hit.face,face);assert.ok(same(hit.mu,mu,r.elements));}
  for(const azimuth of [-135,-40,45,100,180])for(const elevation of [-60,0,30,80]){
    const p=makeProjection(r,{...defaultCamera,azimuth,elevation},space);
    for(const face of space.faces){const mu=Object.fromEntries(r.elements.map(e=>[e,face.vertices.reduce((s,v)=>s+v[e]/face.vertices.length,0)]));const hit=pickFace(space,p,p.project(mu));
      if(hit){assert.ok(hit.depth>=p.depth(mu)-1e-7);const screen=p.project(hit.mu),expected=p.project(mu);near(screen[0],expected[0]);near(screen[1],expected[1]);}
    }
  }
});
test('formation, per-atom, and total-cell inputs yield the same phase faces',()=>{
  const m=structuredClone(examples.SrTiO3),base=buildPhaseFaces(solve(m));
  const refs={Sr:-2,Ti:-8,O:-5};m.mode='total';m.refs=refs;
  for(const row of [m.target,...m.phases]){const counts=parseFormula(row.formula);row.energy=2*(row.energy+Object.entries(counts).reduce((s,[e,n])=>s+n*refs[e],0));row.basis='cell';row.units=2;}
  const perAtom=structuredClone(examples.SrTiO3);
  for(const row of [perAtom.target,...perAtom.phases]){row.energy/=Object.values(parseFormula(row.formula)).reduce((s,n)=>s+n,0);row.basis='atom';}
  for(const model of [m,perAtom]){const r=solve(model),space=buildPhaseFaces(r);verify(space,r);assert.equal(space.faces.length,base.faces.length);
    for(const face of space.faces){const original=base.faces.find(f=>f.labels[0]===face.labels[0]);assert.equal(original.vertices.length,face.vertices.length);for(const p of face.vertices)assert.ok(original.vertices.some(v=>same(v,p,r.elements)));}
  }
});
