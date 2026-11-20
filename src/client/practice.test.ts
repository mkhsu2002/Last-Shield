import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PracticeReview, practiceDelta, hasPracticed, markPracticed, practiceLessonInfo, practiceStepDelta, practiceLessonPassed, practiceDangerReady } from './practice.ts';

test('practice approaches gold slowly and waits there without consuming the window', () => {
  assert.equal(practiceDelta(100, 950, 1000, false, false), 50);
  assert.equal(practiceDelta(100, 1000, 1000, false, false), 0);
  assert.equal(practiceDelta(100, 1000, 1000, true, false), 50);
  assert.equal(practiceDelta(100, 1100, 1000, false, true), 50);
});

test('practice result cannot advance while the original mouse or key is still held', () => {
  const review = new PracticeReview();
  review.advance(5000);
  assert.equal(review.canContinue(true), false);
  assert.equal(review.canContinue(false), true);
});

test('letting go immediately still leaves time to read the result', () => {
  const review = new PracticeReview();
  assert.equal(review.canContinue(false), false);
  review.advance(1799);
  assert.equal(review.canContinue(false), false);
  review.advance(1);
  assert.equal(review.canContinue(false), true);
});
test('practice guidance is prominent until reviewed and storage failure remains optional',()=>{
  const values=new Map<string,string>();const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
  assert.equal(hasPracticed(storage),false);markPracticed(storage);assert.equal(hasPracticed(storage),true);
  assert.equal(hasPracticed(null),false);assert.doesNotThrow(()=>markPracticed(null));
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  assert.equal(hasPracticed(denied),false);assert.doesNotThrow(()=>markPracticed(denied));
});

test('practice lessons form an optional three-step chain with distinct clear requirements', () => {
  const timing = practiceLessonInfo('timing');
  const relay = practiceLessonInfo('relay');
  const overdrive = practiceLessonInfo('overdrive');
  assert.equal(timing.next, 'relay');
  assert.equal(relay.next, 'overdrive');
  assert.equal(overdrive.next, null);
  assert.equal(timing.requiredClears, 1);
  assert.equal(relay.requiredClears, 2);
  assert.equal(overdrive.requiredClears, 3);
  assert.match(timing.goal, /變金色.*按住/);
  assert.match(relay.goal, /擊碎第一顆.*放開.*第二顆/);
  assert.match(overdrive.goal, /保留.*接近.*超載震爆/);
  for (const lesson of [timing, relay, overdrive]) assert.doesNotMatch(lesson.title + lesson.goal, /已掌握|必須完成全部|一定/);
});
test('timing and relay retain the gold pause while overdrive threats continue approaching', () => {
  for (const lesson of ['timing','relay'] as const) {
    assert.equal(practiceStepDelta(lesson, 100, 950, 1000, false, false), 50);
    assert.equal(practiceStepDelta(lesson, 100, 1000, 1000, false, false), 0);
    assert.equal(practiceStepDelta(lesson, 100, 1000, 1000, true, false), 50);
    assert.equal(practiceStepDelta(lesson, 100, 1100, 1000, false, true), 50);
  }
  for (const elapsed of [950, 1000, 1100]) assert.equal(practiceStepDelta('overdrive', 100, elapsed, 1000, false, false), 50);
  assert.equal(practiceStepDelta('overdrive', 40, 1100, 1000, true, true), 20);
});
test('lesson timing clamps frame delays without permitting reverse or invalid time', () => {
  for (const lesson of ['timing','relay','overdrive'] as const) {
    assert.equal(practiceStepDelta(lesson, 5000, 0, 1000, true, false), 50);
    for (const dt of [-1, NaN, Infinity, -Infinity]) assert.equal(practiceStepDelta(lesson, dt, 0, 1000, true, false), 0);
  }
});
test('lesson helpers do not bypass the existing read interval or release-to-continue gate', () => {
  const review = new PracticeReview();
  practiceLessonInfo('timing'); practiceStepDelta('overdrive', 100, 1000, 1000, false, false);
  assert.equal(review.canContinue(false), false);
  review.advance(1799); assert.equal(review.canContinue(false), false);
  review.advance(1); assert.equal(review.canContinue(true), false);
  review.advance(10000); assert.equal(review.canContinue(true), false);
  assert.equal(review.canContinue(false), true);
});

test('lesson completion requires perfect relay clears and an actual late manual overdrive', () => {
  assert.equal(practiceLessonPassed('timing', 1, 1, 0, false), true);
  assert.equal(practiceLessonPassed('timing', 1, 0, 0, false), false);
  assert.equal(practiceLessonPassed('relay', 1, 1, 0, false), false);
  assert.equal(practiceLessonPassed('relay', 2, 1, 0, false), false);
  assert.equal(practiceLessonPassed('relay', 2, 2, 0, false), true);
  assert.equal(practiceLessonPassed('overdrive', 3, 3, 0, true), false);
  assert.equal(practiceLessonPassed('overdrive', 3, 0, 3, false), false);
  assert.equal(practiceLessonPassed('overdrive', 3, 0, 3, true), true);
  assert.equal(practiceDangerReady(2000), false); assert.equal(practiceDangerReady(900), true);
  assert.equal(practiceDangerReady(Infinity), false);
});
