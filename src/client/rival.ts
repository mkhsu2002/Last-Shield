import type { Board, BoardEntry } from '../shared/community.ts';
export type RivalTarget = Readonly<{username:string;score:number;day:number;rules:string;kind:'rival'|'personal'}>;
function snapshot(board:Board,row:BoardEntry):RivalTarget {
  return Object.freeze({username:row.username,score:row.score,day:board.day,rules:board.rules,kind:row.isYou?'personal':'rival'});
}
export function chooseRival(board:Board,row:BoardEntry):RivalTarget|null {
  const found=[...board.top,...board.nearby,...(board.me?[board.me]:[])].find(r=>r.username===row.username && r.score===row.score);
  return found && Number.isSafeInteger(found.score) && found.score>=0 ? snapshot(board,found):null;
}
export function defaultRival(board:Board):RivalTarget|null {
  if(!board.me) return null;
  const higher=[...board.top,...board.nearby].filter(r=>!r.isYou && r.score>board.me!.score).sort((a,b)=>a.score-b.score)[0];
  return higher?snapshot(board,higher):snapshot(board,board.me);
}
export function refreshRival(target:RivalTarget|null,board:Board):RivalTarget|null {
  if(!target || target.day!==board.day || target.rules!==board.rules) return null;
  const row=[...board.top,...board.nearby,...(board.me?[board.me]:[])].find(r=>r.username===target.username);
  return row?chooseRival(board,row):null;
}
export function rivalStatus(target:RivalTarget|null,day:number,rules:string,score:number):{kind:'chasing'|'tied'|'passed';gap:number}|null {
  if(!target || target.day!==day || target.rules!==rules || !Number.isFinite(score)) return null;
  return {kind:score>target.score?'passed':score===target.score?'tied':'chasing',gap:Math.max(0,target.score-score+1)};
}
