import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CertificateImageService, certificateImageKey } from './certificate-image.ts';
import { MemoryStore } from './community-test-store.ts';
import type { CitizenCertificate } from '../shared/heroes.ts';
import { RULES_VERSION } from '../shared/game-logic.ts';
const id='8080019d-e381-4899-82fc-ff89af9109ed';
function png(width=1600){const b=Buffer.alloc(40);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(width,16);b.writeUInt32BE(1000,20);return `data:image/png;base64,${b.toString('base64')}`;}
function setup(){
 const store=new MemoryStore();let certificate:CitizenCertificate|null={id,username:'Alice',score:1272630,bestCombo:146,day:20261120,rules:RULES_VERSION,demo:true,issuedAt:1};let uploads=0;
 const service=new CertificateImageService({store,own:async user=>user==='owner'?certificate:null,userWatchKey:user=>'owner:'+user,upload:async()=>{uploads++;return {mediaUrl:'https://i.redd.it/certificate.png'};}});
 return {service,store,uploads:()=>uploads,withdraw:async()=>{certificate=null;await store.set('owner:owner','withdrawn');await store.set(certificateImageKey(id),'null');},options:()=>({id,image:png(),publicImageConsent:true as const})};
}
test('certificate image requires authenticated owner and a separate public image agreement',async()=>{
 const s=setup();await assert.rejects(s.service.exportImage(undefined,s.options()),/login-required/);
 await assert.rejects(s.service.exportImage('owner',{...s.options(),publicImageConsent:false}),/consent-required/);
 await assert.rejects(s.service.exportImage('other',s.options()),/certificate-unavailable/);assert.equal(s.uploads(),0);
});
test('one verified certificate image is cached; concurrent clicks cannot upload twice',async()=>{
 const s=setup();const results=await Promise.allSettled([s.service.exportImage('owner',s.options()),s.service.exportImage('owner',s.options())]);
 assert.ok(results.some(r=>r.status==='fulfilled'));assert.equal(s.uploads(),1);
 assert.equal(await s.service.exportImage('owner',s.options()),'https://i.redd.it/certificate.png');assert.equal(s.uploads(),1);
});
test('malformed, oversized and wrong-size PNG inputs are rejected before upload',async()=>{
 const s=setup();for(const image of ['data:image/jpeg;base64,eA==',png(1200),'data:image/png;base64,'+'A'.repeat(3_000_000)])await assert.rejects(s.service.exportImage('owner',{...s.options(),image}),/invalid-image/);
 assert.equal(s.uploads(),0);
});
test('withdrawal prevents cached export and in-flight completion from restoring image metadata',async()=>{
 const s=setup();await s.service.exportImage('owner',s.options());await s.withdraw();await assert.rejects(s.service.exportImage('owner',s.options()),/certificate-unavailable/);
 assert.equal(await s.store.get(certificateImageKey(id)),'null');
 const store=new MemoryStore();let active=true;let complete!:(value:{mediaUrl:string})=>void;let started!:()=>void;
 const ready=new Promise<void>(resolve=>started=resolve);
 const service=new CertificateImageService({store,own:async()=>active?{id,username:'Alice',score:1272630,bestCombo:146,day:20261120,rules:RULES_VERSION,demo:true,issuedAt:1}:null,userWatchKey:()=> 'owner:key',upload:async()=>{started();return new Promise(resolve=>complete=resolve);}});
 const pending=service.exportImage('owner',{id,image:png(),publicImageConsent:true});await ready;
 active=false;await store.set('owner:key','withdrawn');await store.set(certificateImageKey(id),'null');complete({mediaUrl:'https://i.redd.it/certificate.png'});
 await assert.rejects(pending,/certificate-unavailable/);assert.equal(await store.get(certificateImageKey(id)),'null');
});
test('upload responses from other hosts never become public certificate images',async()=>{
 const store=new MemoryStore();const service=new CertificateImageService({store,own:async()=>({id,username:'Alice',score:1272630,bestCombo:146,day:20261120,rules:RULES_VERSION,demo:true,issuedAt:1}),userWatchKey:()=> 'owner:key',upload:async()=>({mediaUrl:'https://i.redd.it.evil.example/cert.png'})});
 await assert.rejects(service.exportImage('owner',{id,image:png(),publicImageConsent:true}),/image-unavailable/);
});

test('different rendered language images cannot reuse a previous PNG cache entry',async()=>{
 const store=new MemoryStore();let now=1000,uploads=0;
 const service=new CertificateImageService({store,now:()=>now,own:async()=>({id,username:'Alice',score:1272630,bestCombo:146,day:20261120,rules:RULES_VERSION,demo:true,issuedAt:1}),userWatchKey:()=> 'owner:key',upload:async()=>({mediaUrl:`https://i.redd.it/cert${++uploads}.png`})});
 const first=png(),changed=Buffer.from(first.split(',')[1]!,'base64');changed[33]=1;const second='data:image/png;base64,'+changed.toString('base64');
 assert.equal(await service.exportImage('owner',{id,image:first,publicImageConsent:true}),'https://i.redd.it/cert1.png');
 await assert.rejects(service.exportImage('owner',{id,image:second,publicImageConsent:true}),/rate-limited/);
 now+=60_001;assert.equal(await service.exportImage('owner',{id,image:second,publicImageConsent:true}),'https://i.redd.it/cert2.png');assert.equal(uploads,2);
});

test('HTTP export accepts only its own image contract and keeps owner checks server-side',async()=>{
 const {createCommunityRouter}=await import('./community-router.ts');const {CommunityService}=await import('./community-service.ts');
 const s=setup();let userId:string|undefined='owner';const app=createCommunityRouter(new CommunityService(s.store),async()=>({userId}),s.service);
 const post=(body:unknown)=>app.request('/api/community/hall/certificate/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await post({...s.options(),score:9000000})).status,400);
 assert.equal((await post({...s.options(),publicImageConsent:false})).status,400);
 userId=undefined;assert.equal((await post(s.options())).status,401);
 userId='other';assert.equal((await post(s.options())).status,404);
 userId='owner';const response=await post(s.options());assert.equal(response.status,200);const value=await response.json();assert.equal(value.imageUrl,'https://i.redd.it/certificate.png');assert.equal(value.rules,RULES_VERSION);assert.ok(!('userId' in value));
});
