import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ShareCardService } from './share-card.ts';

function setup(){
 let cached:string|undefined;let uploads=0;let writes=0;
 const styles={backgroundColor:'#123456FF',height:'TALL',shareImageUrl:'https://i.redd.it/old.png'};
 const service=new ShareCardService({managed:async()=>true,get:async()=>cached,set:async(_k,v)=>{cached=v;},
  upload:async()=>{uploads++;return {mediaUrl:'https://i.redd.it/last-shield.png'};},
  read:async()=>({...styles}),write:async(_id,next)=>{writes++;Object.assign(styles,next);}});
 return {service,styles,counts:()=>({uploads,writes})};
}
test('share image uploads once, updates only image style and reads back the same post',async()=>{
 const {service,styles,counts}=setup();assert.equal(await service.update('t3_test'),'https://i.redd.it/last-shield.png');
 assert.equal(styles.backgroundColor,'#123456FF');assert.equal(styles.height,'TALL');
 await service.update('t3_test');assert.deepEqual(counts(),{uploads:1,writes:1});
});
test('only HTTPS i.redd.it image URLs can be cached or applied',async()=>{
 for(const mediaUrl of ['https://evil.example/a.png','https://i.redd.it.evil.example/a.png','http://i.redd.it/a.png']){
  let written=false;
  const service=new ShareCardService({managed:async()=>true,get:async()=>undefined,set:async()=>{written=true;},upload:async()=>({mediaUrl}),read:async()=>({}),write:async()=>{written=true;}});
  await assert.rejects(service.update('t3_test'),/invalid-share-image/);assert.equal(written,false);
 }
});
test('a failed style readback cannot report share image success',async()=>{
 const service=new ShareCardService({managed:async()=>true,get:async()=>undefined,set:async()=>{},upload:async()=>({mediaUrl:'https://i.redd.it/last-shield.png'}),read:async()=>({shareImageUrl:''}),write:async()=>{}});
 await assert.rejects(service.update('t3_test'),/share-image-unconfirmed/);
});

test('unrelated posts cannot trigger media upload or style changes',async()=>{
 let calls=0;const service=new ShareCardService({managed:async()=>false,get:async()=>{calls++;return undefined;},set:async()=>{calls++;},upload:async()=>{calls++;return {mediaUrl:'https://i.redd.it/test.png'};},read:async()=>{calls++;return {};},write:async()=>{calls++;}});
 await assert.rejects(service.update('t3_unrelated'),/unmanaged-post/);assert.equal(calls,0);
});

test('a created post stays successful if the managed registry remains unavailable',async()=>{
 const {createManagedPost}=await import('./share-card.ts');let created=0,attempts=0;
 const result=await createManagedPost(async()=>{created++;return {id:'t3_new',permalink:'/r/game/comments/new'};},async()=>{attempts++;throw new Error('storage-unavailable');});
 assert.equal(created,1);assert.equal(attempts,3);assert.equal(result.registered,false);assert.equal(result.post.permalink,'/r/game/comments/new');
});
