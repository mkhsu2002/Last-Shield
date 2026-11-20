import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RULES_VERSION } from '../shared/game-logic.ts';
import { dailyFocus } from '../shared/daily-focus.ts';
import { readFocusRecord, storeFocusRecord, scopedFocusStorage } from './focus-records.ts';

function memory() {
  const values = new Map<string,string>();
  return { values, getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => { values.set(key,value); } };
}
function run(day:number,current:number) {
  return {version:RULES_VERSION, day, bestCombo:current, perfect:current, cleared:current};
}
test('daily focus remembers the best single-run metric across reloads and weaker later runs', () => {
  const storage = memory(), day = 20261120, goal = dailyFocus(day);
  assert.equal(storeFocusRecord(storage,run(day,goal.stretch),'local'),true);
  assert.equal(storeFocusRecord(storage,run(day,1),'local'),true);
  assert.deepEqual(readFocusRecord(storage,day), {version:RULES_VERSION,day,metric:goal.metric,local:goal.stretch,verified:null});
  const reloaded = {getItem:storage.getItem,setItem:storage.setItem};
  assert.equal(readFocusRecord(reloaded,day)?.local,goal.stretch);
});
test('local and server-confirmed maxima are independent and counts are never added between runs', () => {
  const storage = memory(), day = 20261121;
  storeFocusRecord(storage,run(day,7),'local'); storeFocusRecord(storage,run(day,8),'local');
  assert.equal(readFocusRecord(storage,day)?.local,8);
  assert.equal(readFocusRecord(storage,day)?.verified,null);
  storeFocusRecord(storage,run(day,5),'verified'); storeFocusRecord(storage,run(day,2),'verified');
  assert.equal(readFocusRecord(storage,day)?.local,8);
  assert.equal(readFocusRecord(storage,day)?.verified,5);
  storeFocusRecord(storage,run(day,12),'verified');
  assert.equal(readFocusRecord(storage,day)?.local,8);
  assert.equal(readFocusRecord(storage,day)?.verified,12);
});
test('each daily profile uses its own actual metric rather than a different run statistic', () => {
  const storage = memory();
  for (const day of [20261119,20261120,20261121]) {
    const stats={...run(day,30),bestCombo:10,perfect:20,cleared:30};
    storeFocusRecord(storage,stats,'local');
    assert.equal(readFocusRecord(storage,day)?.local,stats[dailyFocus(day).metric]);
  }
});
test('only the seven newest UTC played days survive regardless of write order', () => {
  const storage = memory();
  for (const day of [20261119,20261121,20261120,20261122,20261123,20261124,20261125,20261126]) storeFocusRecord(storage,run(day,10),'local');
  assert.equal(readFocusRecord(storage,20261119),null);
  for (const day of [20261120,20261121,20261122,20261123,20261124,20261125,20261126]) assert.equal(readFocusRecord(storage,day)?.local,10);
  assert.equal(storeFocusRecord(storage,run(20261118,20),'verified'),false);
  assert.equal(readFocusRecord(storage,20261118),null);
});
test('invalid dates, versions, non-integer counts and impossible single-run totals are rejected', () => {
  const storage=memory(), base=run(20261120,10);
  for (const invalid of [{...base,day:20260230},{...base,day:NaN},{...base,day:20261120.5},
    {...base,version:'old-rules'}, {...base,perfect:11}, {...base,bestCombo:11},
    {...base,cleared:-1}, {...base,cleared:Number.MAX_SAFE_INTEGER+1}, {...base,bestCombo:NaN}, {...base,perfect:Infinity}, {...base,cleared:1.5}]) {
    assert.equal(storeFocusRecord(storage,invalid,'local'),false);
  }
  assert.equal(readFocusRecord(storage,20260230),null);
  assert.equal(readFocusRecord(storage,20261120),null);
});
test('corrupted stored records and old rule namespaces cannot supply progress for today', () => {
  const storage=memory(),day=20261120;
  storeFocusRecord(storage,run(day,10),'local');
  const key=[...storage.values.keys()][0]!;
  const valid=JSON.parse(storage.values.get(key)!)[0];
  for (const invalid of [{...valid,version:'old-rules'},{...valid,day:20260230},{...valid,metric:'unknown'},
    {...valid,local:NaN},{...valid,local:'10'},{...valid,verified:-1},{...valid,local:null,verified:null}]) {
    storage.setItem(key,JSON.stringify([invalid])); assert.equal(readFocusRecord(storage,day),null);
  }
  for (const value of ['{','null','{}','[]']) {storage.setItem(key,value);assert.equal(readFocusRecord(storage,day),null);}
  storage.values.clear(); storage.setItem(key.replace(RULES_VERSION,'older-version'),JSON.stringify([valid]));
  assert.equal(readFocusRecord(storage,day),null);
});
test('missing or denied storage never prevents gameplay', () => {
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  for(const storage of [null,denied]) {
    assert.equal(readFocusRecord(storage,20261120),null);
    assert.equal(storeFocusRecord(storage,run(20261120,10),'local'),false);
  }
});
test('a failed read cannot overwrite an existing achievement with a weaker run', () => {
  let writes=0;
  const unreadable={getItem(){throw new Error('temporarily unreadable');},setItem(){writes++;}};
  assert.equal(storeFocusRecord(unreadable,run(20261120,1),'local'),false);
  assert.equal(writes,0);
});

