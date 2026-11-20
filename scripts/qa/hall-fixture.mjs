/** Isolated controller fixture. No Reddit connection, credentials or real writes.
 * Run only against the local Vite server through the authorized browser lane. */
export async function runHallFixture(page,devURL='http://127.0.0.1:4177') {
  if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(devURL))throw Error('Local fixture only');
  if(await page.evaluate(()=>document.visibilityState)!=='visible')throw Error('Activate the visible canonical lane tab before QA');
  await page.goto(`${devURL}/scripts/qa/harness.html`);
  return page.evaluate(async()=>{
    const {mountGameUI}=await import('/src/client/game-ui.ts');
    const {HallController}=await import('/src/client/hall.ts');
    const {setLanguage}=await import('/src/client/i18n.ts');
    mountGameUI();setLanguage('en',false);
    const empty={season:'survival-8',champions:[],topScores:[],topCombos:[],million:[],historyCursor:null,me:{enrolled:false,demo:false,certificate:null}};
    const enrolled={...empty,me:{enrolled:true,demo:false,callsign:undefined,certificate:null}};
    let posted=false,payload=null,followupReads=0;
    const originalFetch=window.fetch;
    window.fetch=async(url,init)=>{
      if(String(url)==='/api/community/hall/enroll'&&init?.method==='POST') {
        posted=true;payload=JSON.parse(init.body);
        return Response.json({contract:'community-3',rules:'survival-8',hall:enrolled});
      }
      if(String(url)==='/api/community/hall') {
        if(posted){followupReads++;return Response.json({error:'unavailable'},{status:503});}
        return Response.json({contract:'community-3',rules:'survival-8',hall:empty});
      }
      throw Error('Unexpected fixture request: '+url);
    };
    try {
      const controller=new HallController();
      // Configure this isolated controller as an enabled local unit fixture.
      controller.enabled=true;
      controller.accepted('fixture-proof',42,false);
      await controller.open();
      document.getElementById('hall-callsign').value='';
      document.getElementById('hall-consent').checked=true;
      await controller.enroll();
      const result={kind:'isolated-controller-fixture',posted,payload,followupReads,removeEnabled:!document.getElementById('hall-remove').disabled,status:document.getElementById('hall-status').textContent};
      if(!result.removeEnabled||payload?.callsign!=='')throw Error(JSON.stringify(result));
      return result;
    } finally {window.fetch=originalFetch;}
  });
}
