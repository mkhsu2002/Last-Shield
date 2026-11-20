export const SHARE_CARD_SOURCE = 'https://raw.githubusercontent.com/mkhsu2002/Last-Shield/6b663147f317cc9906f51ddae74a8aea34b5d62f/public/share/last-shield-og-v052.png';
const CACHE_KEY='share-card:v052:6b66314';
type PostId=`t3_${string}`;
type Styles={shareImageUrl?:string};
type Dependencies={
 managed:(id:PostId)=>Promise<boolean>;
 get:(key:string)=>Promise<string|undefined>;
 set:(key:string,value:string)=>Promise<unknown>;
 upload:(options:{url:string;type:'image'})=>Promise<{mediaUrl:string}>;
 read:(id:PostId)=>Promise<Styles>;
 write:(id:PostId,styles:Styles)=>Promise<unknown>;
};
function validImage(value:string):boolean {
 try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='i.redd.it'&&!url.username&&!url.password&&!url.port&&/^\/[a-zA-Z0-9_.-]+$/.test(url.pathname)&&!url.search&&!url.hash;}
 catch{return false;}
}
export class ShareCardService {
 private readonly dependencies:Dependencies;
 constructor(dependencies:Dependencies){this.dependencies=dependencies;}
 async imageUrl():Promise<string>{
  const cached=await this.dependencies.get(CACHE_KEY);
  if(cached&&validImage(cached))return cached;
  const {mediaUrl}=await this.dependencies.upload({url:SHARE_CARD_SOURCE,type:'image'});
  if(!validImage(mediaUrl))throw new Error('invalid-share-image');
  await this.dependencies.set(CACHE_KEY,mediaUrl);return mediaUrl;
 }
 async update(id:PostId):Promise<string>{
  if(!await this.dependencies.managed(id))throw new Error('unmanaged-post');
  const url=await this.imageUrl();
  const before=await this.dependencies.read(id);
  if(before.shareImageUrl!==url)await this.dependencies.write(id,{shareImageUrl:url});
  if((await this.dependencies.read(id)).shareImageUrl!==url)throw new Error('share-image-unconfirmed');
  return url;
 }
}

// Creation is an external side effect: a registry outage must not invite a duplicate post.
export async function createManagedPost<T>(create:()=>Promise<T>,register:(post:T)=>Promise<unknown>):Promise<{post:T;registered:boolean}>{
 const post=await create();
 for(let attempt=0;attempt<3;attempt++){
  try{await register(post);return {post,registered:true};}catch{/* Preserve the already-created post after bounded retries. */}
 }
 return {post,registered:false};
}
