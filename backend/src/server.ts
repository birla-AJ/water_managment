import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import { getFirebaseAdmin } from './config/firebase';
import { startSchedulers } from './jobs/scheduler';

async function bootstrap() {
  await connectDatabase();
  getFirebaseAdmin(); // warm up (no-op if unconfigured)

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`🚀 WaterFlow ERP API running on http://localhost:${env.port}`);
    logger.info(`📚 Swagger docs at http://localhost:${env.port}/api/docs`);
    logger.info(`🌎 Environment: ${env.nodeEnv}`);
  });

  startSchedulers();

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error(`Unhandled rejection: ${String(reason)}`));
}

bootstrap().catch((err) => {
  logger.error(`Failed to start server: ${(err as Error).message}`);
  process.exit(1);
});
