/**
 * Authentication Tests — backend/tests/auth.test.ts
 *
 * Tests the full authentication layer without requiring a live database connection.
 * Uses a fresh Express app that only mounts the auth routes + middleware, with
 * test-specific environment variables injected via vi.stubEnv before each test.
 *
 * Coverage:
 *  1. Successful login
 *  2. Incorrect password
 *  3. Incorrect email
 *  4. Missing credentials
 *  5. Protected route without token
 *  6. Protected route with invalid JWT
 *  7. Protected route with expired JWT
 *  8. Protected route with valid JWT
 *  9. Logout
 * 10. Auth-state restoration (GET /api/auth/me)
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import '../src/utils/serializer';
import { notFoundHandler, errorHandler } from '../src/middleware/errorHandler';
import { authenticateToken } from '../src/middleware/auth';
import { loginController, logoutController, meController } from '../src/controllers/auth.controller';

// ── Test constants ─────────────────────────────────────────────────────────────
const TEST_EMAIL = 'owner@dhanadhyaksh.test';
const TEST_PASSWORD = 'SecureP@ss123!';
const TEST_JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long!!';
const TEST_JWT_EXPIRES_IN = '1h';

// ── Inject env vars before anything loads config ───────────────────────────────
// Using vi.stubEnv ensures cleanup after each test file run.
let TEST_PASSWORD_HASH: string;

beforeAll(async () => {
  TEST_PASSWORD_HASH = await bcrypt.hash(TEST_PASSWORD, 12);

  vi.stubEnv('AUTH_EMAIL', TEST_EMAIL);
  vi.stubEnv('AUTH_PASSWORD_HASH', TEST_PASSWORD_HASH);
  vi.stubEnv('JWT_SECRET', TEST_JWT_SECRET);
  vi.stubEnv('JWT_EXPIRES_IN', TEST_JWT_EXPIRES_IN);
  vi.stubEnv('NODE_ENV', 'test');
});

// ── Build a minimal Express app for auth testing ───────────────────────────────
// Does NOT use the production `app` — avoids Prisma/DB initialization entirely.
function buildApp(): Express {
  const app = express();
  app.use(express.json());

  // Auth routes (manually wired to match the production structure)
  app.post('/api/auth/login', loginController);
  app.post('/api/auth/logout', logoutController);
  app.get('/api/auth/me', authenticateToken, meController);

  // Dummy protected route
  app.get('/api/protected', authenticateToken, (_req: Request, res: Response) => {
    res.json({ data: { secret: 'financial-data' } });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Successful login
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: POST /api/auth/login — Successful login', () => {
  it('returns 200 with a JWT token when credentials are correct', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(20);

    // Verify the token is valid and contains the right subject
    const decoded = jwt.verify(res.body.data.token, TEST_JWT_SECRET) as { sub: string };
    expect(decoded.sub).toBe('owner');
  });

  it('is case-insensitive on email', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL.toUpperCase(), password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Incorrect password
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: POST /api/auth/login — Incorrect password', () => {
  it('returns 401 with a generic error for a wrong password', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    // Message must NOT reveal which field was wrong
    expect(res.body.error.message).toBe('Invalid credentials');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Incorrect email
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: POST /api/auth/login — Incorrect email', () => {
  it('returns 401 with the same generic error for a wrong email', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notowner@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    // Exact same message as wrong password — avoids credential enumeration
    expect(res.body.error.message).toBe('Invalid credentials');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Missing credentials
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: POST /api/auth/login — Missing credentials', () => {
  it('returns 400 when email is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: TEST_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password is missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when body is completely empty', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Protected route without token
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: Protected routes — No token', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/protected');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Authorization header lacks "Bearer" scheme', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Protected route with invalid JWT
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: Protected routes — Invalid JWT', () => {
  it('returns 401 for a randomly-crafted invalid token', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for a token signed with the wrong secret', async () => {
    const app = buildApp();
    const wrongToken = jwt.sign({ sub: 'owner' }, 'wrong-secret', { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${wrongToken}`);

    expect(res.status).toBe(401);
  });

  it('returns 401 for a token with wrong subject', async () => {
    const app = buildApp();
    const wrongSubToken = jwt.sign({ sub: 'attacker' }, TEST_JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${wrongSubToken}`);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Protected route with expired JWT
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: Protected routes — Expired JWT', () => {
  it('returns 401 for a token that has already expired', async () => {
    const app = buildApp();
    // Sign with a 1-second TTL and backdate iat so it's immediately expired
    const expiredToken = jwt.sign(
      { sub: 'owner' },
      TEST_JWT_SECRET,
      { expiresIn: 1 }
    );

    // Wait for the token to actually expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Protected route with valid JWT
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: Protected routes — Valid JWT', () => {
  it('returns 200 and data for a valid token', async () => {
    const app = buildApp();
    const token = jwt.sign({ sub: 'owner' }, TEST_JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.secret).toBe('financial-data');
  });

  it('token from /login flow works on protected routes end-to-end', async () => {
    const app = buildApp();

    // Step 1: Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);

    const { token } = loginRes.body.data;

    // Step 2: Use token on protected route
    const protectedRes = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(protectedRes.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Logout
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: POST /api/auth/logout', () => {
  it('returns 200 with a success message', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('Logged out');
  });

  it('logout is idempotent — works without any token', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Authentication state restoration (GET /api/auth/me)
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth: GET /api/auth/me — Session restoration', () => {
  it('returns authenticated: true and owner email for a valid token', async () => {
    const app = buildApp();
    const token = jwt.sign({ sub: 'owner' }, TEST_JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.authenticated).toBe(true);
    expect(res.body.data.email).toBe(TEST_EMAIL);
  });

  it('returns 401 when the token stored in the client has expired', async () => {
    const app = buildApp();
    const expiredToken = jwt.sign({ sub: 'owner' }, TEST_JWT_SECRET, { expiresIn: 1 });
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('returns 401 when no token is present (fresh page load, unauthenticated)', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
