import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCommunityRouter} from './community-router.ts';
import {CommunityService} from './community-service.ts';
import {MemoryStore} from './community-test-store.ts';
import {DefenseRun} from '../shared/game-logic.ts';

test('hall endpoints require explicit consent, bind run owner and expose only public fields',async()=>{
 let now=Date.UTC(2026,10,20,12);let actor={userId:'t2_a',username:'Alice',postId:'t3_test'};
 const service=new CommunityService(new MemoryStore(),()=>now),app=createCommunityRouter(service,async()=>actor);
 const session=await service.start(actor);now+=120000;
 const run=new DefenseRun(20261120),trace:[number,boolean][]=[];
 while(!run.finished){trace.push([50,true]);run.step(50,true);}
 const response=await app.request('/api/community/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:session.runId,trace})});
 assert.equal(response.status,200);const saved=await response.json();assert.equal('userId' in saved.result,false);
 const body={runId:session.runId,publicConsent:true,callsign:'K'};
 const enroll=(value:unknown)=>app.request('/api/community/hall/enroll',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
 assert.equal((await enroll({...body,publicConsent:false})).status,400);
 actor={...actor,userId:'t2_b'};assert.equal((await enroll(body)).status,400);actor={...actor,userId:'t2_a'};
 assert.equal((await enroll(body)).status,200);
 const hall=await(await app.request('/api/community/hall')).json();assert.equal(hall.hall.topScores[0].username,'Alice');assert.equal(hall.hall.me.enrolled,true);
 assert.doesNotMatch(JSON.stringify(hall),/t2_a|userId/);
 assert.equal((await app.request('/api/community/hall',{method:'DELETE'})).status,200);
 assert.equal((await(await app.request('/api/community/hall')).json()).hall.topScores.length,0);
});
test('anonymous hall reads work while enrollment and removal fail closed',async()=>{
 const app=createCommunityRouter(new CommunityService(new MemoryStore()),async()=>({postId:'t3_test'}));
 assert.equal((await app.request('/api/community/hall')).status,200);
 assert.equal((await app.request('/api/community/hall',{method:'DELETE'})).status,401);
 assert.equal((await app.request('/api/community/hall/certificate?id=not-a-proof')).status,400);
});
