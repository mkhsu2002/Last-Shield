import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { CommunityService, envelope, type Actor } from './community-service.ts';

export function createCommunityRouter(community:CommunityService, actor:(includeUsername?:boolean)=>Promise<Actor>):Hono {
  const app=new Hono();
  app.use('/api/*', bodyLimit({maxSize:3*1024*1024,
    onError:c=>c.json({...envelope,error:'trace-too-large'},413)}));
  app.use('/api/*',async(c,next)=>{c.header('Cache-Control','no-store');await next();});
  app.onError((error,c)=>{
    const code=error.message;
    const allowed=['login-required','invalid-context','rate-limited','invalid-session','expired-session',
      'invalid-trace','invalid-duration','unfinished-run','invalid-day','retry-submit','invalid-request'];
    if(!allowed.includes(code)) console.error('Community storage unavailable');
    return c.json({...envelope,error:allowed.includes(code)?code:'unavailable'},
      code==='login-required'?401:code==='rate-limited'?429:allowed.includes(code)?400:503);
  });
  app.post('/api/community/start',async(c)=>c.json(await community.start(await actor(true))));
  app.get('/api/community/board',async(c)=>c.json(await community.board(Number(c.req.query('day')),(await actor()).userId)));
  app.post('/api/community/submit',async(c)=>{
    let body:unknown;
    try{body=await c.req.json();}catch{throw new Error('invalid-request');}
    if(!body||typeof body!=='object'||!('runId' in body)||typeof body.runId!=='string'||!('trace' in body))throw new Error('invalid-request');
    const result=await community.submit(await actor(),body.runId,body.trace);
    return c.json({...envelope,result});
  });
  app.delete('/api/community/entry',async(c)=>{
    await community.remove(Number(c.req.query('day')),(await actor()).userId);
    return c.json({...envelope,removed:true});
  });
  return app;
}
