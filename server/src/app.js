import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { errorMiddleware, notFound } from './middleware/error.js';
import { buildRoutes } from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'pixele-manager-api',
      env: config.nodeEnv,
      database: config.databaseUrl ? 'configurada' : 'NO configurada',
      supabaseAuth: config.supabaseUrl && config.supabaseKey ? 'configurada' : 'NO configurada',
    });
  });

  app.use('/api', buildRoutes());
  app.use('/api', notFound);

  // In production, serve the Vite build from this same Node.js process/domain.
  // This keeps /api same-origin and avoids a separate frontend/API deployment.
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const clientDist = resolve(projectRoot, 'client/dist');
  if (config.nodeEnv === 'production' && existsSync(resolve(clientDist, 'index.html'))) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) return next();
      res.set('Cache-Control', 'no-cache');
      return res.sendFile(resolve(clientDist, 'index.html'));
    });
  }

  app.use(errorMiddleware);

  return app;
}
