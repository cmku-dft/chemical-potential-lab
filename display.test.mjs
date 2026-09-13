import test from 'node:test';
import assert from 'node:assert/strict';
import {layout2D,ticks,tickStep,tickLabel,formulaHTML,formulaSVG} from './dist/display.mjs';
import {solve,parseFormula,examples} from './dist/engine.mjs';
import {render3D,defaultCamera} from './dist/plot3d.mjs';
test('regular shared ticks use zero-anchored multiples and suppress negative zero',()=>{
  assert.deepEqual(ticks([-1.6,.01],.5),[-1.5,-1,-.5,0]);
  assert.equal(tickLabel(-1e-12,.5),'0.00');assert.equal(tickLabel(-.5,.5),'-0.50');
  for(const span of [.003,.1,1,5,16,100]){const step=tickStep([[-span,0],[-span/2,0]]);assert.ok(step>0);for(const v of ticks([-span,0],step))assert.ok(Math.abs(v/step-Math.round(v/step))<1e-7);}
});
test('equal-scale 2D mapping preserves physical lengths and contains the data',()=>{
  for(const m of Object.values(examples)){
    const r=solve(m),raw=[0,1].map(i=>[Math.min(...r.vertices.map(p=>p[i])),Math.max(...r.vertices.map(p=>p[i]))]);
    const {ranges}=layout2D(raw,747,390,{tickInterval:.5,equalScale:true});
    assert.ok(Math.abs(747/(ranges[0][1]-ranges[0][0])-390/(ranges[1][1]-ranges[1][0]))<1e-8);
    raw.forEach((a,i)=>{assert.ok(ranges[i][0]<=a[0]+1e-8);assert.ok(ranges[i][1]>=a[1]-1e-8);});
  }
});
test('formatted and fractional formulas parse generally, including non-oxide ternaries',()=>{
  assert.deepEqual(parseFormula('Ba₃(VO₄)₂'),{Ba:3,V:2,O:8});
  assert.equal(formulaHTML('Ba3(VO4)2'),'Ba<sub>3</sub>(VO<sub>4</sub>)<sub>2</sub>');
  assert.ok(formulaSVG('Cu0.5InSe2').includes('>0.5</tspan>'));assert.ok(formulaHTML("'2<").startsWith('&#39;<sub>2</sub>&lt;'));
  const r=solve({mode:'formation',target:{formula:'CuInSe₂',energy:-3},phases:[]});assert.equal(r.vertices.length,3);
});
test('3D exports use regular ticks, chemical subscripts, and opacity without changing vertices',()=>{
  const r=solve(examples.ZnSb2O4_HSE_prose),before=JSON.stringify(r.vertices);
  for(const showFaces of [false,true])for(const opacity of [0,.35,1]){
    const out=render3D(r,{formula:'ZnSb2O4',camera:{...defaultCamera,showFaces,opacity,tickInterval:.5}});
    assert.equal(out.projection.interval,.5);assert.ok(out.svg.includes(`fill-opacity="${opacity}"`));
    assert.ok(out.svg.includes('baseline-shift="sub"'));assert.ok(!/NaN|undefined|Infinity/.test(out.svg));
  }
  assert.equal(JSON.stringify(r.vertices),before);
});
