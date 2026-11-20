import { context, navigateTo } from '@devvit/web/client';
import { utcDaySeed, RULES_VERSION } from '../shared/game-logic';
import { COMMUNITY_CONTRACT, MAX_TRACE_STEPS, type Board, type RunResult, type TraceStep } from '../shared/community';
import { element, text } from './game-ui';
import { localizedText, localizedValue, localizedAttribute } from './i18n';
import { dailyStorm, type StormId } from '../shared/daily-storm';
import { chooseRival, defaultRival, refreshRival, rivalStatus, nearbyEntries, type RivalTarget } from './rival';

type Start = {contract:string;rules:string;day:number;storm:StormId;runId:string|null};
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
  private finished=false;
  private busy=false;
  private saved=false;
  private removed=false;
  private boardGeneration=0;
  private preview:string[]=[];
  private latestBoard:Board|null=null;
  private nextTarget:RivalTarget|null=null;
  private activeTarget:RivalTarget|null=null;
  private postedUrl=context?.postId?`https://www.reddit.com/comments/${context.postId.replace(/^t3_/,'')}`:'';
  constructor(private readonly onChallenge:()=>void) {
    element('intro-board').addEventListener('click',()=>void this.openBoard());
    element('result-board').addEventListener('click',()=>void this.openBoard());
    element('board-close').addEventListener('click',()=>element<HTMLDialogElement>('community-dialog').close());
    element('board-refresh').addEventListener('click',()=>void this.refresh());
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
    if(this.enabled) void this.refresh();
  }
  async begin(practice:boolean):Promise<number> {
    ++this.boardGeneration;
    this.runId=null; this.trace=[]; this.finished=false; this.saved=false; this.removed=false;
    this.day=utcDaySeed(new Date());
    if(!practice && !this.nextTarget && this.latestBoard?.day===this.day) this.nextTarget=defaultRival(this.latestBoard);
    if(this.enabled && !practice) {
      try {
        const session=await request<Start>('start','POST');
        this.day=session.day; this.runId=session.runId;
      } catch { /* Keep the complete local game available during a platform outage. */ }
      if(this.nextTarget) {
        try {
          const board=await request<Board>(`board?day=${this.day}`);
          this.nextTarget=refreshRival(this.nextTarget,board);
          this.latestBoard=board;
        } catch { this.nextTarget=null; this.latestBoard=null; }
      }
    }
    if(practice) this.activeTarget=null;
    else this.activeTarget=this.nextTarget??(this.latestBoard?.day===this.day?defaultRival(this.latestBoard):null);
    if(this.activeTarget?.day!==this.day || this.activeTarget.rules!==RULES_VERSION) this.activeTarget=null;
    this.nextTarget=null;
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
      this.latestBoard=board;
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
            this.nextTarget=chooseRival(board,row);
            if(!this.nextTarget)return;
            element<HTMLDialogElement>('community-dialog').close();
            this.onChallenge();
          });
          item.append(challenge);
          element(id).append(item);
        }
      }
    } catch { if(generation===this.boardGeneration) text('board-status','暫時無法讀取排名，請稍後重新整理。你的本機戰績仍保留。'); }
  }
  private async submit():Promise<void> {
    if(this.busy||!this.finished||!this.runId||this.saved)return;
    this.busy=true;this.controls();text('board-status','正在提交戰績…');
    try {
      const response=await request<{result:RunResult}>('submit','POST',{runId:this.runId,trace:this.trace});
      if(response.result.day!==this.day || response.result.version!==RULES_VERSION || response.result.storm!==dailyStorm(this.day).id) throw new Error('version-mismatch');
      this.saved=true;
      await this.refresh();
      text('board-status',`已提交 ${response.result.score} 分，今日僅保留你的最高分。`);
    } catch(error) {
      const code=error instanceof Error?error.message:'';
      text('board-status',/expired-session|invalid-session/.test(code)?'本局提交期限已過，仍保留本機戰績。再玩一局即可參加社群榜。':
        /invalid-trace|invalid-duration|unfinished-run|trace-too-large/.test(code)?'本局無法列入社群排名，仍可保留本機戰績並繼續遊玩。':
        '戰績尚未確認儲存，請按提交重試。重試不會重複計分。');
    } finally {this.busy=false;this.controls();}
  }
  private async remove():Promise<void> {
    if(this.busy)return;this.busy=true;this.controls();
    try { await request(`entry?day=${this.day}`,'DELETE');this.removed=true;await this.refresh();text('board-status','已移除你在這一天的社群排名。本機紀錄仍保留。'); }
    catch {text('board-status','暫時無法移除排名，請稍後重試。');}
    finally {this.busy=false;this.controls();}
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
    localizedValue(preview,[...this.preview,...(note?['\n\n',{literal:note}]:[]),...(this.postedUrl?['\n',{literal:this.postedUrl}]:[])]);
    return preview.value;
  }
  rivalCopy(score:number):string {
    const target=this.activeTarget,status=rivalStatus(target,this.day,RULES_VERSION,score);
    if(!target||!status)return '';
    const name=target.kind==='personal'?'個人最佳':`u/${target.username}`;
    return status.kind==='passed'?`本局已超過 ${name} 的 ${target.score} 分`:status.kind==='tied'?`追平 ${name} 的 ${target.score} 分`:`再得 ${status.gap} 分，超過 ${name}`;
  }
}
