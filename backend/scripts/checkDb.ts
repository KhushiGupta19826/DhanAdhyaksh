import dotenv from 'dotenv';
import { prisma } from '../src/utils/prisma';

// Ensure environment variables are loaded
dotenv.config();

async function checkDatabaseConnection(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');

  console.log('========================================');
  console.log(' Dhanadhyaksh Database Connectivity Check');
  console.log(` Target: ${maskedUrl}`);
  console.log('========================================');

  try {
    const result = await prisma.$queryRaw<Array<{ connected: number; db_name: string; pg_version: string }>>`
      SELECT 1 as connected, current_database() as db_name, version() as pg_version
    `;
    console.log('✅ Prisma connected to PostgreSQL successfully!');
    if (result && result[0]) {
      console.log(`Connected Database: ${result[0].db_name}`);
      console.log(`PostgreSQL Version: ${result[0].pg_version}`);
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed.');
    if (error instanceof Error) {
      console.error(`Error Details: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseConnection();
