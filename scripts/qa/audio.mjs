/** Offline rendering of production scheduling functions, no device-listening claim. */
export async function runAudioQA(page,devURL='http://127.0.0.1:4177') {
  if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(devURL))throw Error('Local QA only');
  await page.goto(devURL+'/scripts/qa/harness.html');
  return page.evaluate(async()=>{
    const {createMasterBus,scheduleImpact,scheduleOverdrive}=await import('/src/client/audio.ts');
    const results=[];
    for(const mode of ['impact-left','impact-right','overdrive','overlap']){
      const ctx=new OfflineAudioContext(2,96000,48000),bus=createMasterBus(ctx);
      if(mode==='impact-left')scheduleImpact(ctx,bus,34,-.8);
      if(mode==='impact-right')scheduleImpact(ctx,bus,34,.8);
      if(mode==='overdrive'||mode==='overlap')scheduleOverdrive(ctx,bus);
      if(mode==='overlap')for(const pan of [-1,0,1])scheduleImpact(ctx,bus,34,pan);
      const buffer=await ctx.startRendering(),l=buffer.getChannelData(0),r=buffer.getChannelData(1);
      let peak=0,l2=0,r2=0,d2=0,clipped=0;
      for(let i=0;i<l.length;i++){peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));l2+=l[i]**2;r2+=r[i]**2;d2+=(l[i]-r[i])**2;if(Math.abs(l[i])>=1||Math.abs(r[i])>=1)clipped++;}
      const row={mode,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,peak,rmsLeft:Math.sqrt(l2/l.length),rmsRight:Math.sqrt(r2/l.length),stereoDifference:Math.sqrt(d2/l.length),clipped};
      if(peak>=1||clipped||row.stereoDifference<=0)throw Error(JSON.stringify(row));results.push(row);
    }
    return{kind:'offline-production-audio-render',physicalListening:false,results};
  });
}
