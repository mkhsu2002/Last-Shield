import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HallService, type VerifiedHallRun } from './hall-service.ts';
import { MemoryStore } from './community-test-store.ts';
import { RULES_VERSION } from '../shared/game-logic.ts';

const day=20261120;
function setup(){const store=new MemoryStore();let now=Date.UTC(2026,10,20,12);return {store,hall:new HallService(store,()=>now),advance:(ms:number)=>{now+=ms;}};}
function run(user='t2_a',score=1000001,combo=101,demo=false):VerifiedHallRun{return {userId:user,username:user==='t2_a'?'Alice':'Bob',runId:crypto.randomUUID(),acceptedAt:Date.UTC(2026,10,20,12),version:RULES_VERSION,day,storm:'heavy',score,perfect:101,cleared:140,bestCombo:combo,waveReached:53,elapsedMs:101000,demo};}
test('only explicit enrollment persists identity; score and combo records update independently',async()=>{
 const {hall}=setup();const first=run('t2_a',500,20);await hall.observe(first,null);
 assert.equal((await hall.list('t2_a')).topScores.length,0);
 await hall.enroll(first,'K');
 await hall.observe(run('t2_a',400,30),first);
 let view=await hall.list('t2_a');assert.equal(view.topScores[0]?.score,500);assert.equal(view.topCombos[0]?.bestCombo,30);
 assert.equal(view.me.enrolled,true);assert.equal(view.me.certificate,null);
});
test('strict million threshold, idempotent certificate and known demo isolation',async()=>{
 const {hall}=setup();const equal=run('t2_a',1000000,110,true);await hall.observe(equal,null);await hall.enroll(equal,'K');
 assert.equal((await hall.list('t2_a')).me.certificate,null);
 const million=run('t2_a',1000001,111,true);await hall.observe(million,equal);
 const first=(await hall.list('t2_a')).me.certificate!;assert.ok(first.id);assert.equal(first.username,'Alice');assert.equal(first.demo,true);
 await hall.enroll(million,'K');await hall.observe(million,equal);
 const view=await hall.list('t2_a');assert.equal(view.me.certificate?.id,first.id);assert.equal(view.me.certificate?.issuedAt,first.issuedAt);
 assert.equal(view.topScores.length,0);assert.equal(view.topCombos.length,0);assert.equal(view.million.length,1);
 assert.equal((await hall.certificate(first.id))?.score,1000001);
});
test('withdrawal revokes certificate and old retries never resurrect public identity',async()=>{
 const {hall,advance,store}=setup();const saved=run();await hall.observe(saved,null);await hall.enroll(saved,'K');
 const cert=(await hall.list('t2_a')).me.certificate!;advance(1000);await hall.withdraw('t2_a');
 await hall.observe(saved,null);await assert.rejects(hall.enroll(saved,'K'),/revoked-run/);
 assert.equal(await hall.certificate(cert.id),null);assert.equal((await hall.list('t2_a')).million.length,0);
 assert.ok(![...store.values.values()].some(v=>v.includes('Alice')));
 advance(1000);const fresh={...run(),acceptedAt:Date.UTC(2026,10,20,12)+2000};await hall.observe(fresh,null);await hall.enroll(fresh,'K');
 assert.notEqual((await hall.list('t2_a')).me.certificate?.id,cert.id);
});
test('daily champions wait for two-hour grace, share ties and anonymize unconsented names',async()=>{
 const {hall,advance}=setup();const a=run('t2_a',500,20),b=run('t2_b',500,25);await hall.observe(a,null);await hall.observe(b,null);await hall.enroll(a);
 let row=(await hall.list('t2_a')).champions[0]!;assert.equal(row.finalized,false);assert.equal(row.tieCount,2);assert.equal(row.winners[0]?.username,'Alice');
 advance(14*3600000-1);row=(await hall.list()).champions[0]!;assert.equal(row.finalized,false);
 advance(1);row=(await hall.list()).champions[0]!;assert.equal(row.finalized,true);assert.equal(row.score,500);assert.equal(row.anonymousCount,1);
 await hall.withdraw('t2_a');row=(await hall.list()).champions[0]!;assert.equal(row.winners.length,0);assert.equal(row.anonymousCount,2);
});
test('concurrent observation and enrollment retain maxima and one certificate',async()=>{
 const {hall}=setup();const a=run(),b=run('t2_b',2000000,140);await Promise.all([hall.observe(a,null),hall.observe(b,null)]);
 await Promise.all([hall.enroll(a),hall.enroll(a),hall.enroll(b)]);
 const view=await hall.list('t2_a');assert.equal(view.topScores.length,2);assert.equal(view.topScores[0]?.username,'Bob');assert.equal(view.million.length,2);
 assert.equal(new Set(view.million.map(c=>c.id)).size,2);
});
test('withdrawal removes stale day indexes so remaining public champions stay visible',async()=>{
 const {hall,store}=setup();const people=[];
 for(let i=0;i<21;i++){const saved={...run('t2_'+i,500,20),username:'Player'+i};await hall.observe(saved,null);await hall.enroll(saved);people.push(saved);}
 const ordered=people.map(person=>({person,ref:JSON.parse(store.values.get(`hall-1:${RULES_VERSION}:user:${person.userId}`)!).member.ref as string})).sort((a,b)=>a.ref.localeCompare(b.ref));
 for(const row of ordered.slice(0,20))await hall.withdraw(row.person.userId);
 const view=await hall.list();assert.equal(view.topScores.length,1);assert.equal(view.champions[0]?.winners[0]?.username,ordered[20]!.person.username);
});
test('enrolling an older proof preserves the current lower daily winner after a day removal',async()=>{
 const {hall,store}=setup();const old=run('t2_a',1000,20);await hall.observe(old,null);await hall.enroll(old);
 const tx=await store.watch(hall.dayWatchKey(day),hall.userWatchKey('t2_a'));await tx.multi();await hall.removeDay(tx,'t2_a',day,1000,null,0);await tx.exec();
 const fresh=run('t2_a',500,10);await hall.observe(fresh,null);await store.set('verified-day-best',JSON.stringify(fresh));
 await hall.enroll(old,undefined,'verified-day-best');const view=await hall.list();
 assert.equal(view.topScores[0]?.score,1000);assert.equal(view.champions[0]?.score,500);assert.equal(view.champions[0]?.winners[0]?.username,'Alice');
});

