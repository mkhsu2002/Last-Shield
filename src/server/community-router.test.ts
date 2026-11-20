import { COMMUNITY_CONTRACT } from '../shared/community.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCommunityRouter} from './community-router.ts';
import {CommunityService} from './community-service.ts';
import {MemoryStore} from './community-test-store.ts';

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
