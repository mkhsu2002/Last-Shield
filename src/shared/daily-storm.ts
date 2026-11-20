export type StormId = 'relay' | 'crosswind' | 'heavy';
export type DailyStorm = Readonly<{
  id: StormId; title: string; description: string; relayMs: number; heavyScoreMultiplier: number;
}>;
const profiles: readonly DailyStorm[] = [
  Object.freeze({id:'relay',title:'接力天幕',description:'金色接力更長，重型核心需要更久才能擊碎。',relayMs:950,heavyScoreMultiplier:1.5}),
  Object.freeze({id:'crosswind',title:'交錯疾風',description:'快速核心來得更急，也更容易擊碎。先選好你的目標。',relayMs:750,heavyScoreMultiplier:1.5}),
  Object.freeze({id:'heavy',title:'重核雨',description:'更多重型核心，擊碎可得更高分。小心其他逼近的威脅。',relayMs:750,heavyScoreMultiplier:1.75}),
];
function utcDate(day:number):Date {
  const value=String(day);
  if(!Number.isSafeInteger(day)||!/^\d{8}$/.test(value)) throw new Error('invalid-day');
  const year=Number(value.slice(0,4)),month=Number(value.slice(4,6)),date=Number(value.slice(6,8));
  const parsed=new Date(Date.UTC(year,month-1,date));
  if(year<1970 || parsed.getUTCFullYear()!==year || parsed.getUTCMonth()!==month-1 || parsed.getUTCDate()!==date) throw new Error('invalid-day');
  return parsed;
}
export function dailyStorm(day:number):DailyStorm {
  return profiles[Math.floor(utcDate(day).getTime()/86400000)%profiles.length]!;
}
export function nextChallengeDay(day:number):number {
  const date=utcDate(day);date.setUTCDate(date.getUTCDate()+1);
  const result=date.getUTCFullYear()*10000+(date.getUTCMonth()+1)*100+date.getUTCDate();
  utcDate(result);
  return result;
}
