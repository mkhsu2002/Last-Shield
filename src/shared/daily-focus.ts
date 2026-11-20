import { dailyStorm } from './daily-storm.ts';
export type FocusStats={bestCombo:number;perfect:number;cleared:number};
export type DailyFocus=Readonly<{day:number;metric:keyof FocusStats;title:string;guidance:string;target:number;stretch:number}>;
/** A common focus uses existing gameplay totals; it never changes ranked score or physics. */
export function dailyFocus(day:number):DailyFocus{
 const storm=dailyStorm(day),s=String(day),epoch=Math.floor(Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8))/86400000),tier=Math.floor(epoch/3)%3;
 if(storm.id==='relay')return {day,metric:'bestCombo',title:'今日共同挑戰：金色接力',guidance:'先守住一段連擊。擊碎後放開，再接下一顆。',target:[10,15,20][tier]!,stretch:[25,35,50][tier]!};
 if(storm.id==='crosswind')return {day,metric:'perfect',title:'今日共同挑戰：精準攔截',guidance:'快速核心來得更急；抓住金色，讓完美光束替你爭取時間。',target:[12,16,20][tier]!,stretch:[35,45,55][tier]!};
 return {day,metric:'cleared',title:'今日共同挑戰：城市清場',guidance:'累積擊碎數；把超載保留給擁擠的天空。',target:[20,25,30][tier]!,stretch:[45,60,75][tier]!};
}
export function focusProgress(goal:DailyFocus,stats:FocusStats){
 const raw=stats[goal.metric],current=Number.isFinite(raw)&&raw>=0?Math.floor(raw):0;
 const completed=current>=goal.target,stretchCompleted=current>=goal.stretch;
 return {current,completed,stretchCompleted,remaining:Math.max(0,(completed?goal.stretch:goal.target)-current),progress:Math.min(1,current/goal.stretch)};
}
export function nextResetMinutes(now:Date):number{
 const time=now.getTime();if(!Number.isFinite(time))throw new Error('invalid-date');
 return Math.ceil((Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1)-time)/60000);
}
