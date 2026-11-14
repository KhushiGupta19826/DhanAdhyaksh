import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  isTest: boolean;
  corsOrigin: string;
  databaseUrl: string;
  testDatabaseUrl: string;
  // Auth
  authEmail: string;
  authPasswordHash: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  testDatabaseUrl: process.env.TEST_DATABASE_URL || '',
  // Auth - never log these values
  authEmail: process.env.AUTH_EMAIL || '',
  authPasswordHash: process.env.AUTH_PASSWORD_HASH || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
