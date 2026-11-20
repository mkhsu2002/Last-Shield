import { context, navigateTo, showShareSheet, getShareData } from '@devvit/web/client';
import { utcDaySeed, RULES_VERSION } from '../shared/game-logic';
import { COMMUNITY_CONTRACT, MAX_TRACE_STEPS, type Board, type RunResult, type TraceStep } from '../shared/community';
import { element, text } from './game-ui';
import { localizedText, localizedValue, localizedAttribute, renderCopy } from './i18n';
import { dailyStorm, type StormId } from '../shared/daily-storm';
import { chooseRival, defaultRival, refreshRival, rivalStatus, nearbyEntries, type RivalTarget } from './rival';

import { buildChallengeCode, parseChallengeCode, parseRivalShareData, type ChallengeTarget } from '../shared/challenge';

type Start = {contract:string;rules:string;day:number;storm:StormId;runId:string|null;demo:boolean};
async function request<T>(path:string, method='GET', body?:unknown):Promise<T> {
  const response=await fetch(`/api/community/${path}`,{
    method,headers:body?{'Content-Type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000),
  });
  const value=await response.json();
  if(!response.ok) throw new Error(value.error??'unavailable');
  if(value.contract!==COMMUNITY_CONTRACT || value.rules!==RULES_VERSION) throw new Error('version-mismatch');
  if('day' in value && value.storm!==dailyStorm(value.day).id) throw new Error('version-mismatch');
  return value as T;
}

export class Community {
  private enabled=Boolean(context?.postId);
  private runId:string|null=null;
  private trace:TraceStep[]=[];
  private day=utcDaySeed(new Date());
  private demo=false;
  private runGeneration=0;
  private finished=false;
  private busy=false;
  private saved=false;
  private verifiedScore=0;
  private removed=false;
  private boardGeneration=0;
  private preview:string[]=[];
  private latestBoard:Board|null=null;
  private boardUnavailable=false;
  private nextTarget:RivalTarget|null=null;
  private activeTarget:RivalTarget|null=null;
  private nextChallengeCode:string|null=null;
  private receivedChallenge:{code:string;target:ChallengeTarget}|null=null;
  private challengeGeneration=0;
  private postedUrl=context?.postId?`https://www.reddit.com/comments/${context.postId.replace(/^t3_/,'')}`:'';
  constructor(private readonly onChallenge:()=>void, private readonly hall:{begin():void;accepted(runId:string,score:number,demo:boolean):void}, private readonly onVerified:(result:RunResult)=>void = () => {}) {
    element('intro-board').addEventListener('click',()=>void this.openBoard());
    element('result-board').addEventListener('click',()=>void this.openBoard());
    element('board-close').addEventListener('click',()=>element<HTMLDialogElement>('community-dialog').close());
    element('board-refresh').addEventListener('click',()=>void this.refresh());
    element('challenge-invite').addEventListener('click',()=>void this.invite());
    element('challenge-find').addEventListener('click',()=>void this.findChallenge());
    element<HTMLInputElement>('challenge-code').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();void this.findChallenge();}});
    element('challenge-code').addEventListener('input',()=>{++this.challengeGeneration;this.receivedChallenge=null;element('challenge-accept').hidden=true;element('challenge-today').hidden=true;text('challenge-status','');});
    element('challenge-today').addEventListener('click',()=>{this.nextTarget=null;this.nextChallengeCode=null;element<HTMLDialogElement>('community-dialog').close();this.onChallenge();});
    element('challenge-accept').addEventListener('click',()=>this.acceptChallenge());
    element('board-submit').addEventListener('click',()=>void this.submit());
    element('board-remove').addEventListener('click',()=>void this.remove());
    element('discussion').addEventListener('click',()=>{
      element<HTMLTextAreaElement>('discussion-note').value='';
      text('discussion-status','');
      this.renderDiscussionPreview();
      element<HTMLDialogElement>('discussion-dialog').showModal();
    });
    element('discussion-note').addEventListener('input',()=>this.renderDiscussionPreview());
    element('discussion-close').addEventListener('click',()=>element<HTMLDialogElement>('discussion-dialog').close());
    element('discussion-copy').addEventListener('click',()=>void this.copyDiscussion());
    element('discussion-open').addEventListener('click',()=>{
      if(this.postedUrl) navigateTo(this.postedUrl);
    });
    element<HTMLButtonElement>('discussion-open').disabled=!this.enabled;
    this.controls();
    if(this.enabled) {
      void this.refresh();
      let code:string|null=null;
      try { code=parseRivalShareData(getShareData()); } catch { /* A normal post needs no share data. */ }
      if(code) { element<HTMLInputElement>('challenge-code').value=code; element<HTMLDetailsElement>('challenge-entry').open=true; void this.findChallenge(); }
    }
  }
  get isDemonstration():boolean { return this.demo; }
  get hasSession():boolean { return this.runId !== null; }
  async begin(practice:boolean):Promise<number> {
    ++this.runGeneration; this.busy=false;
    ++this.challengeGeneration;this.receivedChallenge=null;element('challenge-accept').hidden=true;element('challenge-today').hidden=true;
    text('challenge-invite-status','');element('challenge-invite-fallback').hidden=true;
    element<HTMLTextAreaElement>('challenge-invite-fallback').value='';
    this.hall.begin();
    this.demo=!practice && element<HTMLInputElement>('demo-mode').checked;
    ++this.boardGeneration;
    this.runId=null; this.trace=[]; this.finished=false; this.saved=false; this.verifiedScore=0; this.removed=false;
    this.day=utcDaySeed(new Date());
    if(!practice && !this.nextTarget && this.latestBoard?.day===this.day) this.nextTarget=defaultRival(this.latestBoard);
    if(this.enabled && !practice) {
      try {
        const session=await request<Start>('start','POST',{demo:this.demo});
        this.day=session.day; this.runId=session.runId; this.demo=session.demo;
      } catch { /* Keep the complete local game available during a platform outage. */ }
      {
        try {
          const board=await request<Board>(`board?day=${this.day}`);
          if(this.nextChallengeCode) {
            try {
              const response=await request<{target:ChallengeTarget}>(`challenge?code=${encodeURIComponent(this.nextChallengeCode)}`);
              this.nextTarget=response.target.day===this.day && response.target.rules===RULES_VERSION ? response.target : null;
            } catch { this.nextTarget=null; }
          } else if(this.nextTarget) this.nextTarget=refreshRival(this.nextTarget,board);
          this.latestBoard=board; this.boardUnavailable=false; this.renderLeader();
        } catch { this.nextTarget=null; this.latestBoard=null; this.boardUnavailable=true; }
      }
    }
    if(practice || this.demo) this.activeTarget=null;
    else this.activeTarget=this.nextTarget??(this.latestBoard?.day===this.day?defaultRival(this.latestBoard):null);
    if(this.activeTarget?.day!==this.day || this.activeTarget.rules!==RULES_VERSION) this.activeTarget=null;
    this.nextTarget=null; this.nextChallengeCode=null; this.renderLeader();
    this.controls(); return this.day;
  }
  record(step:TraceStep):void {
    if(!this.runId) return;
    if(this.trace.length>=MAX_TRACE_STEPS) { this.runId=null;this.trace=[];return; }
    this.trace.push(step);
  }
  finish(preview:string[]):void {
    this.finished=true; this.preview=preview;
    localizedValue(element<HTMLTextAreaElement>('discussion-preview'),preview);
    this.controls();
  }
  private controls():void {
    const eligible=this.finished&&!!this.runId&&!this.saved;
    element<HTMLButtonElement>('board-submit').disabled=this.busy||!eligible;
    element<HTMLButtonElement>('board-remove').disabled=this.busy||!this.enabled||!context?.userId;
    element<HTMLButtonElement>('board-refresh').disabled=this.busy;
    if(this.removed){text('challenge-invite-status','');element('challenge-invite-fallback').hidden=true;}
    element<HTMLButtonElement>('challenge-invite').disabled=!this.enabled||!this.saved||this.demo||this.removed||!this.runId;
    text('board-submit',this.removed?'本日排名已移除':this.saved?'本局戰績已提交':'提交本局戰績');
    element('result-board').classList.toggle('primary',eligible);
    element('result-board').classList.toggle('secondary',!eligible);
    element('retry').classList.toggle('primary',!eligible);
    element('retry').classList.toggle('secondary',eligible);
    text('result-board',eligible?'提交戰績，查看排名':'查看社群每日榜');
  }
  private async openBoard():Promise<void> {
    const dialog=element<HTMLDialogElement>('community-dialog');
    if(!dialog.open) dialog.showModal();
    await this.refresh();
  }
  private async refresh():Promise<void> {
    const generation=++this.boardGeneration;
    text('board-day',String(this.day)+' UTC');
    element('board-top').replaceChildren(); element('board-nearby').replaceChildren();
    text('board-me','');text('board-total','');
    if(!this.enabled) { text('board-status','社群排行榜請到 Reddit 遊戲貼文查看。本頁仍可挑戰本機紀錄。');return; }
    text('board-status','正在讀取今日排名…');
    try {
      const board=await request<Board>(`board?day=${this.day}`);
      if(generation!==this.boardGeneration) return;
      if(board.day!==this.day) throw new Error('version-mismatch');
      this.latestBoard=board; this.boardUnavailable=false; this.renderLeader();
      text('board-total',`今日 ${board.total} 位守城者`);
      text('board-status',board.total?'同分並列；每日僅計最高分。':'今天還沒有人上榜，來留下第一道防線。');
      text('board-me',board.me?[`你的排名：第 ${board.me.rank} 名 · ${board.me.score} 分`,board.gap?` · 再多 ${board.gap} 分超越上一名`:'']:context?.userId?
        (this.removed?'再玩一局，即可重新參加這一天的社群榜。':this.finished&&!this.runId?'本局未連上社群榜，仍可繼續本機遊玩。再玩一局即可重試連線。':'完成一局後，可選擇提交戰績。'):
        '登入 Reddit 後，可提交戰績；不登入也能繼續遊玩。');
      const nearby=nearbyEntries(board);
      element('board-nearby-section').hidden=nearby.length===0;
      for(const [id,rows] of [['board-top',board.top],['board-nearby',nearby]] as const) {
        for(const row of rows) {
          const item=document.createElement('li');
          item.classList.toggle('is-you',row.isYou);
          const place=document.createElement('span');place.textContent=`#${row.rank}`;
          const name=document.createElement('span');name.textContent=`u/${row.username}`;
          const points=document.createElement('strong');points.textContent=row.score.toLocaleString();
          item.append(place,name,points);
          if(row.isYou) { const you=document.createElement('small');localizedText(you,'你');item.append(you); }
          const challenge=document.createElement('button');
          challenge.type='button';challenge.className='rival-pick';
          localizedText(challenge,row.isYou?'挑戰自己的最佳':'挑戰此分數');
          localizedAttribute(challenge,'aria-label',`挑戰 u/${row.username} 的 ${row.score} 分`);
          challenge.addEventListener('click',()=>{
            this.nextChallengeCode=null;
            this.nextTarget=chooseRival(board,row);
            if(!this.nextTarget)return;
            element<HTMLDialogElement>('community-dialog').close();
            this.onChallenge();
          });
          item.append(challenge);
          element(id).append(item);
        }
      }
    } catch { if(generation===this.boardGeneration) { this.boardUnavailable=true; this.renderLeader(); text('board-status','暫時無法讀取排名，請稍後重新整理。你的本機戰績仍保留。'); } }
  }
  private async submit():Promise<void> {
    if(this.busy||!this.finished||!this.runId||this.saved)return;
    const runId=this.runId,day=this.day,demo=this.demo,generation=this.runGeneration;
    this.busy=true;this.controls();text('board-status','正在提交戰績…');
    try {
      const response=await request<{result:RunResult}>('submit','POST',{runId,trace:this.trace});
      if(generation!==this.runGeneration)return;
      if(response.result.day!==day || response.result.version!==RULES_VERSION || response.result.storm!==dailyStorm(this.day).id) throw new Error('version-mismatch');
      this.saved=true; this.verifiedScore=response.result.score;
      this.onVerified(response.result);
      this.hall.accepted(runId,response.result.score,demo);
      await this.refresh();
      if(generation!==this.runGeneration)return;
      text('board-status',demo?'示範戰績已確認，可選擇加入英雄館；不列入每日榜或競爭排名。':`已提交 ${response.result.score} 分，今日僅保留你的最高分。`);
    } catch(error) {
      if(generation!==this.runGeneration)return;
      const code=error instanceof Error?error.message:'';
      text('board-status',/expired-session|invalid-session/.test(code)?'本局提交期限已過，仍保留本機戰績。再玩一局即可參加社群榜。':
        /invalid-trace|invalid-duration|unfinished-run|trace-too-large/.test(code)?'本局無法列入社群排名，仍可保留本機戰績並繼續遊玩。':
        '戰績尚未確認儲存，請按提交重試。重試不會重複計分。');
    } finally {if(generation===this.runGeneration){this.busy=false;this.controls();}}
  }
  private async remove():Promise<void> {
    if(this.busy)return;
    const day=this.day,generation=this.runGeneration;
    this.busy=true;this.controls();
    try {
      await request(`entry?day=${day}`,'DELETE');
      if(generation!==this.runGeneration)return;
      this.removed=true;await this.refresh();
      if(generation!==this.runGeneration)return;
      text('board-status','已移除你在這一天的社群排名。本機紀錄仍保留。');
    } catch {
      if(generation===this.runGeneration)text('board-status','暫時無法移除排名，請稍後重試。');
    } finally {if(generation===this.runGeneration){this.busy=false;this.controls();}}
  }
  private async invite():Promise<void> {
    if(!this.enabled||!this.saved||this.demo||this.removed||!this.runId)return;
    const code=buildChallengeCode(this.day,this.runId);if(!code)return;
    const generation=this.runGeneration;
    const score=Math.max(this.verifiedScore,this.latestBoard?.day===this.day?this.latestBoard.me?.score??0:0);
    const message=renderCopy([`你能超過我在 ${this.day} UTC 的 ${score.toLocaleString('en-US')} 分嗎？`, '\n', '好友挑戰碼：', {literal:code}, '\n', '挑戰目標會以好友目前公開的本日最佳為準。', '\n', {literal:this.postedUrl}]);
    try {
      await navigator.clipboard.writeText(message);
      if(generation!==this.runGeneration||this.removed)return;
      text('challenge-invite-status','已複製挑戰碼與遊戲連結。朋友可在排行榜貼上挑戰碼，接受挑戰。');
    } catch {
      if(generation!==this.runGeneration||this.removed)return;
      const fallback=element<HTMLTextAreaElement>('challenge-invite-fallback');fallback.value=message;fallback.hidden=false;fallback.focus();fallback.select();
      text('challenge-invite-status','請複製下方挑戰碼與遊戲連結，再傳給朋友。');
    }
    try {await showShareSheet({title:'Last Shield',text:message,data:JSON.stringify({kind:'rival',code})});}catch{/* The visible copy result remains usable. */}
  }
  private async findChallenge():Promise<void> {
    const generation=++this.challengeGeneration;
    this.receivedChallenge=null;element('challenge-accept').hidden=true;element('challenge-today').hidden=true;
    const code=element<HTMLInputElement>('challenge-code').value.trim();
    if(!parseChallengeCode(code)){text('challenge-status','請貼上完整的好友挑戰碼。');return;}
    if(!this.enabled){text('challenge-status','接受好友挑戰請到 Reddit 遊戲貼文。');return;}
    const dialog=element<HTMLDialogElement>('community-dialog');if(!dialog.open)dialog.showModal();
    element<HTMLDetailsElement>('challenge-entry').open=true;
    text('challenge-status','正在確認好友的公開戰績…');
    try {
      const response=await request<{target:ChallengeTarget}>(`challenge?code=${encodeURIComponent(code)}`);
      if(generation!==this.challengeGeneration)return;
      const target=response.target;
      if(target.day!==parseChallengeCode(code)!.day||!['rival','personal'].includes(target.kind)||target.rules!==RULES_VERSION||!Number.isSafeInteger(target.score)||target.score<0||!/^[A-Za-z0-9_-]{1,32}$/.test(target.username))throw new Error('invalid-challenge');
      this.receivedChallenge={code,target};
      const today=utcDaySeed(new Date());
      localizedText(element('challenge-status'),target.day===today?['好友目標：',{literal:`u/${target.username} · ${target.score.toLocaleString('en-US')}`},' · ',String(target.day),' UTC']:['這是過去的挑戰；可改玩今日風暴。', ' ',{literal:`u/${target.username} · ${target.score.toLocaleString('en-US')} · ${target.day} UTC`}]);
      text('challenge-accept',target.day===today?'接受挑戰':'開始今日守城');element('challenge-accept').hidden=false;
      element('challenge-accept').focus();
    } catch {if(generation===this.challengeGeneration){text('challenge-status','找不到公開的挑戰戰績，可能已移除或過期。仍可挑戰今日風暴。');element('challenge-today').hidden=false;element('challenge-today').focus();}}
  }
  private acceptChallenge():void {
    const received=this.receivedChallenge;if(!received)return;
    this.nextTarget=received.target.day===utcDaySeed(new Date())?received.target:null;
    this.nextChallengeCode=this.nextTarget?received.code:null;
    element<HTMLDialogElement>('community-dialog').close();this.onChallenge();
  }
  private async copyDiscussion():Promise<void> {
    const copy=this.renderDiscussionPreview();
    try {await navigator.clipboard.writeText(copy);text('discussion-status','已複製。前往貼文後貼上，你可以再編輯並自行送出留言。');}
    catch {
      const preview=element<HTMLTextAreaElement>('discussion-preview');preview.focus();preview.select();
      text('discussion-status','請選取上方戰績與心得並複製，再到貼文留言。');
    }
  }
  private renderDiscussionPreview():string {
    const note=element<HTMLTextAreaElement>('discussion-note').value.trim();
    const preview=element<HTMLTextAreaElement>('discussion-preview');
    const code=this.saved&&!this.demo&&!this.removed&&this.runId?buildChallengeCode(this.day,this.runId):null;
    localizedValue(preview,[...this.preview,...(code?['\n','好友挑戰碼：',{literal:code}]:[]),...(note?['\n\n',{literal:note}]:[]),...(this.postedUrl?['\n',{literal:this.postedUrl}]:[])]);
    return preview.value;
  }
  leaderCopy():Parameters<typeof localizedText>[1] {
    const leader=this.latestBoard?.day===this.day?this.latestBoard.top[0]:null;
    return this.demo?'AI 示範 · 不列入競爭榜':!this.enabled?'今日最高：請到 Reddit 查看':this.boardUnavailable?'今日最高：暫時無法讀取':leader?['今日最高：', {literal:`${leader.score.toLocaleString('en-US')} · u/${leader.username}`},this.latestBoard!.leaderTies>1?` · ${this.latestBoard!.leaderTies} 位並列`:'']:'今日最高：尚無紀錄';
  }
  private renderLeader():void { localizedText(element('daily-leader'),this.leaderCopy()); }
  rivalCopy(score:number):string {
    const target=this.activeTarget,status=rivalStatus(target,this.day,RULES_VERSION,score);
    if(!target||!status)return '';
    const name=target.kind==='personal'?'個人最佳':`u/${target.username}`;
    return status.kind==='passed'?`本局已超過 ${name} 的 ${target.score} 分`:status.kind==='tied'?`追平 ${name} 的 ${target.score} 分`:`再得 ${status.gap} 分，超過 ${name}`;
  }
}
