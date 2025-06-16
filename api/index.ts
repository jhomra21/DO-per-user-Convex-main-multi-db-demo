import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAuth } from '../auth'
import type { D1Database, KVNamespace, DurableObjectNamespace, Fetcher, DurableObject } from '@cloudflare/workers-types';
import { ImageStorageDO } from './do/ImageStorageDO';

// This is required to expose the Durable Object class to the runtime
export { ImageStorageDO };

// This is a common pattern to get types from a factory function without executing it.
const authForTypes = getAuth({} as any);

type Env = {
    ASSETS: Fetcher;
    DB: D1Database;
    SESSIONS: KVNamespace;
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    FAL_KEY: string;
    NODE_ENV?: string;
    IMAGE_STORAGE_DO: DurableObjectNamespace;
};

type HonoVariables = {
    user: typeof authForTypes.$Infer.Session.user | null;
    session: typeof authForTypes.$Infer.Session.session | null;
}

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

app.use('/api/*', cors({
  origin: (origin) => {
    const allowedOrigins = [
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://localhost:4173', 
        'http://localhost:5173', 
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
        return origin || '*';
    }
    return null; 
  },
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
}));

app.get('/api/', (c) => {
  return c.json({
    name: 'Cloudflare Workers',
  });
});

app.get('/api/hello', (c) => {
  return c.text('Hello from Hono API!');
});

app.all('/api/auth/*', (c) => {
  return getAuth(c.env).handler(c.req.raw);
});

const imageRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>()

// Middleware to get user session, following better-auth docs
imageRoutes.use('*', async (c, next) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  
  if (!session) {
    c.set("user", null);
    c.set("session", null);
  } else {
    c.set('user', session.user);
    c.set('session', session.session);
  }
  await next();
});

// GET /api/images -> gets images from the DO
imageRoutes.get('/', async (c) => {
  const user = c.get('user');
  if (!user?.id) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const doId = (c.env.IMAGE_STORAGE_DO).idFromName(user.id);
  const stub = (c.env.IMAGE_STORAGE_DO).get(doId);

  // The DO's fetch handler expects paths relative to its own root.
  // The original request is to '/api/images', but the DO logic for getting
  // images is at '/'. We create a new request with the correct path.
  const getImagesRequest = new Request(new URL(c.req.url).origin + "/", {
    method: "GET",
    headers: c.req.raw.headers,
  });

  // Forward the new request to the Durable Object
  return stub.fetch(getImagesRequest);
});

// POST /api/images/sync -> triggers a sync in the DO
imageRoutes.post('/sync', async (c) => {
    const user = c.get('user');
    if (!user?.id) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const doId = (c.env.IMAGE_STORAGE_DO).idFromName(user.id);
    const stub = (c.env.IMAGE_STORAGE_DO).get(doId);

    // Create a new request to trigger the sync
    const syncReq = new Request(new URL(c.req.url).origin + "/sync", {
        method: 'POST',
    });

    return stub.fetch(syncReq);
});

app.route('/api/images', imageRoutes);

export default app;