import assert from "node:assert/strict";
import { test } from "node:test";
import * as records from "./records.ts";
import { RULES_VERSION } from "../shared/game-logic.ts";
const record = {
  version: RULES_VERSION,
  day: 20261114,
  score: 1400,
  perfect: 5,
  cleared: 10,
  bestCombo: 7,
  waveReached: 12,
};
function memory() {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}
test("best record survives a reload and a weaker replay cannot replace it", () => {
  assert.equal(typeof records.storeBest, "function");
  const storage = memory();
  assert.equal(records.storeBest(storage, record), true);
  records.storeBest(storage, { ...record, score: 100 });
  assert.deepEqual(records.readBest(storage, record.day), record);
});
test("daily and rules-version records never leak into another challenge", () => {
  const storage = memory();
  records.storeBest(storage, record);
  assert.equal(records.readBest(storage, 20261115), null);
  storage.setItem("", JSON.stringify({ ...record, version: "old" }));
  assert.equal(records.readBest(storage, record.day), null);
});
test("malformed or impossible stored values do not break play", () => {
  const storage = memory();
  for (const value of [
    "{",
    "null",
    "[]",
    JSON.stringify({ ...record, score: -1 }),
    JSON.stringify({ ...record, perfect: 26 }),
    JSON.stringify({ ...record, cleared: 2 }),
  ]) {
    storage.setItem("", value);
    assert.equal(records.readBest(storage, record.day), null);
  }
});
test("denied storage is a recoverable failure", () => {
  const denied = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("quota");
    },
  };
  assert.equal(records.readBest(denied, record.day), null);
  assert.equal(records.storeBest(denied, record), false);
  assert.equal(records.storeBest(null, record), false);
});
test("survival records beyond the old wave and score caps remain valid", () => {
  const storage = memory();
  const long = {
    ...record,
    score: 45000,
    cleared: 150,
    perfect: 140,
    bestCombo: 90,
    waveReached: 153,
  };
  assert.equal(records.storeBest(storage, long), true);
  assert.deepEqual(records.readBest(storage, record.day), long);
});

test("score-best wave remains paired with that score and old survival records are excluded", () => {
  const storage = memory();
  records.storeBest(storage, record);
  records.storeBest(storage, { ...record, score: 100, waveReached: 25 });
  assert.equal(records.readBest(storage, record.day)?.waveReached, 12);
  for (const invalid of [
    { ...record, waveReached: 1 },
    { ...record, waveReached: null },
    { ...record, version: "survival-5" },
  ]) {
    storage.setItem("", JSON.stringify(invalid));
    assert.equal(records.readBest(storage, record.day), null);
  }
});

test("multi-core volleys allow more clears than waves, but never over six per wave", () => {
  const storage = memory();
  const volleyRecord = {
    ...record,
    cleared: 35,
    perfect: 20,
    bestCombo: 30,
    waveReached: 20,
  };
  assert.equal(records.storeBest(storage, volleyRecord), true);
  assert.deepEqual(records.readBest(storage, record.day), volleyRecord);
  assert.equal(
    records.storeBest(storage, { ...volleyRecord, cleared: 121 }),
    false
  );
});

test('recent daily history survives a new UTC day and upgrades the legacy single result',()=>{
 const storage=memory();storage.setItem('',JSON.stringify(record));
 records.storeBest(storage,{...record,day:20261115,score:1800});
 assert.deepEqual(records.readBest(storage,20261114),record);
 assert.equal(records.readPreviousBest(storage,20261115)?.score,1400);
 assert.equal(records.readPreviousBest(storage,20261114),null);
});
test('only seven valid distinct challenge days are retained without losing per-day maxima',()=>{
 const storage=memory();for(let day=14;day<=23;day++)records.storeBest(storage,{...record,day:20261100+day,score:day*100});
 records.storeBest(storage,{...record,day:20261123,score:1});
 assert.equal(records.readBest(storage,20261123)?.score,2300);assert.equal(records.readPreviousBest(storage,20261123)?.day,20261122);
 assert.equal(records.readBest(storage,20261116),null);assert.equal(JSON.parse(storage.getItem()!).length,7);
});
test('a failed history write leaves the previous result intact',()=>{
 const storage=memory();records.storeBest(storage,record);
 const failing={getItem:storage.getItem,setItem(){throw new Error('quota');}};
 assert.equal(records.storeBest(failing,{...record,day:20261115}),false);assert.deepEqual(records.readBest(storage,record.day),record);
});

test('an already saved higher best does not need a write when storage becomes read-only',()=>{
 const existing=JSON.stringify([{...record,score:1000}]);
 const storage={getItem:()=>existing,setItem(){throw new Error('quota');}};
 assert.equal(records.storeBest(storage,{...record,score:100}),true);
 assert.equal(records.readBest(storage,record.day)?.score,1000);
});
