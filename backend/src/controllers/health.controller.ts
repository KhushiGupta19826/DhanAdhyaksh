import { Request, Response, NextFunction } from 'express';
import { getHealthStatus, getDatabaseHealth } from '../services/health.service';

export function getHealth(_req: Request, res: Response, next: NextFunction): void {
  try {
    const health = getHealthStatus();
    res.status(200).json(health);
  } catch (error) {
    next(error);
  }
}

export async function getDatabaseHealthController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dbHealth = await getDatabaseHealth();
    const statusCode = dbHealth.connected ? 200 : 503;
    res.status(statusCode).json(dbHealth);
  } catch (error) {
    next(error);
  }
}

