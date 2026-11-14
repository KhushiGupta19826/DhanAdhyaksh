import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { UnauthorizedError, TooManyRequestsError, ValidationError } from '../utils/errors';

// ── In-memory brute-force rate limiter ────────────────────────────────────────
interface LoginAttempt {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

function getClientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim()
    : req.socket.remoteAddress || 'unknown';
  return ip;
}

function checkRateLimit(req: Request): void {
  const key = getClientKey(req);
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }

  if (now - record.firstAttemptAt > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    throw new TooManyRequestsError('Too many login attempts. Please try again later.');
  }

  record.count += 1;

  if (record.count > MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    throw new TooManyRequestsError('Too many login attempts. Please try again later.');
  }
}

function resetRateLimit(req: Request): void {
  loginAttempts.delete(getClientKey(req));
}

// ── Auth env helpers (read live from process.env for testability) ──────────────
// These are intentionally read from process.env directly (not from the cached
// config object) so that vi.stubEnv() in tests can override them without
// requiring module cache clearing.
function getAuthEmail(): string {
  return process.env.AUTH_EMAIL || config.authEmail || '';
}
function getAuthPasswordHash(): string {
  return process.env.AUTH_PASSWORD_HASH || config.authPasswordHash || '';
}
function getJwtSecret(): string {
  return process.env.JWT_SECRET || config.jwtSecret || '';
}
function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || config.jwtExpiresIn || '7d';
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    checkRateLimit(req);

    const { email, password } = req.body as { email?: unknown; password?: unknown };

    if (typeof email !== 'string' || !email.trim()) {
      throw new ValidationError('Email is required');
    }
    if (typeof password !== 'string' || !password) {
      throw new ValidationError('Password is required');
    }

    const authEmail = getAuthEmail();
    const authPasswordHash = getAuthPasswordHash();
    const jwtSecret = getJwtSecret();

    if (!authEmail || !authPasswordHash || !jwtSecret) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Always run bcrypt compare (even if email is wrong) to prevent timing attacks
    const emailMatches = email.trim().toLowerCase() === authEmail.toLowerCase();
    const passwordMatches = await bcrypt.compare(password, authPasswordHash);

    if (!emailMatches || !passwordMatches) {
      throw new UnauthorizedError('Invalid credentials');
    }

    resetRateLimit(req);

    const token = jwt.sign({ sub: 'owner' as const }, jwtSecret, {
      expiresIn: getJwtExpiresIn() as jwt.SignOptions['expiresIn'],
    });

    res.status(200).json({
      data: {
        token,
        expiresIn: getJwtExpiresIn(),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
export function logoutController(_req: Request, res: Response): void {
  res.status(200).json({ data: { message: 'Logged out successfully' } });
}

/**
 * GET /api/auth/me — protected by authenticateToken middleware
 */
export function meController(_req: Request, res: Response): void {
  res.status(200).json({
    data: {
      authenticated: true,
      email: getAuthEmail(),
    },
  });
}
