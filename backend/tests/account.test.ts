import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('Phase 5: Accounts API', () => {
  beforeEach(async () => {
    // Clean database before each test run
    await prisma.goalAllocation.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
  });

  describe('POST /api/accounts — Create Account', () => {
    it('should create an account successfully with positive initial balance', async () => {
      const res = await request(app).post('/api/accounts').send({
        name: 'Wallet',
        initialBalance: 200000, // ₹2,000 in paise
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        name: 'Wallet',
        initialBalance: 200000,
        balance: 200000,
        isActive: true,
      });
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('should default initialBalance to 0 when omitted', async () => {
      const res = await request(app).post('/api/accounts').send({
        name: 'Room',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'Room',
        initialBalance: 0,
        balance: 0,
        isActive: true,
      });
    });

    it('should allow zero initial balance explicitly', async () => {
      const res = await request(app).post('/api/accounts').send({
        name: 'Bag',
        initialBalance: 0,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.initialBalance).toBe(0);
      expect(res.body.data.balance).toBe(0);
    });

    it('should reject negative initial balance', async () => {
      const res = await request(app).post('/api/accounts').send({
        name: 'Wallet',
        initialBalance: -500,
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/cannot be negative/i);
    });

    it('should reject floating-point monetary values', async () => {
      const res = await request(app).post('/api/accounts').send({
        name: 'Wallet',
        initialBalance: 99.5,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/integer amount in paise/i);
    });

    it('should reject missing name', async () => {
      const res = await request(app).post('/api/accounts').send({
        initialBalance: 10000,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/'name' is required/i);
    });

    it('should reject empty or whitespace-only name', async () => {
      const res = await request(app).post('/api/accounts').send({
        name: '   ',
        initialBalance: 10000,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/'name' cannot be empty/i);
    });

    it('should reject duplicate account name with 409 Conflict', async () => {
      await request(app).post('/api/accounts').send({
        name: 'Emergency Cash',
        initialBalance: 500000,
      });

      const duplicateRes = await request(app).post('/api/accounts').send({
        name: 'Emergency Cash',
        initialBalance: 100000,
      });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error.code).toBe('CONFLICT');
      expect(duplicateRes.body.error.message).toMatch(/already exists/i);
    });
  });

  describe('GET /api/accounts — List Active Accounts', () => {
    it('should list active accounts by default', async () => {
      await request(app).post('/api/accounts').send({ name: 'Wallet', initialBalance: 200000 });
      await request(app).post('/api/accounts').send({ name: 'Room', initialBalance: 100000 });

      const res = await request(app).get('/api/accounts');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].name).toBe('Wallet');
      expect(res.body.data[0].balance).toBe(200000);
      expect(res.body.data[1].name).toBe('Room');
      expect(res.body.data[1].balance).toBe(100000);
    });

    it('should exclude archived accounts from default list', async () => {
      const createRes = await request(app).post('/api/accounts').send({ name: 'Old Wallet', initialBalance: 5000 });
      await request(app).post('/api/accounts').send({ name: 'Active Wallet', initialBalance: 10000 });

      const accountId = createRes.body.data.id;
      await request(app).delete(`/api/accounts/${accountId}`);

      const listRes = await request(app).get('/api/accounts');
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].name).toBe('Active Wallet');
    });
  });

  describe('GET /api/accounts/:id — Single Account Details & Balance', () => {
    it('should fetch single account by ID with calculated balance', async () => {
      const createRes = await request(app).post('/api/accounts').send({
        name: 'Wallet',
        initialBalance: 200000,
      });

      const accountId = createRes.body.data.id;
      const getRes = await request(app).get(`/api/accounts/${accountId}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data).toMatchObject({
        id: accountId,
        name: 'Wallet',
        initialBalance: 200000,
        balance: 200000,
        isActive: true,
      });
    });

    it('should return 404 for non-existent account ID', async () => {
      const res = await request(app).get('/api/accounts/999999');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toMatch(/Account not found/i);
    });

    it('should return 400 for invalid ID parameter format', async () => {
      const res = await request(app).get('/api/accounts/abc');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/accounts/:id — Update Account', () => {
    it('should update account name successfully', async () => {
      const createRes = await request(app).post('/api/accounts').send({
        name: 'Wallet',
        initialBalance: 200000,
      });

      const accountId = createRes.body.data.id;
      const patchRes = await request(app).patch(`/api/accounts/${accountId}`).send({
        name: 'Primary Wallet',
      });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.name).toBe('Primary Wallet');
      expect(patchRes.body.data.balance).toBe(200000);
    });

    it('should reject empty or whitespace name update', async () => {
      const createRes = await request(app).post('/api/accounts').send({ name: 'Wallet' });
      const accountId = createRes.body.data.id;

      const patchRes = await request(app).patch(`/api/accounts/${accountId}`).send({
        name: '   ',
      });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject updating to an existing duplicate account name', async () => {
      await request(app).post('/api/accounts').send({ name: 'Wallet' });
      const roomRes = await request(app).post('/api/accounts').send({ name: 'Room' });

      const roomId = roomRes.body.data.id;
      const patchRes = await request(app).patch(`/api/accounts/${roomId}`).send({
        name: 'Wallet',
      });

      expect(patchRes.status).toBe(409);
      expect(patchRes.body.error.code).toBe('CONFLICT');
    });

    it('should reject attempts to modify financial balance or initialBalance fields', async () => {
      const createRes = await request(app).post('/api/accounts').send({
        name: 'Wallet',
        initialBalance: 200000,
      });

      const accountId = createRes.body.data.id;

      const patchBalanceRes = await request(app).patch(`/api/accounts/${accountId}`).send({
        balance: 500000,
      });
      expect(patchBalanceRes.status).toBe(400);
      expect(patchBalanceRes.body.error.code).toBe('VALIDATION_ERROR');

      const patchInitialRes = await request(app).patch(`/api/accounts/${accountId}`).send({
        initialBalance: 500000,
      });
      expect(patchInitialRes.status).toBe(400);
      expect(patchInitialRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when updating a non-existent account', async () => {
      const patchRes = await request(app).patch('/api/accounts/999999').send({
        name: 'New Name',
      });

      expect(patchRes.status).toBe(404);
      expect(patchRes.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/accounts/:id — Archive Account', () => {
    it('should archive an account without physically deleting it from database', async () => {
      const createRes = await request(app).post('/api/accounts').send({
        name: 'Old Wallet',
        initialBalance: 50000,
      });

      const accountId = createRes.body.data.id;

      const deleteRes = await request(app).delete(`/api/accounts/${accountId}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.isActive).toBe(false);

      // Verify row still exists in database
      const dbAccount = await prisma.account.findUnique({
        where: { id: BigInt(accountId) },
      });
      expect(dbAccount).not.toBeNull();
      expect(dbAccount?.isActive).toBe(false);
      expect(dbAccount?.name).toBe('Old Wallet');
    });

    it('should return 404 when attempting to archive a non-existent account', async () => {
      const deleteRes = await request(app).delete('/api/accounts/999999');

      expect(deleteRes.status).toBe(404);
      expect(deleteRes.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle re-archiving an already archived account gracefully', async () => {
      const createRes = await request(app).post('/api/accounts').send({ name: 'Wallet' });
      const accountId = createRes.body.data.id;

      await request(app).delete(`/api/accounts/${accountId}`);
      const secondDeleteRes = await request(app).delete(`/api/accounts/${accountId}`);

      expect(secondDeleteRes.status).toBe(200);
      expect(secondDeleteRes.body.data.isActive).toBe(false);
    });
  });

  describe('Step 15 Verification Scenario: Initial Balance Non-Transaction Invariant', () => {
    it('should verify Create Wallet (initialBalance = ₹2,000) results in balance = ₹2,000 without creating any Transaction records', async () => {
      // 1. Create Wallet with initialBalance = 200000 paise (₹2,000)
      const createRes = await request(app).post('/api/accounts').send({
        name: 'Wallet',
        initialBalance: 200000,
      });

      expect(createRes.status).toBe(201);
      const accountId = createRes.body.data.id;

      // 2. GET Wallet by ID
      const getRes = await request(app).get(`/api/accounts/${accountId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.balance).toBe(200000); // 200000 paise = ₹2,000

      // 3. Verify internally that zero Transaction records exist in the database
      const transactionCount = await prisma.transaction.count();
      expect(transactionCount).toBe(0);
    });
  });
});