test('focus storage separates both local and confirmed progress by post and account', () => {
  const storage=memory(),day=20261120;
  const own=scopedFocusStorage(storage,'t3_post1','t2_user1');
  storeFocusRecord(own,run(day,20),'local');storeFocusRecord(own,run(day,15),'verified');
  assert.equal(readFocusRecord(scopedFocusStorage(storage,'t3_post1','t2_user1'),day)?.verified,15);
  for(const scope of [scopedFocusStorage(storage,'t3_post2','t2_user1'),scopedFocusStorage(storage,'t3_post1','t2_user2'),
    scopedFocusStorage(storage,'t3_post1',undefined),scopedFocusStorage(storage,undefined,'t2_user1'),scopedFocusStorage(storage,undefined,undefined)]) {
    assert.equal(readFocusRecord(scope,day),null);
  }
  storeFocusRecord(scopedFocusStorage(storage,'t3_post2','t2_user1'),run(day,40),'verified');
  assert.equal(readFocusRecord(own,day)?.verified,15);
  assert.equal(readFocusRecord(own,day)?.local,20);
  assert.equal(readFocusRecord(storage,day),null,'unscoped legacy progress is not silently adopted');
});
test('standalone and guest markers cannot collide with actual IDs or encoded delimiters', () => {
  const storage=memory(),day=20261120;
  const scopes:[string|undefined,string|undefined][]=[
    [undefined,undefined],['standalone','guest'],['a:b','c'],['a','b:c'],['a%3Ab','c'],
    ['a/b','c'],['a%2Fb','c'],['a','guest'],['a',undefined],
  ];
  scopes.forEach(([post,user],index)=>storeFocusRecord(scopedFocusStorage(storage,post,user),run(day,index+1),'local'));
  assert.equal(storage.values.size,scopes.length);
  scopes.forEach(([post,user],index)=>assert.equal(readFocusRecord(scopedFocusStorage(storage,post,user),day)?.local,index+1));
});
test('untrusted oversized or malformed scopes disable focus storage without throwing', () => {
  const storage=memory();
  assert.equal(scopedFocusStorage(null,'t3_post1','t2_user1'),null);
  for(const invalid of ['', 'x'.repeat(129), 'bad\nvalue', 'bad value', '\ud800']) {
    assert.equal(scopedFocusStorage(storage,invalid,'t2_user1'),null);
    assert.equal(scopedFocusStorage(storage,'t3_post1',invalid),null);
  }
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  const scope=scopedFocusStorage(denied,'t3_post1','t2_user1');
  assert.equal(readFocusRecord(scope,20261120),null);
  assert.equal(storeFocusRecord(scope,run(20261120,10),'local'),false);
});
