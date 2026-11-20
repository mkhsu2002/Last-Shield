import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCombatCanvas, compactHudScore } from './combat-layout.ts';
import { displayedMeteorGeometry } from './battlefield-view.ts';
import { meteorSpec } from '../shared/game-logic.ts';

test('normal mobile arenas fill their available width',()=>{
  for(const [width,height] of [[370,365],[340,380],[410,570],[600,650]]) {
    const frame=fitCombatCanvas(width,height);
    assert.equal(frame.width,width);
    assert.equal(frame.width/frame.height,0.5);
  }
});
test('adaptive framing keeps every meteor approach, full shield and lit city inside the arena',()=>{
  for(const [width,height] of [[370,365],[340,300],[390,520],[280,100]]) {
    const frame=fitCombatCanvas(width,height),scale=frame.height/1080;
    assert.ok(frame.width<=width);
    assert.ok(Number.isFinite(frame.skyTop));
    assert.equal(frame.width/frame.height,0.5);
    for(const sourceY of [568,832,880]) {
      const y=frame.top+sourceY*scale;
      assert.ok(y>=0&&y<=height,`source row ${sourceY} outside arena ${width}×${height}`);
    }
    for(const kind of ['normal','fast','heavy'] as const)for(let sector=0;sector<6;sector++) {
      const spec={...meteorSpec(20261120,0),kind,sector};
      for(let i=0;i<=20;i++) {
        const p=displayedMeteorGeometry(spec,spec.durationMs*i/20,100,false,frame.skyTop);
        assert.ok(frame.top+(700+p.y-p.radius)*scale>=-0.01,'meteor above arena');
        assert.ok(frame.top+(700+p.y+p.radius)*scale<=height+.01,'meteor below arena');
        assert.ok(Math.abs(p.x)+p.radius<=270,'meteor outside horizontal arena');
      }
    }
  }
});
test('very short arenas preserve complete targets rather than cutting the shield',()=>{
  assert.ok(fitCombatCanvas(390,100).width<390);
  assert.ok(fitCombatCanvas(390,350).width>fitCombatCanvas(390,100).width);
});
test('compact scores never round up into an unearned milestone',()=>{
  assert.equal(compactHudScore(9999),'9,999');
  assert.equal(compactHudScore(10000),'10K');
  assert.equal(compactHudScore(999999),'999.9K');
  assert.equal(compactHudScore(1000000),'1M');
  assert.equal(compactHudScore(1272630),'1.27M');
  assert.equal(compactHudScore(9999999),'9.99M');
});
