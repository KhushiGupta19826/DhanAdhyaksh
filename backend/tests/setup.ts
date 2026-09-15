import { beforeAll } from 'vitest';
import { prisma } from '../src/utils/prisma';
import { config } from '../src/utils/config';

beforeAll(async () => {
  if (!config.isTest) {
    throw new Error('FATAL: Tests must be run with NODE_ENV=test');
  }

  const dbUrl = process.env.TEST_DATABASE_URL || '';
  if (!dbUrl.includes('test') && !dbUrl.includes('_test')) {
    throw new Error(`FATAL: TEST_DATABASE_URL (${dbUrl}) does not appear to be a test database. Aborting to prevent data loss.`);
  }
  
  // Actually verify the database we are connected to via a query
  try {
    const result = await prisma.$queryRawUnsafe<{ current_database: string }[]>('SELECT current_database();');
    const currentDbName = result[0]?.current_database;
    
    if (!currentDbName || (!currentDbName.includes('test') && !currentDbName.includes('_test'))) {
      throw new Error(`FATAL: Connected to database '${currentDbName}', which does not appear to be a test database. Aborting.`);
    }
  } catch (error: any) {
    if (error.message.includes('FATAL')) {
      throw error;
    }
    console.error('Error verifying database connection:', error);
    throw new Error('Could not verify database connection.');
  }
});
