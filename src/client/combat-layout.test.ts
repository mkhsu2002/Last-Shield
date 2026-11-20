import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCombatCanvas, compactHudScore } from './combat-layout.ts';

test('the full shield and city margin remain above mobile controls',()=>{
  for(const [width,height,actionTop] of [[390,612,470],[360,640,450],[390,796,650],[320,480,300]]) {
    const frame=fitCombatCanvas(width,height,actionTop);
    const scale=frame.height/1080;
    assert.ok(frame.height<=height);
    assert.ok(frame.width<=width);
    assert.equal(frame.width/frame.height,0.5);
    assert.ok((700+132+48)*scale<=actionTop-8);
  }
});
test('larger controls reserve more space instead of covering the battlefield',()=>{
  assert.ok(fitCombatCanvas(390,612,400).height<fitCombatCanvas(390,612,470).height);
});
test('compact scores never round up into an unearned milestone',()=>{
  assert.equal(compactHudScore(9999),'9,999');
  assert.equal(compactHudScore(10000),'10K');
  assert.equal(compactHudScore(999999),'999.9K');
  assert.equal(compactHudScore(1000000),'1M');
  assert.equal(compactHudScore(1272630),'1.27M');
  assert.equal(compactHudScore(9999999),'9.99M');
});
