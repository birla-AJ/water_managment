import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { logger } from './config/logger';
import { swaggerSpec } from './config/swagger';
import { globalLimiter } from './middlewares/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiRouter } from './routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
      credentials: true,
    })
  );
  app.use(compression());

  // Razorpay webhook needs the raw body for signature verification.
  app.use(`${env.apiPrefix}/payments/webhook`, express.raw({ type: '*/*' }));

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    morgan(env.isProd ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.http?.(msg.trim()) ?? logger.info(msg.trim()) },
    })
  );

  // static uploads
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.uploads.dir)));

  // health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  // Swagger docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'WaterFlow ERP API' }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  // rate limiting + routes
  app.use(env.apiPrefix, globalLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
