import test from 'node:test';
import assert from 'node:assert/strict';
import { meteorGeometry, meteorSpec, SHIELD_RADIUS, METEOR_SPAWN_RADIUS } from '../shared/game-logic.ts';
import { projectBattlePoint, displayedMeteorGeometry } from './battlefield-view.ts';

for (const kind of ['normal','fast','heavy'] as const) {
  test(`deep sky keeps all ${kind} approaches visible, round and aligned at impact`,()=>{
    for(let sector=0;sector<6;sector++) {
      const spec={...meteorSpec(20261120,0),sector,kind};
      const original=meteorGeometry(spec,0,100),start=displayedMeteorGeometry(spec,0,100);
      assert.equal(start.radius,original.radius);
      assert.ok(Math.abs(start.x)+start.radius<270,'spawn inside horizontal frame');
      assert.ok(start.y+700-start.radius>100,'spawn below mobile header');
      assert.ok(start.y< -460,'spawn in distant sky');
      assert.ok(Math.hypot(start.x,start.y)-SHIELD_RADIUS-start.radius>350,'long visible approach');
      let previousY=start.y;
      for(let elapsed=0;elapsed<=spec.durationMs;elapsed+=spec.durationMs/20) {
        const point=displayedMeteorGeometry(spec,elapsed,100);
        assert.ok(point.y>=previousY-0.0001,'approach moves toward city');previousY=point.y;
      }
      for(const mass of [100,50,1]) {
        const baseRadius=meteorGeometry(spec,0,100).radius;
        const radius=meteorGeometry(spec,0,mass).radius;
        const speed=(METEOR_SPAWN_RADIUS-SHIELD_RADIUS-baseRadius)/spec.durationMs;
        const contact=(METEOR_SPAWN_RADIUS-SHIELD_RADIUS-radius)/speed;
        const point=displayedMeteorGeometry(spec,contact,mass);
        assert.ok(Math.abs(Math.hypot(point.x,point.y)-radius-SHIELD_RADIUS)<1e-7);
      }
    }
  });
}
test('sprites, pointer targets and event particles share the same projection',()=>{
  const spec={...meteorSpec(20261120,0),sector:2};
  const actual=meteorGeometry(spec,400,0);
  const point=projectBattlePoint(actual);
  const displayed=displayedMeteorGeometry(spec,400,0);
  assert.equal(point.x,displayed.x);assert.equal(point.y,displayed.y);
});
test('classic comparison preserves exact v1.0 visual positions',()=>{
  const spec=meteorSpec(20261120,0);
  assert.deepEqual(displayedMeteorGeometry(spec,350,70,true),meteorGeometry(spec,350,70));
});

test('perfect locks stay visually still while melting, and the near-shield region is unchanged',()=>{
  const spec={...meteorSpec(20261120,0),sector:4};
  const full=displayedMeteorGeometry(spec,500,100);
  const melted=displayedMeteorGeometry(spec,500,10);
  assert.equal(full.x,melted.x);assert.equal(full.y,melted.y);
  const near={x:120,y:-80};assert.deepEqual(projectBattlePoint(near),near);
});

test('mobile HUD inset lowers distant spawns without moving contact points',()=>{
  for(let sector=0;sector<6;sector++) {
    const spec={...meteorSpec(20261120,0),sector};
    const spawn=displayedMeteorGeometry(spec,0,100,false,300);
    assert.ok(spawn.y+700-spawn.radius>=280);
    const contact=displayedMeteorGeometry(spec,spec.durationMs,100,false,300);
    assert.ok(Math.abs(Math.hypot(contact.x,contact.y)-contact.radius-SHIELD_RADIUS)<1e-7);
  }
});

test('large HUD insets never project a fresh meteor inside the shield',()=>{
  for(let sector=0;sector<6;sector++){
    const spec={...meteorSpec(20261120,0),kind:'heavy' as const,sector};
    const p=displayedMeteorGeometry(spec,0,100,false,10000);
    assert.ok(Math.hypot(p.x,p.y)-p.radius-SHIELD_RADIUS>=48);
  }
});
