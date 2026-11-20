import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Board } from '../shared/community.ts';
import { COMMUNITY_CONTRACT } from '../shared/community.ts';
import { RULES_VERSION } from '../shared/game-logic.ts';
import { chooseRival, defaultRival, refreshRival, rivalStatus, nearbyEntries } from './rival.ts';

const board:Board={contract:COMMUNITY_CONTRACT,rules:RULES_VERSION,storm:'relay',day:20261119,total:3,
  top:[{username:'Leader',score:900,rank:1,isYou:false},{username:'Near',score:500,rank:2,isYou:false},{username:'Me',score:300,rank:3,isYou:true}],
  nearby:[],me:{username:'Me',score:300,rank:3,isYou:true},gap:201};
test('choosing an actual rival records a day-scoped snapshot without claiming a rank',()=>{
  const target=chooseRival(board,board.top[1]!);
  assert.equal(target?.score,500);assert.equal(target?.username,'Near');
  assert.equal(rivalStatus(target,20261119,RULES_VERSION,499)?.kind,'chasing');
  assert.equal(rivalStatus(target,20261119,RULES_VERSION,500)?.kind,'tied');
  assert.equal(rivalStatus(target,20261119,RULES_VERSION,501)?.kind,'passed');
  assert.equal(rivalStatus(target,20261120,RULES_VERSION,900),null);
  assert.equal(rivalStatus(target,20261119,'old-rules',900),null);
});
test('forged, removed and stale rivals are not carried into a new run',()=>{
  assert.equal(chooseRival(board,{username:'Fake',score:1,rank:1,isYou:false}),null);
  const target=chooseRival(board,board.top[1]!);
  assert.equal(refreshRival(target,{...board,top:[board.top[0]!]}),null);
  assert.equal(refreshRival(target,{...board,day:20261120}),null);
  assert.equal(refreshRival(target,{...board,rules:'old-rules'}),null);
  const raised={...board,top:board.top.map(r=>r.username==='Near'?{...r,score:600}:r)};
  assert.equal(refreshRival(target,raised)?.score,600);
});
test('default target is the next higher score or an existing personal best',()=>{
  assert.equal(defaultRival(board)?.username,'Near');
  const first={...board,me:{...board.me!,rank:1,score:1000}};
  assert.equal(defaultRival(first)?.kind,'personal');
  assert.equal(defaultRival({...board,me:null}),null);
  assert.equal(defaultRival({...board,total:0,top:[],nearby:[],me:null}),null);
});
test('nearby section does not duplicate entries already visible in the top ten',()=>{
  assert.deepEqual(nearbyEntries({...board,nearby:board.top}),[]);
  const distant={username:'OutsideTop',score:100,rank:11,isYou:false};
  assert.deepEqual(nearbyEntries({...board,nearby:[board.top[2]!,distant]}),[distant]);
});
