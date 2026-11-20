import { certificateImageKey } from './certificate-image.ts';
import { randomUUID } from 'node:crypto';
import { RULES_VERSION } from '../shared/game-logic.ts';
import { dailyStorm } from '../shared/daily-storm.ts';
import { MILLION_SCORE, type HeroEntry, type HeroHall, type CitizenCertificate, type DailyChampion } from '../shared/heroes.ts';
import type { RunResult } from '../shared/community.ts';
import type { CommunityStore, CommunityTx } from './community-service.ts';

export type VerifiedHallRun=RunResult & {userId:string;username:string;runId:string;acceptedAt:number;demo:boolean};
type Member={ref:string;username:string;callsign?:string;demo:boolean;enrolledAt:number;scoreRun:HeroEntry;comboRun:HeroEntry;
  days:Record<string,HeroEntry>;certificate:CitizenCertificate|null};
type UserState={member:Member|null;withdrawnAt:number};
type Summary={day:number;score:number;tieCount:number;finalized:boolean;moreTies?:boolean};
type Plan={skip?:boolean;apply:(tx:CommunityTx)=>Promise<void>};
const prefix=`hall-1:${RULES_VERSION}`;
const userKey=(id:string)=>`${prefix}:user:${id}`;
const refKey=(id:string)=>`${prefix}:member:${id}`;
const certificateKey=(id:string)=>`${prefix}:certificate:${id}`;
const summaryKey=(day:number)=>`${prefix}:day:${day}`;
const dayMembers=(day:number)=>`${prefix}:day-members:${day}`;
const seenKey=(id:string)=>`${prefix}:seen:${id}`;
const scoreKey=`${prefix}:scores`,comboKey=`${prefix}:combos`,millionKey=`${prefix}:million`,daysKey=`${prefix}:days`;
const cleanupKey=`${prefix}:cleanup`;
function startOfDay(day:number):number {dailyStorm(day);const s=String(day);return Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8));}
const expires=(day:number)=>new Date(startOfDay(day)+30*86400000);
const parse=<T>(raw:string|undefined):T|null=>raw?JSON.parse(raw) as T:null;
function entry(run:VerifiedHallRun,callsign?:string):HeroEntry {
  return {username:run.username,score:run.score,bestCombo:run.bestCombo,day:run.day,rules:run.version,demo:run.demo,...(callsign?{callsign}: {})};
}
function cleanCallsign(value:string|undefined):string|undefined {
  const name=(value??'').normalize('NFKC').trim();
  if(!/^[\p{L}\p{N} _.-]{0,24}$/u.test(name))throw new Error('invalid-callsign');
  return name||undefined;
}
export class HallService {
  private readonly store:CommunityStore;
  private readonly now:()=>number;
  constructor(store:CommunityStore,now:()=>number=Date.now){this.store=store;this.now=now;}
  watchKeys(run:Pick<VerifiedHallRun,'userId'|'day'|'runId'>):string[]{return [userKey(run.userId),summaryKey(run.day),seenKey(run.runId)];}
  private async state(id:string):Promise<UserState>{return parse<UserState>(await this.store.get(userKey(id)))??{member:null,withdrawnAt:0};}
  private updateMember(member:Member,run:VerifiedHallRun):Member {
    const next:Member=JSON.parse(JSON.stringify(member));
    if(next.demo!==run.demo)return next;
    const current=entry(run,next.callsign);
    if(current.score>next.scoreRun.score)next.scoreRun=current;
    if(current.bestCombo>next.comboRun.bestCombo)next.comboRun=current;
    const previous=next.days[String(run.day)];
    if(!previous||current.score>previous.score)next.days[String(run.day)]=current;
    if(!next.certificate&&run.score>MILLION_SCORE) next.certificate={id:randomUUID(),username:run.username,callsign:next.callsign,score:run.score,
      bestCombo:run.bestCombo,day:run.day,rules:run.version,demo:run.demo,issuedAt:this.now()};
    if(next.certificate&&run.score>next.certificate.score)next.certificate={...next.certificate,score:run.score,bestCombo:run.bestCombo,day:run.day};
    return next;
  }
  private async writeMember(tx:CommunityTx,userId:string,member:Member,withdrawnAt:number,day:number):Promise<void>{
    await tx.set(userKey(userId),JSON.stringify({member,withdrawnAt}));
    await tx.set(refKey(member.ref),JSON.stringify(member));
    if(!member.demo){
      await tx.zAdd(scoreKey,{member:member.ref,score:-member.scoreRun.score});
      await tx.zAdd(comboKey,{member:member.ref,score:-member.comboRun.bestCombo});
      const row=member.days[String(day)];
      if(row)await tx.zAdd(dayMembers(day),{member:member.ref,score:-row.score});
      else await tx.zRem(dayMembers(day),[member.ref]);
    }
    if(member.certificate){
      await tx.set(certificateKey(member.certificate.id),JSON.stringify(member.certificate));
      await tx.zAdd(millionKey,{member:member.ref,score:member.certificate.issuedAt});
    }
  }
  async prepare(run:VerifiedHallRun,oldBest:Pick<RunResult,'score'>|null):Promise<Plan>{
    const [seen,state,raw]=await Promise.all([this.store.get(seenKey(run.runId)),this.state(run.userId),this.store.get(summaryKey(run.day))]);
    if(seen)return {skip:true,apply:async()=>{}};
    const summary=parse<Summary>(raw)??{day:run.day,score:0,tieCount:0,finalized:false};
    const next={...summary};
    if(!run.demo&&!summary.finalized&&(!oldBest||run.score>oldBest.score)){
      if(run.score>summary.score){next.score=run.score;next.tieCount=1;next.moreTies=false;}
      else if(run.score===summary.score)next.tieCount++;
    }
    let source=state.member;
    if(source&&!run.demo&&!oldBest){source=JSON.parse(JSON.stringify(source)) as Member;delete source.days[String(run.day)];}
    const member=source&&run.acceptedAt>state.withdrawnAt?this.updateMember(source,run):null;
    return {apply:async tx=>{
      await tx.set(seenKey(run.runId),'1',{expiration:expires(run.day)});
      if(!run.demo){await tx.set(summaryKey(run.day),JSON.stringify(next));await tx.zAdd(daysKey,{member:String(run.day),score:-run.day});}
      if(member)await this.writeMember(tx,run.userId,member,state.withdrawnAt,run.day);
    }};
  }
  async observe(run:VerifiedHallRun,oldBest:Pick<RunResult,'score'>|null):Promise<void>{
    for(let attempt=0;attempt<5;attempt++){
      const tx=await this.store.watch(...this.watchKeys(run));let active=true;
      try{const plan=await this.prepare(run,oldBest);if(plan.skip){await tx.unwatch();active=false;return;}await tx.multi();await plan.apply(tx);const done=await tx.exec();active=false;if(done.length)return;}
      catch(error){if(active)await tx.discard().catch(()=>{});if(!/WATCH|transaction.*abort|transaction.*conflict/i.test(String(error)))throw error;}
    }throw new Error('retry-submit');
  }
  async enroll(run:VerifiedHallRun,callsign?:string,dailyScoreKey?:string):Promise<void>{
    const name=cleanCallsign(callsign);
    for(let attempt=0;attempt<5;attempt++){
      const tx=await this.store.watch(userKey(run.userId),...(dailyScoreKey?[dailyScoreKey]:[]));let active=true;
      try{
        const state=await this.state(run.userId);
        if(run.acceptedAt<=state.withdrawnAt)throw new Error('revoked-run');
        if(state.member&&state.member.demo!==run.demo)throw new Error('mode-mismatch');
        let member=state.member??{ref:randomUUID(),username:run.username,demo:run.demo,enrolledAt:this.now(),scoreRun:entry(run,name),comboRun:entry(run,name),days:{},certificate:null};
        member=this.updateMember({...member,callsign:callsign===undefined?member.callsign:name},run);
        if(dailyScoreKey&&!member.demo){
          const visible=parse<VerifiedHallRun>(await this.store.get(dailyScoreKey));
          if(visible&&visible.userId===run.userId&&visible.day===run.day&&visible.version===run.version&&!visible.demo){
            member=this.updateMember(member,visible);member.days[String(run.day)]=entry(visible,member.callsign);
          }else delete member.days[String(run.day)];
        }
        if(member.certificate)member.certificate={...member.certificate,callsign:member.callsign};
        await tx.multi();await this.writeMember(tx,run.userId,member,state.withdrawnAt,run.day);const done=await tx.exec();active=false;if(done.length)return;
      }catch(error){if(active)await tx.discard().catch(()=>{});if(!/WATCH|transaction.*abort|transaction.*conflict/i.test(String(error)))throw error;}
    }throw new Error('retry-submit');
  }
  async withdraw(userId:string):Promise<void>{
    for(let attempt=0;attempt<5;attempt++){
      const tx=await this.store.watch(userKey(userId));let active=true;
      try{
        const state=await this.state(userId),member=state.member;
        await tx.multi();
        await tx.set(userKey(userId),JSON.stringify({member:null,withdrawnAt:this.now()}),{expiration:new Date(this.now()+30*86400000)});
        if(member){
          await tx.set(refKey(member.ref),'null');
          for(const key of [scoreKey,comboKey,millionKey])await tx.zRem(key,[member.ref]);
          if(member.certificate){await tx.set(certificateKey(member.certificate.id),'null');await tx.set(certificateImageKey(member.certificate.id),'null');}
          const days=Object.keys(member.days).map(Number).sort((a,b)=>b-a);
          for(const day of days.slice(0,20))await tx.zRem(dayMembers(day),[member.ref]);
          if(days.length>20){await tx.set(`${prefix}:cleanup:${member.ref}`,JSON.stringify(days.slice(20)));await tx.zAdd(cleanupKey,{member:member.ref,score:this.now()});}
        }
        const done=await tx.exec();active=false;if(done.length)return;
      }catch(error){if(active)await tx.discard().catch(()=>{});if(!/WATCH|transaction.*abort|transaction.*conflict/i.test(String(error)))throw error;}
    }throw new Error('retry-submit');
  }
  async ownCertificate(userId:string):Promise<CitizenCertificate|null>{return (await this.state(userId)).member?.certificate??null;}
  async certificate(id:string):Promise<CitizenCertificate|null>{
    if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('invalid-certificate');
    return parse<CitizenCertificate>(await this.store.get(certificateKey(id)));
  }
  async removeDay(tx:CommunityTx,userId:string,day:number,oldScore:number|null,nextScore:number|null,nextTies:number):Promise<void>{
    const state=await this.state(userId);
    if(state.member){
      const member=JSON.parse(JSON.stringify(state.member)) as Member;delete member.days[String(day)];
      await tx.zRem(dayMembers(day),[member.ref]);
      await tx.set(userKey(userId),JSON.stringify({...state,member}));await tx.set(refKey(member.ref),JSON.stringify(member));
    }
    const summary=parse<Summary>(await this.store.get(summaryKey(day)));
    if(!summary||summary.finalized||oldScore!==summary.score)return;
    const next={...summary};
    if(summary.tieCount>1)next.tieCount--;
    else{next.score=nextScore??0;next.tieCount=nextScore===null?0:nextTies;next.moreTies=nextTies>=1000;}
    await tx.set(summaryKey(day),JSON.stringify(next));
  }
  dayWatchKey(day:number):string{return summaryKey(day);}
  userWatchKey(userId:string):string{return userKey(userId);}
  private async cleanup():Promise<void>{
    const job=(await this.store.zRange(cleanupKey,0,0,{by:'rank'}))[0];if(!job)return;
    const key=`${prefix}:cleanup:${job.member}`,tx=await this.store.watch(key);let active=true;
    try{
      const days=parse<number[]>(await this.store.get(key))??[];await tx.multi();
      for(const day of days.slice(0,20))await tx.zRem(dayMembers(day),[job.member]);
      await tx.set(key,days.length>20?JSON.stringify(days.slice(20)):'null');
      if(days.length<=20)await tx.zRem(cleanupKey,[job.member]);await tx.exec();active=false;
    }catch(error){if(active)await tx.discard().catch(()=>{});if(!/WATCH|transaction.*abort|transaction.*conflict/i.test(String(error)))throw error;}
  }
  private async champion(day:number,after?:string):Promise<DailyChampion|null>{
    let summary=parse<Summary>(await this.store.get(summaryKey(day)));
    if(!summary||!summary.tieCount)return null;
    if(!summary.finalized&&this.now()>=startOfDay(day)+26*3600000){
      for(let attempt=0;attempt<4;attempt++){
        const tx=await this.store.watch(summaryKey(day));let active=true;
        try{const current=parse<Summary>(await this.store.get(summaryKey(day)));if(!current){await tx.unwatch();active=false;return null;}
          await tx.multi();await tx.set(summaryKey(day),JSON.stringify({...current,finalized:true}));const done=await tx.exec();active=false;
          if(done.length){summary={...current,finalized:true};break;}
        }catch(error){if(active)await tx.discard().catch(()=>{});if(!/WATCH|transaction.*abort|transaction.*conflict/i.test(String(error)))throw error;}
      }
    }
    const winners:HeroEntry[]=[];let rank:number|undefined,scanned=0,exhausted=false,lastRef:string|undefined;
    const anchor=after?.split(':');
    if(anchor&&Number(anchor[0])===summary.score){
      const previousRank=await this.store.zRank(dayMembers(day),anchor[1]!);
      if(previousRank!==undefined){
        const anchorRow=(await this.store.zRange(dayMembers(day),previousRank,previousRank,{by:'rank'}))[0];
        if(anchorRow?.member===anchor[1]&&anchorRow.score===-summary.score)rank=previousRank+1;
      }
    }
    const firstPage=rank===undefined;
    while(winners.length<20&&scanned<80){
      const rows=rank===undefined
        ?await this.store.zRange(dayMembers(day),-summary.score,-summary.score,{by:'score',limit:{offset:0,count:20}})
        :await this.store.zRange(dayMembers(day),rank,rank+19,{by:'rank'});
      let used=0;
      for(const row of rows){
        if(row.score!==-summary.score){exhausted=true;break;}
        used++;scanned++;lastRef=row.member;
        const member=parse<Member>(await this.store.get(refKey(row.member)));
        if(member&&!member.demo&&member.days[String(day)]?.score===summary.score)winners.push({...member.days[String(day)]!,username:member.username,callsign:member.callsign});
        if(winners.length===20)break;
      }
      if(exhausted||(used===rows.length&&rows.length<20)){exhausted=true;break;}
      if(!lastRef){exhausted=true;break;}
      const previousRank=await this.store.zRank(dayMembers(day),lastRef);
      // A concurrent removal invalidates this anchor. Restart safely on the next request.
      if(previousRank===undefined)break;
      rank=previousRank+1;
    }
    return {day,score:summary.score,tieCount:summary.tieCount,finalized:summary.finalized,winners,
      anonymousCount:firstPage&&exhausted?Math.max(0,summary.tieCount-winners.length):null,
      moreTies:!!summary.moreTies||!exhausted,winnersCursor:exhausted?null:`${summary.score}:${lastRef}`};
  }
  async championPage(day:number,after?:string):Promise<DailyChampion|null>{
    startOfDay(day);if(after!==undefined&&!/^\d+:[a-f0-9-]{36}$/.test(after))throw new Error('invalid-request');
    return this.champion(day,after);
  }
  private async ranked(key:string,field:'scoreRun'|'comboRun'):Promise<HeroEntry[]>{
    const rows=await this.store.zRange(key,0,99,{by:'rank'});
    const members=await Promise.all(rows.map(async row=>parse<Member>(await this.store.get(refKey(row.member)))));
    let last:number|undefined,rank=0;
    return members.flatMap((member,index)=>{
      if(!member||member.demo)return [];
      const points=field==='scoreRun'?member.scoreRun.score:member.comboRun.bestCombo;
      if(points!==last){rank=index+1;last=points;}
      return [{...member[field],username:member.username,callsign:member.callsign,rank}];
    });
  }
  async list(userId?:string,before?:number):Promise<HeroHall>{
    if(before!==undefined)startOfDay(before);
    await this.cleanup();
    const [topScores,topCombos,rows,dates,state]=await Promise.all([
      this.ranked(scoreKey,'scoreRun'),this.ranked(comboKey,'comboRun'),this.store.zRange(millionKey,0,99,{by:'rank'}),
      before===undefined?this.store.zRange(daysKey,0,14,{by:'rank'}):this.store.zRange(daysKey,-before+1,Infinity,{by:'score',limit:{offset:0,count:15}}),
      userId?this.state(userId):Promise.resolve({member:null,withdrawnAt:0}),
    ]);
    const million=(await Promise.all(rows.map(async row=>parse<Member>(await this.store.get(refKey(row.member)))))).flatMap(m=>m?.certificate?[m.certificate]:[]);
    const champions=(await Promise.all(dates.map(row=>this.champion(Number(row.member))))).filter((row):row is DailyChampion=>!!row);
    return {season:RULES_VERSION,topScores,topCombos,million,champions,historyCursor:dates.length===15?Number(dates.at(-1)!.member):null,
      me:{enrolled:!!state.member,demo:state.member?.demo??false,callsign:state.member?.callsign,certificate:state.member?.certificate??null}};
  }
}
