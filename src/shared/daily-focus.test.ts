import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dailyFocus, focusProgress, nextResetMinutes } from './daily-focus.ts';
const stats={bestCombo:0,perfect:0,cleared:0};
test('a shared dated focus rotates real measures and remains deterministic across calendar boundaries',()=>{
 const dates=[20261119,20261120,20261121,20261122,20261123,20261124,20261125,20261126,20261127];
 const goals=dates.map(d=>dailyFocus(d));assert.deepEqual(goals,dates.map(d=>dailyFocus(d)));assert.equal(new Set(goals.map(g=>g.metric)).size,3);
 assert.ok(goals.every(g=>g.stretch>g.target&&g.target>0));assert.equal(dailyFocus(20261201).day,20261201);assert.throws(()=>dailyFocus(20260230),/invalid-day/);
});
test('focus progress uses the observed measure, caps visual progress and distinguishes both goals',()=>{
 for(const day of [20261119,20261120,20261121]){const goal=dailyFocus(day);let p=focusProgress(goal,stats);assert.equal(p.current,0);assert.equal(p.completed,false);
 p=focusProgress(goal,{...stats,[goal.metric]:goal.target});assert.equal(p.completed,true);assert.equal(p.stretchCompleted,false);
 p=focusProgress(goal,{...stats,[goal.metric]:goal.stretch+20});assert.equal(p.stretchCompleted,true);assert.equal(p.progress,1);assert.equal(p.remaining,0);}
});
test('a focus never trusts nonfinite or negative client totals as achievements',()=>{
 const goal=dailyFocus(20261120);for(const n of [Infinity,NaN,-2])assert.equal(focusProgress(goal,{...stats,[goal.metric]:n}).current,0);
});
test('UTC countdown refers to the next real reset rather than the next local midnight',()=>{
 assert.equal(nextResetMinutes(new Date('2026-11-20T23:59:30Z')),1);assert.equal(nextResetMinutes(new Date('2026-11-21T00:00:00Z')),1440);
});