test('champion cursor remains complete after earlier entries or anchor are withdrawn',async()=>{
 const {hall}=setup();const people=[];
 for(let i=0;i<21;i++){const saved={...run('t2_'+i,500,20),username:'Player'+i};await hall.observe(saved,null);await hall.enroll(saved);people.push(saved);}
 const first=(await hall.championPage(day))!;assert.equal(first.winners.length,20);assert.ok(first.winnersCursor);
 const removed=people.find(p=>p.username===first.winners[0]!.username)!;await hall.withdraw(removed.userId);
 const next=(await hall.championPage(day,first.winnersCursor!))!;
 assert.ok(next.winners.some(p=>!first.winners.some(previous=>previous.username===p.username)));
 const anchor=people.find(p=>p.username===first.winners.at(-1)!.username)!;await hall.withdraw(anchor.userId);
 const restarted=(await hall.championPage(day,first.winnersCursor!))!;
 assert.ok(restarted.winners.some(p=>!first.winners.some(previous=>previous.username===p.username)));
});

test('a lowered daily score invalidates the champion cursor anchor safely',async()=>{
 const {hall,store}=setup();const people=[];
 for(let i=0;i<21;i++){const saved={...run('t2_'+i,500,20),username:'Player'+i};await hall.observe(saved,null);await hall.enroll(saved);people.push(saved);}
 const first=(await hall.championPage(day))!;
 const anchor=people.find(p=>p.username===first.winners.at(-1)!.username)!;
 const tx=await store.watch(hall.dayWatchKey(day),hall.userWatchKey(anchor.userId));await tx.multi();await hall.removeDay(tx,anchor.userId,day,500,500,20);await tx.exec();
 await hall.observe({...anchor,runId:crypto.randomUUID(),score:400},null);
 const next=(await hall.championPage(day,first.winnersCursor!))!;
 assert.ok(next.winners.some(p=>!first.winners.some(previous=>previous.username===p.username)));
});

test('certificate upgrades to the higher scoring run while keeping original proof and issue time',async()=>{
 const {hall,advance}=setup();const first=run();await hall.observe(first,null);await hall.enroll(first,'K');
 const before=(await hall.list('t2_a')).me.certificate!;advance(1000);
 const higher={...run('t2_a',1400000,90),acceptedAt:first.acceptedAt+1000};await hall.observe(higher,first);
 const after=(await hall.list('t2_a')).me.certificate!;assert.equal(after.id,before.id);assert.equal(after.issuedAt,before.issuedAt);
 assert.equal(after.score,1400000);assert.equal(after.bestCombo,90);assert.equal((await hall.list()).topCombos[0]?.bestCombo,101);
});
