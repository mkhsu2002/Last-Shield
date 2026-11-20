import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DefenseRun } from '../shared/game-logic.ts';
import type { TraceStep } from '../shared/community.ts';
import { CommunityService, type CommunityStore, type CommunityTx } from './community-service.ts';

import { MemoryStore } from './community-test-store.ts';
import { dailyStorm } from '../shared/daily-storm.ts';
import { COMMUNITY_CONTRACT } from '../shared/community.ts';
import { RULES_VERSION } from '../shared/game-logic.ts';

const actor = { userId: 't2_alice', username: 'Alice', postId: 't3_test' };
const trace: TraceStep[] = [];
const run = new DefenseRun(20261115);
while (!run.finished) { trace.push([50,true]); run.step(50,true); }
function setup(start=Date.UTC(2026,10,15,23,59,30)) {
  const store = new MemoryStore(); let now = start;
  const service = new CommunityService(store, ()=>now);
  return { store, service, advance: (ms:number)=>{now+=ms;} };
}
test('owner binding, finished replay, idempotent retry and audit persist together', async()=>{
  const {service,store,advance}=setup();
  const session=await service.start(actor); advance(120000);
  await assert.rejects(service.submit({...actor,userId:'t2_bob'},session.runId!,trace), /session/);
  await assert.rejects(service.submit(actor,session.runId!,[]), /invalid-trace/);
  const result=await service.submit(actor,session.runId!,trace);
  assert.equal(result.day,20261115); // crosses UTC midnight, retains start day
  assert.deepEqual(await service.submit(actor,session.runId!,trace),result);
  const board=await service.board(20261115,actor.userId);
  assert.equal(board.total,1); assert.equal(board.me?.username,'Alice');
  assert.equal(board.me?.score,run.score);
  assert.ok([...store.values.keys()].some(k=>k.includes(':audit:')));
  await service.remove(20261115,actor.userId);
  assert.equal((await service.board(20261115,actor.userId)).total,0);
  await service.submit(actor,session.runId!,trace);
  assert.equal((await service.board(20261115,actor.userId)).total,0);
});
test('storm is server-derived, midnight-stable and isolated from old rankings', async()=>{
  const {service,store,advance}=setup();
  store.sets.set('community-1:survival-6:board:20261115',new Map([['t2_legacy',-99999]]));
  const session=await service.start(actor);
  assert.equal(session.contract,'community-2');
  assert.equal(session.storm,dailyStorm(20261115).id);
  advance(120000);
  const result=await service.submit(actor,session.runId!,trace);
  assert.equal(result.storm,session.storm);
  const board=await service.board(20261115,actor.userId);
  assert.equal(board.storm,session.storm);assert.equal(board.total,1);
  assert.equal(board.me?.score,result.score);
  assert.equal(store.sets.get('community-1:survival-6:board:20261115')?.size,1);
});
test('concurrent submissions retain one best and ties share a rank', async()=>{
  const {service,advance}=setup();
  const sessions=await Promise.all([service.start(actor),service.start({...actor,userId:'t2_bob',username:'Bob'})]);
  advance(120000);
  await Promise.all([service.submit(actor,sessions[0].runId!,trace),service.submit({...actor,userId:'t2_bob',username:'Bob'},sessions[1].runId!,trace),service.submit(actor,sessions[0].runId!,trace)]);
  const board=await service.board(20261115,actor.userId);
  assert.equal(board.total,2); assert.deepEqual(board.top.map(r=>r.rank),[1,1]); assert.equal(board.gap,null);
});
test('anonymous sessions cannot submit; expired sessions and storage failure fail closed',async()=>{
  const {service,store,advance}=setup();
  assert.equal((await service.start({postId:'t3_test'})).runId,null);
  await assert.rejects(service.submit({postId:'t3_test'},'fake',trace), /login/);
  const session=await service.start(actor); advance(7200001);
  await assert.rejects(service.submit(actor,session.runId!,trace), /session/);
  store.fail=true;
  await assert.rejects(service.start({...actor,userId:'t2_other'}), /storage/);
});
test('lower scores cannot replace a best; nearby ranks and gap work beyond top ten',async()=>{
  const {service,store,advance}=setup(Date.UTC(2026,10,15,12));
  const session=await service.start(actor);advance(120000);
  const saved=await service.submit(actor,session.runId!,trace);
  const boardKey=`${COMMUNITY_CONTRACT}:${RULES_VERSION}:board:20261115`;
  const bestKey=`${COMMUNITY_CONTRACT}:${RULES_VERSION}:best:20261115:`;
  // Seed competitors and an existing higher best, like records from earlier sessions.
  store.values.set(bestKey+actor.userId,JSON.stringify({...saved,score:500}));
  store.sets.get(boardKey)!.set(actor.userId,-500);
  for(let i=1;i<=15;i++) {
    const member='t2_p'+String(i).padStart(2,'0');
    store.values.set(bestKey+member,JSON.stringify({...saved,username:'Player'+i,score:500+i*100}));
    store.sets.get(boardKey)!.set(member,-(500+i*100));
  }
  const board=await service.board(20261115,actor.userId);
  assert.equal(board.me?.rank,16);assert.equal(board.top.length,10);
  assert.deepEqual(board.nearby.map(r=>r.rank),[14,15,16]);assert.equal(board.gap,101);
  // Fresh session returns a replay-derived score lower than the already saved one.
  store.values.delete(`${COMMUNITY_CONTRACT}:${RULES_VERSION}:start:`+actor.userId);
  const another=await service.start(actor);advance(120000);
  const noFire:TraceStep[]=[];const lost=new DefenseRun(20261115);
  while(!lost.finished){noFire.push([50,false]);lost.step(50,false);}
  await service.submit(actor,another.runId!,noFire);
  assert.equal((await service.board(20261115,actor.userId)).me?.score,500);
});
