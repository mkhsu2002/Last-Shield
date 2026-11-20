import { COMMUNITY_CONTRACT } from '../shared/community.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCommunityRouter} from './community-router.ts';
import {CommunityService} from './community-service.ts';
import {MemoryStore} from './community-test-store.ts';
import { DefenseRun, RULES_VERSION } from '../shared/game-logic.ts';

test('HTTP contract rejects malformed requests and anonymous writes with safe errors',async()=>{
  const service=new CommunityService(new MemoryStore(),()=>Date.UTC(2026,10,15,12));
  const app=createCommunityRouter(service,async()=>({postId:'t3_test'}));
  const board=await app.request('/api/community/board?day=20261115');
  assert.equal(board.status,200);assert.equal((await board.json()).contract,COMMUNITY_CONTRACT);
  const session=await app.request('/api/community/start',{method:'POST'});
  assert.equal((await session.json()).runId,null);
  for(const method of ['POST','DELETE']) {
    const path=method==='POST'?'submit':'entry?day=20261115';
    const response=await app.request('/api/community/'+path,{method,headers:{'Content-Type':'application/json'},body:method==='POST'?JSON.stringify({runId:'fake',trace:[]}):undefined});
    assert.equal(response.status,401);assert.equal((await response.json()).error,'login-required');
  }
  const malformed=await app.request('/api/community/submit',{method:'POST',body:'{' });
  assert.equal(malformed.status,400);assert.equal((await malformed.json()).error,'invalid-request');
  const invalid=await app.request('/api/community/board?day=20260230');
  assert.equal(invalid.status,400);assert.equal((await invalid.json()).error,'invalid-day');
});
test('HTTP contract fails closed on storage outages and limits payload size',async()=>{
  const store=new MemoryStore();store.fail=true;
  const service=new CommunityService(store,()=>Date.UTC(2026,10,15,12));
  const app=createCommunityRouter(service,async()=>({postId:'t3_test',userId:'t2_test',username:'Tester'}));
  const response=await app.request('/api/community/start',{method:'POST'});
  assert.equal(response.status,503);assert.equal((await response.json()).error,'unavailable');
  const large=await app.request('/api/community/submit',{method:'POST',body:'x'.repeat(3*1024*1024+1)});
  assert.equal(large.status,413);
});

test('challenge HTTP is public read-only, returns only a verified target and uses safe errors',async()=>{
  let now=Date.UTC(2026,10,15,12);
  const store=new MemoryStore(),service=new CommunityService(store,()=>now);
  const owner={postId:'t3_test',userId:'t2_alice',username:'Alice'};
  const session=await service.start(owner);now+=120000;
  const run=new DefenseRun(20261115),trace:[number,boolean][]=[];
  while(!run.finished){trace.push([50,true]);run.step(50,true);}
  const saved=await service.submit(owner,session.runId!,trace);
  const app=createCommunityRouter(service,async()=>({postId:'t3_test'}));
  const path=`/api/community/challenge?code=${encodeURIComponent(`LS8:${saved.day}:${saved.runId}`)}`;
  const before=JSON.stringify([...store.values]);
  const response=await app.request(path),body=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(body,{contract:COMMUNITY_CONTRACT,rules:RULES_VERSION,target:{username:'Alice',score:saved.score,day:saved.day,rules:RULES_VERSION,kind:'rival'}});
  assert.doesNotMatch(JSON.stringify(body),/userId|runId|trace|t2_alice/);
  assert.equal(JSON.stringify([...store.values]),before);
  assert.equal((await app.request('/api/community/challenge?code=forged')).status,400);
  await service.remove(saved.day,owner.userId);
  const removed=await app.request(path);assert.equal(removed.status,404);assert.equal((await removed.json()).error,'challenge-unavailable');
});
