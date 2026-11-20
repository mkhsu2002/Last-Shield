/** Bounded native-keyboard automation driven only by visible HUD cues.
 * Local demonstration only; no engine access, fake clock, state or score writes. */
export async function runSoakChunk(page,{baseURL='http://localhost:4173',start=true,durationMs=20000}={}) {
  if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL)||durationMs>25000)throw Error('Local bounded QA only');
  if(await page.evaluate(()=>document.visibilityState)!=='visible')throw Error('Activate the visible canonical lane tab before QA');
  if(start){
    await page.setViewportSize({width:390,height:612});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(baseURL);await page.locator('#language').selectOption('en');
    await page.locator('.demo-options summary').click();await page.locator('#demo-mode').check();await page.locator('#start').click();await page.locator('#game-container').focus();
    await page.evaluate(()=>{
      window.__qaSoak={times:[],last:null,raf:null,maxWave:0};
      function frame(now){const s=window.__qaSoak;if(document.visibilityState==='visible'&&document.querySelector('.interface').dataset.state==='playing'){if(s.last!==null)s.times.push(now-s.last);s.last=now;}else s.last=null;s.raf=requestAnimationFrame(frame);}window.__qaSoak.raf=requestAnimationFrame(frame);
    });
  }
  if(!start&&await page.locator('.interface').getAttribute('data-state')==='paused'){await page.locator('#resume').click();await page.locator('#game-container').focus();}
  let held=false;const until=Date.now()+durationMs;
  try{
    while(Date.now()<until){
      const s=await page.evaluate(()=>{const ui=document.querySelector('.interface'),d=ui.dataset;return{state:d.state,timing:d.timing,firing:d.firing,energy:d.energy,danger:d.danger,label:document.getElementById('fire-label').textContent,near:parseFloat(document.getElementById('approach-compact').textContent),wave:document.getElementById('wave').textContent};});
      if(s.state!=='playing')break;
      if(held&&(s.firing==='false'||s.label.startsWith('Release'))){await page.keyboard.up('Space');held=false;}
      if(s.energy==='ready'&&(s.near<.9||s.danger==='high')){if(held){await page.keyboard.up('Space');held=false;}await page.keyboard.press('KeyE');}
      else if(!held&&s.timing==='perfect'){await page.keyboard.down('Space');held=true;}
      await page.waitForTimeout(12);
    }
  }finally{await page.keyboard.up('Space');}
  if(await page.locator('.interface').getAttribute('data-state')==='playing')await page.keyboard.press('Escape');
  return page.evaluate(()=>{
    const s=window.__qaSoak,ui=document.querySelector('.interface');const t=[...s.times].sort((a,b)=>a-b);
    return{kind:'native-keyboard-local-demo-soak',state:ui.dataset.state,wave:document.getElementById('wave').textContent,score:document.getElementById('score').textContent,health:document.getElementById('clock').textContent,frames:{samples:t.length,medianMs:t[Math.floor(t.length*.5)],p95Ms:t[Math.floor(t.length*.95)],maxMs:t.at(-1)},demoLabel:document.getElementById('daily-leader').textContent};
  });
}
