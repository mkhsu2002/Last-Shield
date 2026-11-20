import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCombatCanvas, compactHudScore } from './combat-layout.ts';

test('the approach, shield and city remain inside their dedicated arena',()=>{
  for(const [width,height] of [[370,350],[300,180],[390,520],[280,100]]) {
    const frame=fitCombatCanvas(width,height),scale=frame.height/1080;
    assert.ok(frame.width<=width);
    assert.equal(frame.width/frame.height,0.5);
    for(const sourceY of [115,568,832,880]) {
      const y=frame.top+sourceY*scale;
      assert.ok(y>=0&&y<=height,`source row ${sourceY} outside arena ${width}×${height}`);
    }
  }
});
test('a shorter arena scales uniformly without changing source coordinates',()=>{
  assert.ok(fitCombatCanvas(390,200).height<fitCombatCanvas(390,350).height);
});
test('compact scores never round up into an unearned milestone',()=>{
  assert.equal(compactHudScore(9999),'9,999');
  assert.equal(compactHudScore(10000),'10K');
  assert.equal(compactHudScore(999999),'999.9K');
  assert.equal(compactHudScore(1000000),'1M');
  assert.equal(compactHudScore(1272630),'1.27M');
  assert.equal(compactHudScore(9999999),'9.99M');
});
