import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort, reddit, redis, context } from '@devvit/web/server';
import { CommunityService } from './community-service';
import { createCommunityRouter } from './community-router';

const app = new Hono();
app.route('/', createCommunityRouter(new CommunityService(redis), async (includeUsername) => ({
  userId: context.userId, postId: context.postId,
  username: includeUsername && context.userId ? await reddit.getCurrentUsername() : undefined,
})));

app.post('/internal/menu/create-post', async (c) => {
  try {
    const post = await reddit.submitCustomPost({ title: 'Last Shield | Daily Meteor Defense' });
    return c.json({ navigateTo: 'https://www.reddit.com' + post.permalink });
  } catch (error) {
    console.error('Failed to create Last Shield post', error);
    return c.json({ showToast: 'Could not create game post.' }, 400);
  }
});

serve({ fetch: app.fetch, createServer, port: getServerPort() });
