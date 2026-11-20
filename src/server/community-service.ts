import { randomUUID } from 'node:crypto';
import { utcDaySeed, RULES_VERSION } from '../shared/game-logic.ts';
import { COMMUNITY_CONTRACT, RUN_LIFETIME_MS, replayRun, type Board, type BoardEntry, type RunResult } from '../shared/community.ts';
import { dailyStorm, type StormId } from '../shared/daily-storm.ts';
import { HallService, type VerifiedHallRun } from './hall-service.ts';
import { parseChallengeCode, type ChallengeTarget } from '../shared/challenge.ts';

type SetOptions = { nx?: boolean; expiration?: Date };
type Row = { member: string; score: number };
export interface CommunityTx {
  multi(): Promise<unknown>; unwatch(): Promise<unknown>; discard(): Promise<unknown>;
  set(k: string, v: string, opts?: SetOptions): Promise<unknown>;
  zAdd(k: string, row: Row): Promise<unknown>; zRem(k: string, members: string[]): Promise<unknown>;
  expire(k: string, seconds: number): Promise<unknown>; exec(): Promise<unknown[]>;
}
export interface CommunityStore {
  get(k: string): Promise<string | undefined>; set(k: string, v: string, opts?: SetOptions): Promise<unknown>;
  watch(...keys: string[]): Promise<CommunityTx>;
  zRange(k: string, from: number | string, to: number | string, opts: {by:'rank'|'score';limit?:{offset:number;count:number}}): Promise<Row[]>;
  zRank(k:string, member:string):Promise<number|undefined>; zCard(k:string):Promise<number>;
}
export type Actor = { userId?: string; username?: string; postId?: string };
type Session = { userId: string; username: string; postId: string; day: number; storm: StormId; startedAt: number; rules: string;demo:boolean };
type Saved = VerifiedHallRun;
const prefix = `${COMMUNITY_CONTRACT}:${RULES_VERSION}`;
export const envelope = { contract: COMMUNITY_CONTRACT, rules: RULES_VERSION };
export function boardExpiry(day: number): Date {
  const s=String(day);
  const date=new Date(Date.UTC(Number(s.slice(0,4)),Number(s.slice(4,6))-1,Number(s.slice(6,8))));
  if (!/^\d{8}$/.test(s) || utcDaySeed(date)!==day) throw new Error('invalid-day');
  return new Date(date.getTime()+30*86400000);
}
const boardKey=(day:number)=>`${prefix}:board:${day}`;
const bestKey=(day:number,userId:string)=>`${prefix}:best:${day}:${userId}`;

