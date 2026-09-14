export interface HealthStatus {
  status: 'ok';
  message: string;
  app: string;
  uptime: number;
  timestamp: string;
}

export interface DatabaseHealthStatus {
  connected: boolean;
  message: string;
  database?: string;
}

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    message: 'Dhanadhyaksh API is running',
    app: 'Dhanadhyaksh Cash Tracker',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

export async function getDatabaseHealth(): Promise<DatabaseHealthStatus> {
  try {
    const { prisma } = await import('../utils/prisma');
    const result = await prisma.$queryRaw<Array<{ db_name: string }>>`SELECT current_database() as db_name`;
    return {
      connected: true,
      message: 'PostgreSQL database connected',
      database: result[0]?.db_name,
    };
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

