/** Replay through an authorized canonical-lane MCP page; never launches a browser.
 * Local production preview only. Text scaling is stress simulation, not OS text size. */
export async function runLayoutQA(page,baseURL='http://localhost:4173') {
  if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL))throw Error('Local QA only');
  const sizes=[[320,480],[360,600],[390,612],[390,796],[430,820],[667,375],[724,596],[768,768],[1420,660]];
  const failures=[],widths=[];let cases=0;
  const check=(ok,name,meta)=>{if(!ok)failures.push({name,...meta});};
  for(const [width,height] of sizes)for(const language of ['en','zh-Hant'])for(const textScale of [1,1.5,2]) {
    const meta={width,height,language,textScale};cases++;
    await page.setViewportSize({width,height});await page.goto(baseURL);await page.locator('#language').selectOption(language);
    await page.evaluate(s=>{
      const sizes=[...document.querySelectorAll('.topbar h1,.tools select,.tools button,.intro-copy,.intro-copy h2,.intro-copy p,.intro-copy .chapter,.launch-card p,.launch-card strong,.launch-card .eyebrow,.launch-card .fineprint,.launch-card button,.launch-card summary')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)*s]);
      for(const [e,n] of sizes)e.style.fontSize=n+'px';
    },textScale);
    const intro=await page.evaluate(()=>{
      const b=s=>document.querySelector(s).getBoundingClientRect(),header=b('.topbar'),copy=b('.intro-copy'),card=b('.launch-card'),menu=b('#intro');
      return {compact:matchMedia('(max-width:639px),(max-aspect-ratio:1/1)').matches,headerOverlap:header.bottom>copy.top+.5,cardOverlap:card.top<copy.bottom-.5,menuBottom:menu.bottom};
    });
    if(intro.compact){check(!intro.headerOverlap,'intro-header-overlap',meta);check(!intro.cardOverlap,'intro-card-overlap',meta);check(intro.menuBottom<=height+1,'intro-outside-viewport',meta);}
    await page.locator('#practice').scrollIntoViewIfNeeded();await page.locator('#practice').click();
    // Reload removes intro-only stress before applying each combat size exactly once.
    await page.goto(baseURL);await page.locator('#language').selectOption(language);await page.locator('#practice').click();
    await page.evaluate(s=>{
      const sizes=[...document.querySelectorAll('.topbar h1,.tools select,.tools button,.run-hud .label,.health-block strong,#score-short,.stats-row span,.daily-leader,#cue,#feedback,#fire-label,#overdrive > span')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)*s]);
      for(const[e,n]of sizes)e.style.fontSize=n+'px';
    },textScale);await page.waitForTimeout(100);
    const battle=await page.evaluate(()=>{
      const b=s=>document.querySelector(s).getBoundingClientRect(),a=b('#battlefield'),c=b('canvas'),hud=b('#run-hud'),act=b('#action');
      return {compact:matchMedia('(max-width:639px),(max-aspect-ratio:1/1)').matches,fill:c.width/a.width,expectedFill:Math.min(1,a.height*540/500/a.width),overlap:a.top<hud.bottom-.5||a.bottom>act.top+.5,
        visible:[568,832,880].every(y=>{const p=c.top+y/1080*c.height;return p>=a.top-.5&&p<=a.bottom+.5}),ratio:c.width/c.height,
        badButtons:['fire','overdrive','language','sound','pause'].filter(id=>{const r=b('#'+id);return r.width<44||r.height<44||r.left<0||r.right>innerWidth+1||r.top<0||r.bottom>innerHeight+1;})};
    });
    check(!battle.badButtons.length,'combat-controls', {...meta,buttons:battle.badButtons});check(Math.abs(battle.ratio-.5)<.01,'canvas-distortion',meta);
    if(battle.compact){check(!battle.overlap,'arena-overlap',meta);check(battle.visible,'shield-city-clipped',meta);check(Math.abs(battle.fill-battle.expectedFill)<.01,'arena-width',meta);}
    if(battle.compact){
      const longScore=await page.evaluate(()=>{
        const score=document.getElementById('score-short'),old=score.textContent;score.textContent='99.99M';
        const health=document.querySelector('.health-block').getBoundingClientRect(),points=document.querySelector('.score-block').getBoundingClientRect();
        const overlap=health.left<points.right&&health.right>points.left&&health.top<points.bottom&&health.bottom>points.top;
        const result=!overlap&&points.right<=innerWidth&&health.left>=0;score.textContent=old;return result;
      });
      check(longScore,'long-score-display-fixture',meta);
    }
    if(width<640&&textScale===1&&language==='en')widths.push({width,height,fill:battle.fill});
    await page.locator('#pause').click();
    const pause=await page.evaluate(()=>{const h=document.querySelector('.topbar').getBoundingClientRect(),p=document.querySelector('#paused').getBoundingClientRect();return{top:p.top,bottom:p.bottom,headerBottom:h.bottom};});
    if(battle.compact){check(pause.top>=pause.headerBottom,'pause-header-overlap',meta);check(pause.bottom<=height+1,'pause-outside-viewport',meta);}
    await page.locator('#resume').scrollIntoViewIfNeeded();await page.locator('#resume').click();await page.locator('#pause').click();
  }
  const result={kind:'browser-size-and-text-stress',cases,screenStates:cases*3,widths,failures};
  if(failures.length)throw Error(JSON.stringify(result));return result;
}
