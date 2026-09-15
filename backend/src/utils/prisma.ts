import { PrismaClient } from '@prisma/client';
import { config } from './config';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaArgs = {};

if (config.isTest) {
  if (!config.testDatabaseUrl) {
    throw new Error('FATAL: TEST_DATABASE_URL is not defined in test environment.');
  }
  if (!config.testDatabaseUrl.includes('test') && !config.testDatabaseUrl.includes('_test')) {
    throw new Error(`FATAL: TEST_DATABASE_URL (${config.testDatabaseUrl}) does not appear to be a test database. Aborting to prevent data loss.`);
  }
  prismaArgs = {
    datasources: {
      db: {
        url: config.testDatabaseUrl,
      },
    },
  };
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaArgs);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
