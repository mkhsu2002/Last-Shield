/** Real cloud round-trip on the owner's existing private staging demo only.
 * Requires a naturally completed, verified demonstration in the active UI.
 * Never runs on production; restores the original callsign in finally. */
export async function runStageHallQA(page) {
  if(!page.url().startsWith('https://www.reddit.com/r/last_shield_stage/comments/'))throw Error('Private stage only');
  if(await page.evaluate(()=>document.visibilityState)!=='visible')throw Error('Visible canonical tab required');
  const f=page.frames().find(f=>f.url().includes('/game.html'));
  if(!f)throw Error('Open the existing staging game first');
  const read=()=>f.evaluate(async()=>{
    const r=await fetch('/api/community/hall'),v=await r.json();if(!r.ok||v.contract!=='community-3'||v.rules!=='survival-8')throw Error('Hall contract/read mismatch');
    const me=v.hall.me;return{username:me.certificate?.username,demo:me.demo,callsign:me.callsign??null,certificate:me.certificate?.id,score:me.certificate?.score};
  });
  const before=await read();
  if(before.username!=='OwnDifference7782'||!before.demo||before.callsign!=='K')throw Error('Existing owner demonstration baseline required; no write');
  const settled=()=>f.waitForFunction(()=>{
    const status=document.querySelector('#hall-status').textContent;
    return !document.querySelector('#hall-consent').checked&&!document.querySelector('#hall-remove').disabled&&(status.includes('now in the Hall')||status.includes('已加入英雄館'));
  },null,{timeout:15000});
  let changed=false,cleared;
  try{
    await f.locator('#hall-callsign').fill('');await f.locator('#hall-consent').check();
    if(await f.locator('#hall-enroll').isDisabled())throw Error('A verified demonstration proof is required; no write');
    changed=true;
    await f.locator('#hall-enroll').click();await settled();cleared=await read();
    if(cleared.callsign!==null||cleared.certificate!==before.certificate||cleared.score!==before.score)throw Error('Cloud clear mismatch');
  }finally{
    if(changed){await f.locator('#hall-callsign').fill(before.callsign);await f.locator('#hall-consent').check();await f.locator('#hall-enroll').click();await settled();}
  }
  const restored=await read();if(JSON.stringify(restored)!==JSON.stringify(before))throw Error('Cloud restoration mismatch');
  return{kind:'real-private-stage-cloud-roundtrip',before,cleared,restored};
}
