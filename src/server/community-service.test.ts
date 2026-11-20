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
  assert.equal(session.contract,'community-3');
  assert.equal(session.storm,dailyStorm(20261115).id);
  advance(120000);
  const result=await service.submit(actor,session.runId!,trace);
  assert.equal(result.storm,session.storm);
  const board=await service.board(20261115,actor.userId);
  assert.equal(board.storm,session.storm);assert.equal(board.total,1);
  assert.equal(board.me?.score,result.score);
  assert.equal(store.sets.get('community-1:survival-6:board:20261115')?.size,1);
});
test('demo sessions verify normally but stay outside competitive daily records',async()=>{
 const {service,advance}=setup();const session=await service.start(actor,{demo:true});advance(120000);
 const saved=await service.submit(actor,session.runId!,trace);
 assert.equal(saved.demo,true);assert.equal((await service.board(20261115,actor.userId)).total,0);
 const proof=await service.acceptedRun(actor,session.runId!);
 await service.hall.enroll(proof,'K');assert.equal((await service.hall.list(actor.userId)).me.demo,true);
 await assert.rejects(service.acceptedRun({...actor,userId:'t2_other'},session.runId!),/session/);
});
test('audit, day summary and enrolled records share the submit transaction',async()=>{
 const {service,store,advance}=setup();const session=await service.start(actor);advance(120000);store.fail=true;
 await assert.rejects(service.submit(actor,session.runId!,trace),/storage/);
 assert.equal([...store.values.keys()].filter(k=>k.includes(':audit:')||k.includes(':seen:')).length,0);
 store.fail=false;const saved=await service.submit(actor,session.runId!,trace);const proof=await service.acceptedRun(actor,session.runId!);
 await service.hall.enroll(proof);assert.equal((await service.hall.list(actor.userId)).topScores[0]?.score,saved.score);
 await service.remove(20261115,actor.userId);assert.equal((await service.hall.list()).champions.length,0);
});
test('removing one tied day entry removes its champion name but preserves all-time score',async()=>{
 const {service,advance}=setup();const bob={...actor,userId:'t2_bob',username:'Bob'};
 const a=await service.start(actor),b=await service.start(bob);advance(120000);
 await service.submit(actor,a.runId!,trace);await service.submit(bob,b.runId!,trace);
 await service.hall.enroll(await service.acceptedRun(actor,a.runId!));await service.hall.enroll(await service.acceptedRun(bob,b.runId!));
 await service.remove(20261115,actor.userId);
 const hall=await service.hall.list();assert.equal(hall.champions[0]?.tieCount,1);assert.deepEqual(hall.champions[0]?.winners.map(r=>r.username),['Bob']);
 assert.equal(hall.topScores.length,2);
 await service.enroll(actor,a.runId!);
 assert.deepEqual((await service.hall.list()).champions[0]?.winners.map(r=>r.username),['Bob']);
});
test('concurrent submissions retain one best and ties share a rank', async()=>{
  const {service,advance}=setup();
  const sessions=await Promise.all([service.start(actor),service.start({...actor,userId:'t2_bob',username:'Bob'})]);
  advance(120000);
  await Promise.all([service.submit(actor,sessions[0].runId!,trace),service.submit({...actor,userId:'t2_bob',username:'Bob'},sessions[1].runId!,trace),service.submit(actor,sessions[0].runId!,trace)]);
  const board=await service.board(20261115,actor.userId);
  assert.equal(board.total,2); assert.equal(board.leaderTies,2); assert.deepEqual(board.top.map(r=>r.rank),[1,1]); assert.equal(board.gap,null);
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

test('leader tie count includes players beyond the top ten',async()=>{
 const {service,store}=setup();const day=20261115;
 const key=`${COMMUNITY_CONTRACT}:${RULES_VERSION}:board:${day}`;
 store.sets.set(key,new Map(Array.from({length:13},(_,i)=>['t2_tie'+i,i<12?-500:-400])));
 assert.equal((await service.board(day)).leaderTies,12);
 store.sets.get(key)!.delete('t2_tie12');assert.equal((await service.board(day)).leaderTies,12);
});

test('challenge resolves an accepted public run to the current daily best and actor-relative kind', async()=>{
  const {service,store,advance}=setup();
  const session=await service.start(actor);advance(120000);
  const saved=await service.submit(actor,session.runId!,trace);
  const code=`LS8:${saved.day}:${saved.runId}`;
  const target=await service.resolveChallenge(code);
  assert.deepEqual(target,{username:'Alice',score:saved.score,day:saved.day,rules:RULES_VERSION,kind:'rival'});
  assert.equal((await service.resolveChallenge(code,actor.userId)).kind,'personal');
  assert.equal((await service.resolveChallenge(code,'t2_other')).kind,'rival');
  // Resolves the still-public current best, rather than a score embedded in a code or old audit.
  await store.set(`${COMMUNITY_CONTRACT}:${RULES_VERSION}:best:${saved.day}:${actor.userId}`,JSON.stringify({...saved,score:saved.score+500}));
  store.sets.get(`${COMMUNITY_CONTRACT}:${RULES_VERSION}:board:${saved.day}`)!.set(actor.userId,-saved.score-500);
  assert.equal((await service.resolveChallenge(code)).score,saved.score+500);
  assert.doesNotMatch(JSON.stringify(target),/userId|t2_alice|trace|acceptedAt|runId/);
  // The setup crosses midnight: valid previous UTC day challenges remain readable.
  assert.equal((await service.resolveChallenge(code)).day,20261115);
  await service.remove(saved.day,actor.userId);
  await assert.rejects(service.resolveChallenge(code),/challenge-unavailable/);
});

test('challenge rejects demos, unknown or mismatched runs and expired or future dates without writes',async()=>{
  const {service,store,advance}=setup();
  const demo=await service.start(actor,{demo:true});advance(120000);
  const saved=await service.submit(actor,demo.runId!,trace);
  const before=JSON.stringify([...store.values]);
  await assert.rejects(service.resolveChallenge(`LS8:${saved.day}:${saved.runId}`),/challenge-unavailable/);
  await assert.rejects(service.resolveChallenge(`LS8:${saved.day}:8080019d-e381-4899-82fc-ff89af9109ed`),/challenge-unavailable/);
  await assert.rejects(service.resolveChallenge(`LS8:20261114:${saved.runId}`),/challenge-unavailable/);
  await assert.rejects(service.resolveChallenge(`LS8:20261117:${saved.runId}`),/challenge-unavailable/);
  await assert.rejects(service.resolveChallenge(`LS8:20260230:${saved.runId}`),/invalid-challenge/);
  assert.equal(JSON.stringify([...store.values]),before);
  advance(31*86400000);
  await assert.rejects(service.resolveChallenge(`LS8:${saved.day}:${saved.runId}`),/challenge-unavailable/);
});

test('challenge fails closed when any audit, index or public membership is missing or incompatible',async()=>{
  const {service,store,advance}=setup();
  const session=await service.start(actor);advance(120000);
  const saved=await service.submit(actor,session.runId!,trace),code=`LS8:${saved.day}:${saved.runId}`;
  const auditKey=`${COMMUNITY_CONTRACT}:${RULES_VERSION}:audit:${saved.day}:${saved.runId}`;
  const indexKey=`${COMMUNITY_CONTRACT}:${RULES_VERSION}:run-index:${saved.runId}`;
  const currentBestKey=`${COMMUNITY_CONTRACT}:${RULES_VERSION}:best:${saved.day}:${actor.userId}`;
  const currentBoardKey=`${COMMUNITY_CONTRACT}:${RULES_VERSION}:board:${saved.day}`;
  const originalAudit=store.values.get(auditKey)!;
  for(const patch of [{demo:true},{userId:'t2_other'},{version:'survival-7'},{day:20261114},{runId:'different'}]){
    store.values.set(auditKey,JSON.stringify({...saved,...patch}));
    await assert.rejects(service.resolveChallenge(code),/challenge-unavailable/);
  }
  store.values.delete(auditKey);await assert.rejects(service.resolveChallenge(code),/challenge-unavailable/);
  store.values.set(auditKey,originalAudit);
  const originalIndex=store.values.get(indexKey)!;store.values.delete(indexKey);
  await assert.rejects(service.resolveChallenge(code),/challenge-unavailable/);store.values.set(indexKey,originalIndex);
  const originalBest=store.values.get(currentBestKey)!;store.values.set(currentBestKey,'null');
  await assert.rejects(service.resolveChallenge(code),/challenge-unavailable/);store.values.set(currentBestKey,originalBest);
  store.sets.get(currentBoardKey)!.delete(actor.userId);
  await assert.rejects(service.resolveChallenge(code),/challenge-unavailable/);
});

test('a genuine public challenge expires exactly at its UTC day thirty-day boundary',async()=>{
  const start=Date.UTC(2026,10,15,12),{service,advance}=setup(start);
  const session=await service.start(actor);advance(120000);
  const saved=await service.submit(actor,session.runId!,trace),code=`LS8:${saved.day}:${saved.runId}`;
  advance(Date.UTC(2026,11,15)-start-120000-1);
  assert.equal((await service.resolveChallenge(code)).username,'Alice');
  advance(1);
  await assert.rejects(service.resolveChallenge(code),/challenge-unavailable/);
});
