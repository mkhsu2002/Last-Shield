import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort, reddit } from '@devvit/web/server';

const app = new Hono();

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
