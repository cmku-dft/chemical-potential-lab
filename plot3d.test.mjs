import test from 'node:test';
import assert from 'node:assert/strict';
import {solve,examples} from './dist/engine.mjs';
import {makeProjection,render3D,defaultCamera} from './dist/plot3d.mjs';
import {frontEdges} from './dist/front-axes.mjs';
import {ticks,tickLabel} from './dist/display.mjs';
test('tick labels support explicit decimals, size, and no negative zero',()=>{
 assert.equal(tickLabel(-.001,1,2),'0.00');
 assert.equal(tickLabel(-2,1,0),'-2');
 assert.equal(tickLabel(-2,1,3),'-2.000');
 const r=solve(examples.SrTiO3);
 for(const showFaces of [false,true])for(const frontAxes of [false,true]){
  const {svg}=render3D(r,{camera:{...defaultCamera,showFaces,frontAxes,tickFontSize:18,tickDecimals:3}});
  assert.match(svg,/font-size="18"/);
  assert.match(svg,/>0\.000<\/text>/);
  assert.ok(!svg.includes('>-0.000</text>'));
 }
});
test('phase-view axis limits match exact display bounds independently of tick spacing',()=>{
 const r=solve(examples.SrTiO3),bounds={Sr:[-11.05,0],Ti:[-13.05,0],O:[-9.05,0]};
 for(const frontAxes of [false,true])for(const tickInterval of [0,1,2,5]){
  const out=render3D(r,{camera:{...defaultCamera,bounds,frontAxes,tickInterval}});
  assert.deepEqual(out.projection.ranges,out.projection.axes.map(e=>bounds[e]));
  assert.equal(out.projection.ranges[2][0],-9.05);
  assert.ok(ticks(out.projection.ranges[2],out.projection.interval).every(t=>t>=-9.05&&t<=0));
 }
});
test('front-edge publication axes use silhouette edges and preserve projection',()=>{
 const r=solve(examples.SrTiO3);
 for(const azimuth of [-135,-45,45,135])for(const elevation of [-30,25])for(const showFaces of [true,false]){
  const camera={...defaultCamera,azimuth,elevation,showFaces};
  const normal=render3D(r,{camera}),front=render3D(r,{camera:{...camera,frontAxes:true},own:true});
  assert.equal(frontEdges(front.projection).length,3);
  assert.ok(frontEdges(front.projection).every(e=>e.silhouette));
  assert.deepEqual(front.projection.ranges,normal.projection.ranges);
  assert.ok(front.svg.includes('data-front-axes="true"'));
  assert.ok(front.svg.includes('data-axis-tick="2"'));
  assert.ok(!/USER-SUPPLIED ENERGIES|ILLUSTRATIVE ENERGIES|NaN|undefined/.test(front.svg));
 }
});
const permutations=a=>a.length===1?[a]:a.flatMap((e,i)=>permutations(a.filter((_,j)=>j!==i)).map(t=>[e,...t]));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('all six axis orders preserve the 3D feasible set for both examples',()=>{for(const example of Object.values(examples)){const base=solve(example);for(const axes of permutations(base.elements)){const r=solve({...example,axes});assert.deepEqual([r.x,r.y,r.z],axes);assert.equal(r.vertices.length,base.vertices.length);for(const p of base.vertices){const m=base.chemicalPotentials(p);assert.ok(r.vertices.some(q=>base.elements.every(e=>Math.abs(r.chemicalPotentials(q)[e]-m[e])<1e-7)));}}}});
test('duplicate / foreign / incomplete axis assignments are rejected',()=>{for(const axes of [['O','O','Sr'],['O','Ti','Fe'],['O','Ti']])assert.throws(()=>solve({...examples.SrTiO3,axes}),/Assign each/);});
test('3D screen picking round-trips vertices and interior conditions at multiple rotations',()=>{for(const example of Object.values(examples))for(const axes of permutations(Object.keys(solve(example).composition))){const r=solve({...example,axes});const center=r.vertices.reduce((p,q)=>[p[0]+q[0]/r.vertices.length,p[1]+q[1]/r.vertices.length],[0,0]);for(const azimuth of [-150,-40,0,65,170])for(const elevation of [-65,0,25,80])for(const showHost of [true,false]){const v=makeProjection(r,{...defaultCamera,azimuth,elevation,showHost});if(v.edgeOn)continue;for(const p of [...r.vertices,center]){const picked=v.unproject(v.project(r.chemicalPotentials(p)));near(picked[0],p[0]);near(picked[1],p[1]);assert.ok(r.feasible(picked));}}}});
test('screen projection uses a common physical scale',()=>{const r=solve(examples.SrTiO3),v=makeProjection(r,defaultCamera),zero={Sr:0,Ti:0,O:0},origin=v.project(zero);let sum=0;for(const e of r.elements){const p=v.project({...zero,[e]:1});sum+=(p[0]-origin[0])**2+(p[1]-origin[1])**2;}near(sum,2*v.scale**2);});
test('edge-on host plane cannot yield ambiguous clicked chemical potentials',()=>{const r=solve(examples.SrTiO3);const elevation=Math.atan(Math.sqrt(2)/3)*180/Math.PI;const v=makeProjection(r,{...defaultCamera,azimuth:45,elevation});assert.equal(v.edgeOn,true);assert.equal(v.unproject([430,255]),null);});
test('3D SVG covers normal, unstable, line, and point equilibria without invalid coordinates',()=>{const base=structuredClone(examples.SrTiO3);const cases=[base,{...base,target:{...base.target,energy:-14}},{...base,target:{...base.target,energy:0},phases:[]},{...base,target:{...base.target,energy:-15},phases:[{formula:'SrO',energy:-6},{formula:'TiO2',energy:-9}]}];for(const m of cases){const r=solve(m);for(const showHost of [true,false]){const {svg}=render3D(r,{formula:m.target.formula,camera:{...defaultCamera,showHost},selected:r.vertices[0]});assert.ok(svg.includes('X: Sr, Y: Ti, Z: O'));assert.ok(!/NaN|Infinity|undefined/.test(svg));assert.equal((svg.match(/data-vertex=/g)||[]).length,r.vertices.length);}}});
