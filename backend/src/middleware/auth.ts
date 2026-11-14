import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { UnauthorizedError } from '../utils/errors';

export interface AuthPayload {
  sub: 'owner';
  iat?: number;
  exp?: number;
}

// Read live from process.env so vi.stubEnv() works in tests
function getJwtSecret(): string {
  return process.env.JWT_SECRET || config.jwtSecret || '';
}

/**
 * Express middleware that verifies the JWT Bearer token on every protected request.
 * Rejects with HTTP 401 when token is missing, invalid, or expired.
 */
export function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required');
  }

  const token = authHeader.slice(7);
  const secret = getJwtSecret();

  if (!secret) {
    throw new UnauthorizedError('Authentication is not configured');
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    if (payload.sub !== 'owner') {
      throw new UnauthorizedError('Invalid token subject');
    }
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Invalid or expired token');
  }
}
