import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('API Health Endpoint', () => {
  it('should return 200 and healthy status on GET /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('message', 'Dhanadhyaksh API is running');
    expect(response.body).toHaveProperty('app', 'Dhanadhyaksh Cash Tracker');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return 404 for unknown routes with standardized error format', async () => {
    const response = await request(app).get('/api/non-existent-route');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(response.body.error.message).toContain('Route not found');
  });

  it('should handle database connectivity check on GET /api/health/db', async () => {
    const response = await request(app).get('/api/health/db');

    // Either 200 (connected) or 503 (disconnected) with structured response
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('connected');
    expect(typeof response.body.connected).toBe('boolean');
    expect(response.body).toHaveProperty('message');
  });
});