export class CommunityService {
  private store: CommunityStore;
  private now: ()=>number;
  readonly hall:HallService;
  constructor(store:CommunityStore, now=Date.now) { this.store=store; this.now=now;this.hall=new HallService(store,now); }
  private checkDay(day:number):void {
    const expiry=boardExpiry(day);
    if(expiry.getTime()<=this.now() || day>utcDaySeed(new Date(this.now()))) throw new Error('invalid-day');
  }
  async start(actor:Actor,options:{demo?:boolean}={}) {
    const day=utcDaySeed(new Date(this.now()));
    const storm=dailyStorm(day).id;
    const demo=options.demo===true;
    if(!actor.userId) return {...envelope,day,storm,demo,runId:null};
    if(!actor.postId || !actor.username) throw new Error('invalid-context');
    const gate=await this.store.set(`${prefix}:start:${actor.userId}`,'1',{nx:true,expiration:new Date(this.now()+3000)});
    if(!gate) throw new Error('rate-limited');
    const runId=randomUUID();
    const session:Session={userId:actor.userId,username:actor.username,postId:actor.postId,day,storm,demo,startedAt:this.now(),rules:RULES_VERSION};
    await this.store.set(`${prefix}:run:${runId}`,JSON.stringify(session),{expiration:new Date(this.now()+RUN_LIFETIME_MS)});
    return {...envelope,day,storm,demo,runId};
  }
  async submit(actor:Actor,runId:string,trace:unknown):Promise<Saved> {
    if(!actor.userId) throw new Error('login-required');
    if(!/^[a-f0-9-]{36}$/.test(runId)) throw new Error('invalid-session');
    const sessionRaw=await this.store.get(`${prefix}:run:${runId}`);
    if(!sessionRaw) throw new Error('expired-session');
    const session=JSON.parse(sessionRaw) as Session;
    if(session.userId!==actor.userId || session.postId!==actor.postId || session.rules!==RULES_VERSION || session.storm!==dailyStorm(session.day).id ||
      this.now()-session.startedAt>RUN_LIFETIME_MS) throw new Error('expired-session');
    const auditKey=`${prefix}:audit:${session.day}:${runId}`;
    const existing=await this.store.get(auditKey);
    if(existing) return JSON.parse(existing) as Saved;
    const result=replayRun(session.day,trace,this.now()-session.startedAt);
    const saved:Saved={...result,userId:actor.userId,username:session.username,runId,acceptedAt:this.now(),demo:session.demo};
    const userKey=bestKey(session.day,actor.userId);
    const rankingKey=boardKey(session.day);
    const expiration=boardExpiry(session.day);
    for(let attempt=0;attempt<4;attempt++) {
      const tx=await this.store.watch(userKey,auditKey,...this.hall.watchKeys(saved));
      let active=true;
      try {
        const [oldRaw,doneRaw]=await Promise.all([this.store.get(userKey),this.store.get(auditKey)]);
        if(doneRaw) { await tx.unwatch(); active=false; return JSON.parse(doneRaw) as Saved; }
        const old=oldRaw?JSON.parse(oldRaw) as Saved:null;
        const hallPlan=await this.hall.prepare(saved,old);
        await tx.multi();
        if(!saved.demo&&(!old || saved.score>old.score)) {
          await tx.set(userKey,JSON.stringify(saved),{expiration});
          // Negative score permits ascending rank queries and exact competition ties.
          await tx.zAdd(rankingKey,{member:actor.userId,score:-saved.score});
          await tx.expire(rankingKey,Math.max(1,Math.floor((expiration.getTime()-this.now())/1000)));
        }
        await tx.set(auditKey,JSON.stringify(saved),{expiration});
        await tx.set(`${prefix}:run-index:${runId}`,JSON.stringify({day:session.day,userId:actor.userId}),{expiration});
        await hallPlan.apply(tx);
        const committed=await tx.exec(); active=false;
        if(committed.length) return saved;
      } catch(error) {
        if(active) await tx.discard().catch(()=>{});
        // Devvit may surface optimistic-lock conflicts as an RPC error.
        if(!/WATCH|transaction.*abort|transaction.*conflict/i.test(String(error))) throw error;
      }
    }
    throw new Error('retry-submit');
  }
  async acceptedRun(actor:Actor,runId:string):Promise<VerifiedHallRun>{
    if(!actor.userId)throw new Error('login-required');
    if(!/^[a-f0-9-]{36}$/.test(runId))throw new Error('invalid-session');
    const indexRaw=await this.store.get(`${prefix}:run-index:${runId}`);
    const index=indexRaw?JSON.parse(indexRaw) as {day:number;userId:string}:null;
    if(!index||index.userId!==actor.userId)throw new Error('invalid-session');
    const raw=await this.store.get(`${prefix}:audit:${index.day}:${runId}`),saved=raw?JSON.parse(raw) as Saved:null;
    if(!saved||saved.userId!==actor.userId)throw new Error('invalid-session');
    return saved;
  }
  async enroll(actor:Actor,runId:string,callsign?:string):Promise<void>{
    const run=await this.acceptedRun(actor,runId);
    await this.hall.enroll(run,callsign,bestKey(run.day,run.userId));
  }
  async resolveChallenge(code:unknown,userId?:string):Promise<ChallengeTarget>{
    const parsed=parseChallengeCode(code);
    if(!parsed)throw new Error('invalid-challenge');
    const {day,runId}=parsed;
    try{this.checkDay(day);}catch{throw new Error('challenge-unavailable');}
    const raw=await this.store.get(`${prefix}:run-index:${runId}`);
    const index=raw?JSON.parse(raw) as {day:number;userId:string}:null;
    if(!index||index.day!==day||typeof index.userId!=='string')throw new Error('challenge-unavailable');
    const [auditRaw,bestRaw,rank]=await Promise.all([
      this.store.get(`${prefix}:audit:${day}:${runId}`),this.store.get(bestKey(day,index.userId)),this.store.zRank(boardKey(day),index.userId),
    ]);
    const audit=auditRaw?JSON.parse(auditRaw) as Saved|null:null;
    const best=bestRaw?JSON.parse(bestRaw) as Saved|null:null;
    if(!audit||audit.userId!==index.userId||audit.runId!==runId||audit.day!==day||audit.version!==RULES_VERSION||audit.demo||
      !best||best.userId!==index.userId||best.day!==day||best.version!==RULES_VERSION||best.demo||rank===undefined||
      !Number.isSafeInteger(best.score)||best.score<0||typeof best.username!=='string')throw new Error('challenge-unavailable');
    return {username:best.username,score:best.score,day,rules:RULES_VERSION,kind:userId===index.userId?'personal':'rival'};
  }
  async board(day:number,userId?:string):Promise<Board> {
    this.checkDay(day);
    const key=boardKey(day);
    const [top,total,index,ownRaw]=await Promise.all([
      this.store.zRange(key,0,9,{by:'rank'}),this.store.zCard(key),
      userId?this.store.zRank(key,userId):undefined,
      userId?this.store.get(bestKey(day,userId)):undefined,
    ]);
    const nearby=index===undefined?[]:await this.store.zRange(key,Math.max(0,index-2),index+2,{by:'rank'});
    const rankCache=new Map<number,Promise<number>>();
    const rank=(score:number)=>{
      if(!rankCache.has(score)) rankCache.set(score,(async()=>{
        const first=(await this.store.zRange(key,score,score,{by:'score',limit:{offset:0,count:1}}))[0];
        return first?(await this.store.zRank(key,first.member) ?? 0)+1:1;
      })());
      return rankCache.get(score)!;
    };
    const entry=async(row:Row):Promise<BoardEntry>=>{
      const raw=await this.store.get(bestKey(day,row.member));
      const saved=raw?JSON.parse(raw) as Saved|null:null;
      return {username:saved?.username??'[deleted]',score:-row.score,rank:await rank(row.score),isYou:row.member===userId};
    };
    const [topEntries,nearEntries]=await Promise.all([Promise.all(top.map(entry)),Promise.all(nearby.map(entry))]);
    const own=ownRaw?JSON.parse(ownRaw) as Saved:null;
    const me=index!==undefined&&own?await entry({member:userId!,score:-own.score}):null;
    const above=me&&me.rank>1?await this.store.zRange(key,me.rank-2,me.rank-2,{by:'rank'}):[];
    const last=above[0];
    const firstLower=top[0]?(await this.store.zRange(key,top[0].score+1,Infinity,{by:'score',limit:{offset:0,count:1}}))[0]:undefined;
    const leaderTies=!top.length?0:firstLower?(await this.store.zRank(key,firstLower.member)??0):total;
    return {...envelope,day,storm:dailyStorm(day).id,total,leaderTies,top:topEntries,nearby:nearEntries,me,gap:own&&last?-last.score-own.score+1:null};
  }
  async remove(day:number,userId?:string):Promise<void> {
    if(!userId) throw new Error('login-required'); this.checkDay(day);
    const key=bestKey(day,userId);
    // Watch the same user key as submit so removal and submission serialize.
    for(let attempt=0;attempt<4;attempt++) {
      const tx=await this.store.watch(key,this.hall.dayWatchKey(day),this.hall.userWatchKey(userId));
      try {
        const oldRaw=await this.store.get(key),old=oldRaw?JSON.parse(oldRaw) as Saved|null:null;
        const next=(await this.store.zRange(boardKey(day),0,1,{by:'rank'})).find(row=>row.member!==userId);
        const ties=next?(await this.store.zRange(boardKey(day),next.score,next.score,{by:'score',limit:{offset:0,count:1000}})).filter(row=>row.member!==userId).length:0;
        await tx.multi();
        await tx.set(key,'null',{expiration:boardExpiry(day)});
        await tx.zRem(boardKey(day),[userId]);
        await this.hall.removeDay(tx,userId,day,old?.score??null,next?-next.score:null,ties);
        if((await tx.exec()).length) return;
      } catch(error) { await tx.discard().catch(()=>{}); throw error; }
    }
    throw new Error('retry-submit');
  }
}
