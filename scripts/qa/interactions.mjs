/** Trusted keyboard, mouse and emulated touch, without modifying gameplay state.
 * Local preview only; emulated touch is not an Android/iOS device result. */
export async function runInteractionQA(page,baseURL='http://localhost:4173') {
  if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL))throw Error('Local QA only');
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  await page.setViewportSize({width:390,height:612});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(baseURL);
  await page.locator('#language').selectOption('en');
  await page.locator('.demo-options summary').focus();await page.keyboard.press('Space');
  check(await page.locator('.demo-options').getAttribute('open')!==null,'Space must open summary');
  await page.keyboard.press('Space');check(await page.locator('.demo-options').getAttribute('open')===null,'Space must close summary');
  await page.locator('#sound').click();check(await page.locator('#sound').getAttribute('aria-pressed')==='false','mute');
  await page.locator('#sound').click();check(await page.locator('#sound').getAttribute('aria-pressed')==='true','unmute');
  await page.locator('#practice').click();await page.waitForFunction(()=>document.querySelector('.interface').dataset.timing==='perfect');
  const cdp=await page.context().newCDPSession(page);let trustedTouch=false;
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    await page.evaluate(()=>{window.__qaTouch=false;document.getElementById('fire').addEventListener('pointerdown',e=>{window.__qaTouch=e.isTrusted&&e.pointerType==='touch'},{once:true});});
    const b=await page.locator('#fire').boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1,radiusX:2,radiusY:2,force:1}]});
    await page.waitForTimeout(3200);check(await page.locator('#practice-continue').isDisabled(),'held touch must gate Continue');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
    trustedTouch=await page.evaluate(()=>window.__qaTouch);check(trustedTouch,'trusted touch event');check(await page.locator('#practice-continue').isEnabled(),'released touch must enable Continue');
  } finally {await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();}
  const timing=await page.locator('#practice-review-explanation').innerText();check(timing.includes('caught gold'),'timing lesson passed');
  await page.locator('#practice-continue').click();await page.locator('#practice-next').click();await page.waitForFunction(()=>document.querySelector('.interface').dataset.timing==='perfect');
  await page.locator('#fire').focus();for(let i=0;i<2;i++){await page.keyboard.down('Space');await page.waitForTimeout(1300);await page.keyboard.up('Space');await page.waitForTimeout(60);}
  await page.waitForTimeout(1900);const relay=await page.locator('#practice-review-explanation').innerText();check(relay.includes('first clear'),'keyboard relay passed');
  await page.locator('#practice-continue').click();await page.locator('#practice-next').click();await page.locator('#pause').click();
  const paused=await page.locator('#clock').innerText();await page.waitForTimeout(400);check(await page.locator('#clock').innerText()===paused,'pause shield stable');
  await page.locator('#language').selectOption('zh-Hant');check((await page.locator('.pause-run-details').innerText()).includes('本局資訊'),'pause Chinese');await page.locator('#language').selectOption('en');
  await page.setViewportSize({width:1420,height:660});await page.locator('#resume').click();await page.waitForTimeout(100);await page.locator('#pause').click();await page.setViewportSize({width:390,height:612});await page.locator('#resume').click();
  await page.waitForFunction(()=>{const t=document.querySelector('#approach-compact').textContent;return /s$/.test(t)&&parseFloat(t)<=.9},null,{timeout:12000});await page.locator('#overdrive').click();await page.waitForTimeout(2000);
  const overdrive=await page.locator('#practice-review-explanation').innerText();check(overdrive.includes('saved your charge'),'Overdrive passed');
  await page.locator('#practice-continue').click();await page.locator('#practice-start').click();
  const frames=await page.evaluate(()=>new Promise(resolve=>{const times=[];let last;function tick(now){if(last!==undefined)times.push(now-last);last=now;if(times.length===180){times.sort((a,b)=>a-b);resolve({samples:times.length,medianMs:times[90],p95Ms:times[171],maxMs:times.at(-1)});}else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
  await page.waitForFunction(()=>document.querySelector('.interface').dataset.state==='breaking',null,{timeout:20000});
  check(await page.locator('#clock').innerText()==='0%','breaking HUD must display zero health');
  await page.waitForFunction(()=>document.querySelector('.interface').dataset.state==='results',null,{timeout:4000});
  const resultPanel=await page.locator('#results').boundingBox();check(resultPanel.y>=0&&resultPanel.y+resultPanel.height<=613,'results fit');
  await page.locator('#discussion').click();
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('QA denied')}}});});
  const expectedPreview=await page.locator('#discussion-preview').inputValue();
  await page.locator('#discussion-copy').click();
  await page.waitForFunction(()=>document.querySelector('#discussion-status').textContent.includes('Select and copy'));
  const fallback=await page.locator('#discussion-status').innerText();
  check(await page.locator('#discussion-preview').isVisible(),'clipboard fallback textarea visible');
  check(expectedPreview.length>0&&await page.locator('#discussion-preview').inputValue()===expectedPreview,'clipboard fallback preserves actual result');
  await page.locator('#discussion-close').click();await page.locator('#result-hall').click();
  const hall=await page.locator('#hall-status').innerText();check(hall.includes('Reddit'),'standalone Hall explains availability');await page.locator('#hall-close').click();
  const english=await page.locator('body').innerText();check(!/[\u3400-\u9fff]/.test(english.replaceAll('繁中','')),'visible English UI contains Chinese');
  await page.emulateMedia({reducedMotion:'no-preference'});
  return {kind:'local-native-input-and-recovery',trustedEmulatedTouch:trustedTouch,physicalDevice:false,summaryKeyboard:true,mute:true,breakingHealth:0,timing,relay,overdrive,resultPanel,clipboardFallback:fallback,frames,visibleEnglishCopy:true};
}
