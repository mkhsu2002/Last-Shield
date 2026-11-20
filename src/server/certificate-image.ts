import { randomUUID, createHash } from 'node:crypto';
import { RULES_VERSION } from '../shared/game-logic.ts';
import type { CitizenCertificate } from '../shared/heroes.ts';
import type { CommunityStore } from './community-service.ts';
import { isRedditImageUrl } from './share-card.ts';
export const certificateImageKey=(id:string)=>`certificate-image:${RULES_VERSION}:${id}`;
type Dependencies={store:CommunityStore;own:(userId:string)=>Promise<CitizenCertificate|null>;userWatchKey:(userId:string)=>string;
 upload:(options:{url:string;type:'image'})=>Promise<{mediaUrl:string}>;now?:()=>number};
type ExportState={revision:string;token:string;at:number;consentedAt:number;pngSha256:string;url?:string};
function checkPNG(image:string):void{
 const prefix='data:image/png;base64,';
 if(!image.startsWith(prefix)||image.length>2_800_000)throw new Error('invalid-image');
 const encoded=image.slice(prefix.length);
 if(encoded.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw new Error('invalid-image');
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.length<33||bytes.length>2_000_000||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(16)!==1600||bytes.readUInt32BE(20)!==1000)throw new Error('invalid-image');
}
const parse=(raw:string|undefined):ExportState|null=>raw?JSON.parse(raw) as ExportState:null;
const revision=(certificate:CitizenCertificate)=>createHash('sha256').update(JSON.stringify([certificate.id,certificate.username,certificate.callsign??'',certificate.score,certificate.bestCombo,certificate.day,certificate.rules,certificate.demo,certificate.issuedAt])).digest('hex');
export class CertificateImageService{
 private readonly deps:Dependencies;
 private readonly now:()=>number;
 constructor(dependencies:Dependencies){this.deps=dependencies;this.now=dependencies.now??Date.now;}
 async exportImage(userId:string|undefined,options:{id:string;image:string;publicImageConsent:boolean}):Promise<string>{
  if(!userId)throw new Error('login-required');
  if(options.publicImageConsent!==true)throw new Error('consent-required');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(options.id))throw new Error('invalid-certificate');
  checkPNG(options.image);
  const pngSha256=createHash('sha256').update(options.image).digest('hex');
  const key=certificateImageKey(options.id),token=randomUUID();let claimedRevision:string|undefined;
  for(let attempt=0;attempt<4;attempt++){
   const tx=await this.deps.store.watch(this.deps.userWatchKey(userId),key);let active=true;
   try{
    const certificate=await this.deps.own(userId);
    if(!certificate||certificate.id!==options.id)throw new Error('certificate-unavailable');
    const current=parse(await this.deps.store.get(key)),nextRevision=revision(certificate);
    if(current?.revision===nextRevision&&current.pngSha256===pngSha256&&current.url&&isRedditImageUrl(current.url)){await tx.unwatch();active=false;return current.url;}
    if(current&&this.now()-current.at<60_000)throw new Error(current.url?'rate-limited':'image-processing');
    await tx.multi();await tx.set(key,JSON.stringify({revision:nextRevision,token,at:this.now(),consentedAt:this.now(),pngSha256}));
    const done=await tx.exec();active=false;if(done.length){claimedRevision=nextRevision;break;}
   }catch(error){if(active)await tx.discard().catch(()=>{});if(!/WATCH|transaction.*abort|transaction.*conflict/i.test(String(error)))throw error;}
  }
  if(!claimedRevision)throw new Error('retry-submit');
  let imageUrl:string;
  try{imageUrl=(await this.deps.upload({url:options.image,type:'image'})).mediaUrl;}
  catch{throw new Error('image-unavailable');}
  if(!isRedditImageUrl(imageUrl))throw new Error('image-unavailable');
  for(let attempt=0;attempt<4;attempt++){
   const tx=await this.deps.store.watch(this.deps.userWatchKey(userId),key);let active=true;
   try{
    const certificate=await this.deps.own(userId),current=parse(await this.deps.store.get(key));
    if(!certificate||certificate.id!==options.id||current?.token!==token)throw new Error('certificate-unavailable');
    if(revision(certificate)!==claimedRevision)throw new Error('image-unavailable');
    await tx.multi();await tx.set(key,JSON.stringify({...current,url:imageUrl}));const done=await tx.exec();active=false;if(done.length)return imageUrl;
   }catch(error){if(active)await tx.discard().catch(()=>{});if(!/WATCH|transaction.*abort|transaction.*conflict/i.test(String(error)))throw error;}
  }
  throw new Error('image-unavailable');
 }
}
