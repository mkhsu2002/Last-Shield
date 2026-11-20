import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort, reddit, redis, context, media } from '@devvit/web/server';
import { CommunityService } from './community-service';
import { createCommunityRouter } from './community-router';

import { ShareCardService, createManagedPost } from './share-card';

const existingGamePosts=new Set(['t3_1xximge','t3_1xwkbkk']);
const managedGamePost=async(id:`t3_${string}`)=>existingGamePosts.has(id)||(await redis.get(`share-card:managed:${id}`))==='1';
const shareCard = new ShareCardService({
  managed:managedGamePost,
  get:key=>redis.get(key), set:(key,value)=>redis.set(key,value),
  upload:options=>media.upload(options),
  read:id=>reddit.getPostStyles(id), write:(id,styles)=>reddit.setPostStyles(id,styles),
});
async function canManagePosts(subredditName:string):Promise<boolean>{
  if(!context.userId)return false;
  const username=await reddit.getCurrentUsername();if(!username)return false;
  const moderators=await reddit.getModerators({subredditName,username,limit:1}).all();
  return moderators.some(user=>user.id===context.userId&&user.moderatorInfo.modPermissions.some(permission=>permission==='all'||permission==='posts'));
}
const app = new Hono();
app.route('/', createCommunityRouter(new CommunityService(redis), async (includeUsername) => ({
  userId: context.userId, postId: context.postId,
  username: includeUsername && context.userId ? await reddit.getCurrentUsername() : undefined,
})));

app.post('/internal/menu/create-post', async (c) => {
  try {
    if(!context.userId||!context.subredditId)return c.json({showToast:'Sign in as a community moderator to create a game post.'},403);
    const subreddit=await reddit.getSubredditById(context.subredditId);
    if(!subreddit||!await canManagePosts(subreddit.name))return c.json({showToast:'A moderator with post permissions must create the game post.'},403);
    const imageUrl = await shareCard.imageUrl();
    const {post,registered}=await createManagedPost(
      ()=>reddit.submitCustomPost({title:'Last Shield | Daily Meteor Defense',styles:{shareImageUrl:imageUrl}}),
      post=>redis.set(`share-card:managed:${post.id}`,'1'),
    );
    if(!registered)console.error('Sharing management registration pending for',post.id);
    return c.json({ navigateTo: 'https://www.reddit.com' + post.permalink });
  } catch (error) {
    console.error('Failed to create Last Shield post', error);
    return c.json({ showToast: 'Could not create game post.' }, 400);
  }
});

app.post('/internal/menu/update-share-card', async (c) => {
  try {
    if (!context.userId || !context.postId || !context.subredditId) return c.json({showToast:'Sign in as a community moderator to update this preview.'},403);
    const post = await reddit.getPostById(context.postId);
    if (post.subredditId !== context.subredditId) return c.json({showToast:'Open this game post in its own community.'},403);
    if (!await managedGamePost(post.id)) return c.json({showToast:'This post does not belong to Last Shield.'},400);
    if (!await canManagePosts(post.subredditName)) return c.json({showToast:'A moderator with post permissions must update this preview.'},403);
    await shareCard.update(post.id);
    return c.json({showToast:'Sharing image updated. Private community links remain private.'});
  } catch {
    console.error('Could not update Last Shield sharing image');
    return c.json({showToast:'Could not confirm the sharing image update. Please try again.'},503);
  }
});

serve({ fetch: app.fetch, createServer, port: getServerPort() });
