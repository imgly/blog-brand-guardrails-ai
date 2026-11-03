import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

import { handleModerate, type ModerationEnv } from './server/moderate.ts';

export default defineConfig(({ mode }) => ({
  // Only STREAM_ variables, and only here on the server side. Vite puts
  // VITE_ variables in the browser bundle; these must never go there.
  plugins: [react(), moderationApi(loadEnv(mode, process.cwd(), 'STREAM_'))],
  server: {
    port: 5173
  }
}));

/**
 * Serves the content check at /api/moderate during `npm run dev`, with
 * the same handler the Netlify function uses in production.
 */
function moderationApi(env: ModerationEnv): Plugin {
  return {
    name: 'moderation-api',
    configureServer(server) {
      server.middlewares.use('/api/moderate', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const request = new Request('http://localhost/api/moderate', {
          method: req.method,
          headers: { 'content-type': req.headers['content-type'] ?? '' },
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined
        });
        res.setHeader('Content-Type', 'application/json');
        try {
          const response = await handleModerate(request, env);
          res.statusCode = response.status;
          res.end(await response.text());
        } catch (error) {
          // A failed check must not take the dev server down with it.
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    }
  };
}
