import { describe, it, expect } from 'vitest';
import { prisma } from '../src/utils/prisma';
import { config } from '../src/utils/config';

describe('Test Database Isolation Verification', () => {
  it('should be configured with NODE_ENV=test', () => {
    expect(config.isTest).toBe(true);
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have a test database URL containing test or _test', () => {
    expect(config.testDatabaseUrl).toBeDefined();
    const isTestDb = config.testDatabaseUrl.includes('test') || config.testDatabaseUrl.includes('_test');
    expect(isTestDb).toBe(true);
  });

  it('should actually be connected to a test database in PostgreSQL', async () => {
    const result = await prisma.$queryRawUnsafe<{ current_database: string }[]>('SELECT current_database();');
    const dbName = result[0]?.current_database;
    
    expect(dbName).toBeDefined();
    const isTestDb = dbName.includes('test') || dbName.includes('_test');
    expect(isTestDb).toBe(true);
  });
});
