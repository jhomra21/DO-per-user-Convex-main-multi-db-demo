import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAuth } from '../auth'
// import type { Fetcher } from '@cloudflare/workers-types'
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

type Env = {
    ASSETS: Fetcher;
    DB: D1Database;
    SESSIONS: KVNamespace;
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    FAL_KEY: string;
    NODE_ENV?: string; // Add NODE_ENV as an optional string property
    // Add other bindings/variables like GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET if using social providers
    // GITHUB_CLIENT_ID?: string;
    // GITHUB_CLIENT_SECRET?: string;
};

const app = new Hono<{ Bindings: Env}>()

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

app.on(["POST", "GET"], "/api/auth/*", (c) => {
	return getAuth(c.env as any).handler(c.req.raw);
});

export default app;