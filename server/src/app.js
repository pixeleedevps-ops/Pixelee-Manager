import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
  app.use(errorMiddleware);

  return app;
}
