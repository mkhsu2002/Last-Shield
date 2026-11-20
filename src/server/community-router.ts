import type { CertificateImageService } from './certificate-image.ts';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { CommunityService, envelope, type Actor } from './community-service.ts';

export function createCommunityRouter(community:CommunityService, actor:(includeUsername?:boolean)=>Promise<Actor>,images?:CertificateImageService):Hono {
  const app=new Hono();
  app.use('/api/*', bodyLimit({maxSize:3*1024*1024,
    onError:c=>c.json({...envelope,error:'trace-too-large'},413)}));
  app.use('/api/*',async(c,next)=>{c.header('Cache-Control','no-store');await next();});
  app.onError((error,c)=>{
    const code=error.message;
    const allowed=['login-required','invalid-context','rate-limited','invalid-session','expired-session',
      'invalid-trace','invalid-duration','unfinished-run','invalid-day','retry-submit','invalid-request',
      'consent-required','invalid-callsign','invalid-certificate','certificate-unavailable','revoked-run','mode-mismatch','invalid-image','image-processing','image-unavailable'];
    if(!allowed.includes(code)) console.error('Community storage unavailable');
    return c.json({...envelope,error:allowed.includes(code)?code:'unavailable'},
      code==='login-required'?401:code==='rate-limited'?429:code==='certificate-unavailable'?404:code==='image-unavailable'?503:code==='image-processing'?429:allowed.includes(code)?400:503);
  });
  app.post('/api/community/start',async(c)=>{
    let body:Record<string,unknown>={};
    if(c.req.header('content-type')?.includes('application/json')){
      try{body=await c.req.json();}catch{throw new Error('invalid-request');}
      if(!body||typeof body!=='object'||Object.keys(body).some(k=>k!=='demo')||('demo' in body&&typeof body.demo!=='boolean'))throw new Error('invalid-request');
    }
    return c.json(await community.start(await actor(true),{demo:body.demo===true}));
  });
  app.get('/api/community/board',async(c)=>c.json(await community.board(Number(c.req.query('day')),(await actor()).userId)));
  app.post('/api/community/submit',async(c)=>{
    let body:unknown;
    try{body=await c.req.json();}catch{throw new Error('invalid-request');}
    if(!body||typeof body!=='object'||!('runId' in body)||typeof body.runId!=='string'||!('trace' in body))throw new Error('invalid-request');
    const result=await community.submit(await actor(),body.runId,body.trace);
    const {userId:_owner,...publicResult}=result;
    return c.json({...envelope,result:publicResult});
  });
  app.delete('/api/community/entry',async(c)=>{
    await community.remove(Number(c.req.query('day')),(await actor()).userId);
    return c.json({...envelope,removed:true});
  });
  app.get('/api/community/hall',async(c)=>{
    const before=c.req.query('before');
    return c.json({...envelope,hall:await community.hall.list((await actor()).userId,before===undefined?undefined:Number(before))});
  });
  app.post('/api/community/hall/enroll',async(c)=>{
    let body:unknown;try{body=await c.req.json();}catch{throw new Error('invalid-request');}
    if(!body||typeof body!=='object'||!('runId' in body)||typeof body.runId!=='string')throw new Error('invalid-request');
    if(!('publicConsent' in body)||body.publicConsent!==true)throw new Error('consent-required');
    if(('callsign' in body&&typeof body.callsign!=='string')||Object.keys(body).some(k=>!['runId','callsign','publicConsent'].includes(k)))throw new Error('invalid-request');
    const owner=await actor();
    await community.enroll(owner,body.runId,'callsign' in body?body.callsign as string:undefined);
    return c.json({...envelope,hall:await community.hall.list(owner.userId)});
  });
  app.delete('/api/community/hall',async(c)=>{
    const owner=await actor();if(!owner.userId)throw new Error('login-required');
    await community.hall.withdraw(owner.userId);return c.json({...envelope,removed:true});
  });
  app.post('/api/community/hall/certificate/image',async(c)=>{
    let body:unknown;try{body=await c.req.json();}catch{throw new Error('invalid-request');}
    if(!body||typeof body!=='object'||!('id' in body)||typeof body.id!=='string'||!('image' in body)||typeof body.image!=='string'||Object.keys(body).some(k=>!['id','image','publicImageConsent'].includes(k)))throw new Error('invalid-request');
    if(!('publicImageConsent' in body)||body.publicImageConsent!==true)throw new Error('consent-required');
    const owner=await actor();if(!owner.userId)throw new Error('login-required');
    if(!images)throw new Error('image-unavailable');
    const imageUrl=await images.exportImage(owner.userId,{id:body.id,image:body.image,publicImageConsent:true});
    return c.json({...envelope,imageUrl});
  });
  app.get('/api/community/hall/certificate',async(c)=>{
    const certificate=await community.hall.certificate(c.req.query('id')??'');
    if(!certificate)throw new Error('certificate-unavailable');
    return c.json({...envelope,certificate});
  });
  app.get('/api/community/hall/champion',async(c)=>c.json({...envelope,champion:await community.hall.championPage(Number(c.req.query('day')),c.req.query('after'))}));
  return app;
}
