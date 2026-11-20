/** Splash production HTML only; clicks are tested in Reddit's real host separately. */
export async function runSplashQA(page,baseURL='http://127.0.0.1:4178') {
  if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL))throw Error('Local QA only');
  if(await page.evaluate(()=>document.visibilityState)!=='visible')throw Error('Activate the visible canonical lane tab before QA');
  const failures=[];let cases=0;
  for(const[width,height]of[[288,320],[344,320],[344,420],[344,512],[360,640],[375,594],[390,796],[880,320],[880,512],[320,240]])for(const language of['en','zh-Hant'])for(const textScale of[1,1.5,2]){
    cases++;await page.setViewportSize({width,height});await page.goto(baseURL+'/splash.html');await page.locator('.language-select').selectOption(language);
    await page.evaluate(s=>{const sizes=[...document.querySelectorAll('.eyebrow,.language-select,h1,p,button,small')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)*s]);for(const[e,n]of sizes)e.style.fontSize=n+'px'},textScale);
    const checks=await page.evaluate(()=>{const b=s=>document.querySelector(s).getBoundingClientRect(),start=b('#start'),brand=b('#splash-brand'),lang=b('.language-select'),title=b('#splash-title'),footer=b('.launch-actions');return{
      button:start.height>=44&&start.top>=0&&start.bottom<=innerHeight&&start.left>=0&&start.right<=innerWidth,
      brand:brand.right<=lang.left,title:!title.height||title.bottom<=footer.top+.5};});
    if(!Object.values(checks).every(Boolean))failures.push({width,height,language,textScale,checks});
  }
  const result={kind:'splash-size-and-text-stress',cases,failures};if(failures.length)throw Error(JSON.stringify(result));return result;
}
