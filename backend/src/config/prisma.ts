import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: env.isProd ? ['error', 'warn'] : ['error', 'warn'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('✅ Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
