import test from 'node:test';
import assert from 'node:assert/strict';
import {lineOccluders,maskLineArtwork} from './dist/occlusion.mjs';
import {solve,examples} from './dist/engine.mjs';
import {render3D,defaultCamera} from './dist/plot3d.mjs';
const p={axes:['x','y','z'],project:v=>[v.x,v.y],depth:v=>v.z};
const faces=[{vertices:[{x:-1,y:-1,z:0},{x:1,y:-1,z:0},{x:1,y:1,z:0},{x:-1,y:1,z:0}]}];
test('only surfaces in front of a guide occlude it',()=>{
  assert.equal(lineOccluders({x:-2,y:0,z:1},{x:2,y:0,z:1},faces,p).length,0);
  assert.equal(lineOccluders({x:-2,y:0,z:-1},{x:2,y:0,z:-1},faces,p)[0].length,4);
  const clipped=lineOccluders({x:-1,y:0,z:-1},{x:1,y:0,z:1},faces,p)[0];
  assert.ok(clipped.every(([x])=>x<=1e-7));assert.equal(clipped.filter(([x])=>Math.abs(x)<1e-7).length,2);
});
test('opacity controls guide transmission including fully solid and wireframe endpoints',()=>{
  const a={x:-2,y:0,z:-1},b={x:2,y:0,z:-1};
  assert.equal(maskLineArtwork('test','line',a,b,faces,p,0),'line');
  for(const opacity of [.5,1]){const svg=maskLineArtwork('test','line',a,b,faces,p,opacity);assert.ok(svg.includes(`fill="black" fill-opacity="${opacity}"`));assert.ok(svg.includes('mask-type:luminance'));}
});
test('both 3D modes respect 100% opacity and depth-mask axes and guides',()=>{
  const r=solve(examples.ZnSb2O4_HSE_prose);
  for(const showFaces of [true,false])for(const azimuth of [-135,45]){
    const {svg}=render3D(r,{formula:'ZnSb2O4',camera:{...defaultCamera,showFaces,showHost:true,opacity:1,azimuth},selected:r.vertices[0]});
    assert.ok(svg.includes('data-depth-masked="true"'));assert.ok(!svg.includes('fill-opacity="0.5"'));assert.ok(!/NaN|undefined|Infinity/.test(svg));
    const physical=[...svg.matchAll(/<polygon[^>]*>/g)].map(m=>m[0]).filter(s=>!s.includes('fill="black"'));
    assert.ok(physical.every(s=>s.includes('fill-opacity="1"')));
  }
});
