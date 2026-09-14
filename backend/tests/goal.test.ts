import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('Phase 10: Goals & Goal Allocations API', () => {
  let walletId: string;
  let roomId: string;

  beforeEach(async () => {
    // Clean database before each test run
    await prisma.goalAllocation.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();

    // Create test accounts
    const walletRes = await request(app).post('/api/accounts').send({
      name: 'Wallet',
      initialBalance: 500000, // ₹5,000 (500000 paise)
    });
    walletId = walletRes.body.data.id.toString();

    const roomRes = await request(app).post('/api/accounts').send({
      name: 'Room',
      initialBalance: 200000, // ₹2,000 (200000 paise)
    });
    roomId = roomRes.body.data.id.toString();
  });

  describe('POST /api/goals — Goal Creation', () => {
    it('should create a goal successfully with target amount and optional date', async () => {
      const res = await request(app).post('/api/goals').send({
        name: 'Goa Trip',
        targetAmount: 1000000, // ₹10,000
        targetDate: '2026-12-25',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'Goa Trip',
        targetAmount: 1000000,
        allocatedAmount: 0,
        remainingAmount: 1000000,
        isCompleted: false,
      });
      expect(res.body.data.allocations).toEqual([]);
    });

    it('should reject goal creation with empty name', async () => {
      const res = await request(app).post('/api/goals').send({
        name: '   ',
        targetAmount: 500000,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("'name' cannot be empty");
    });

    it('should reject goal creation with zero or negative target amount', async () => {
      const resZero = await request(app).post('/api/goals').send({
        name: 'Laptop',
        targetAmount: 0,
      });
      expect(resZero.status).toBe(400);

      const resNeg = await request(app).post('/api/goals').send({
        name: 'Laptop',
        targetAmount: -5000,
      });
      expect(resNeg.status).toBe(400);
    });

    it('should reject duplicate goal name', async () => {
      await request(app).post('/api/goals').send({
        name: 'Emergency Fund',
        targetAmount: 1000000,
      });

      const res = await request(app).post('/api/goals').send({
        name: 'Emergency Fund',
        targetAmount: 2000000,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain("already exists");
    });
  });

  describe('GET /api/goals and GET /api/goals/:id', () => {
    it('should list all goals with calculated progress', async () => {
      await request(app).post('/api/goals').send({
        name: 'Headphones',
        targetAmount: 500000,
      });
      await request(app).post('/api/goals').send({
        name: 'Trip',
        targetAmount: 1500000,
      });

      const res = await request(app).get('/api/goals');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].name).toBe('Headphones');
      expect(res.body.data[1].name).toBe('Trip');
    });

    it('should get a single goal by ID', async () => {
      const created = await request(app).post('/api/goals').send({
        name: 'Monitor',
        targetAmount: 1200000,
      });
      const goalId = created.body.data.id;

      const res = await request(app).get(`/api/goals/${goalId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(goalId);
      expect(res.body.data.name).toBe('Monitor');
    });

    it('should return 404 for non-existent goal ID', async () => {
      const res = await request(app).get('/api/goals/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/goals/:id/allocations — Goal Allocation & Financial Rules', () => {
    it('should allocate existing cash to a goal, reserving cash without altering total cash or account balance', async () => {
      // Create Goal
      const goalRes = await request(app).post('/api/goals').send({
        name: 'Trip',
        targetAmount: 1000000, // ₹10,000
      });
      const goalId = goalRes.body.data.id;

      // Allocate ₹2,000 from Wallet (which has ₹5,000)
      const allocRes = await request(app)
        .post(`/api/goals/${goalId}/allocations`)
        .send({
          accountId: walletId,
          amount: 200000, // ₹2,000
        });

      expect(allocRes.status).toBe(201);
      expect(allocRes.body.data.allocatedAmount).toBe(200000);
      expect(allocRes.body.data.remainingAmount).toBe(800000);
      expect(allocRes.body.data.isCompleted).toBe(false);
      expect(allocRes.body.data.allocations.length).toBe(1);
      expect(allocRes.body.data.allocations[0].amount).toBe(200000);

      // CRITICAL FINANCIAL INVARIANT CHECKS:
      // 1. Account balance must remain ₹5,000 (unchanged)
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(500000);

      // 2. Total cash must remain ₹7,000 (Wallet ₹5,000 + Room ₹2,000)
      const accsList = await request(app).get('/api/accounts');
      const totalCash = accsList.body.data.reduce(
        (sum: number, a: { balance: number }) => sum + a.balance,
        0
      );
      expect(totalCash).toBe(700000);

      // 3. No fake transactions or transfers created in ledger
      const txs = await request(app).get('/api/transactions');
      expect(txs.body.data.length).toBe(0);
      const trs = await request(app).get('/api/transfers');
      expect(trs.body.data.length).toBe(0);
    });

    it('should reject allocation exceeding account available balance', async () => {
      const goalRes = await request(app).post('/api/goals').send({
        name: 'Car',
        targetAmount: 10000000,
      });
      const goalId = goalRes.body.data.id;

      // Wallet only has ₹5,000 (500000 paise). Attempting to allocate ₹6,000 (600000 paise)
      const res = await request(app)
        .post(`/api/goals/${goalId}/allocations`)
        .send({
          accountId: walletId,
          amount: 600000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('Insufficient available cash');
    });

    it('should prevent spending or transfers that exceed remaining available cash', async () => {
      // Wallet has ₹5,000
      const goalRes = await request(app).post('/api/goals').send({
        name: 'College Fee',
        targetAmount: 400000, // ₹4,000
      });
      const goalId = goalRes.body.data.id;

      // Reserve ₹4,000 in Wallet -> Available in Wallet is now ₹1,000
      await request(app)
        .post(`/api/goals/${goalId}/allocations`)
        .send({
          accountId: walletId,
          amount: 400000,
        });

      // Expense category
      const category = await prisma.category.upsert({
        where: { name: 'Shopping' },
        update: {},
        create: { name: 'Shopping' },
      });
      const catId = category.id.toString();

      // Attempting to spend ₹1,500 from Wallet should fail (available is only ₹1,000)
      const spendRes = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 150000,
        categoryId: catId,
        transactionDate: '2026-09-14',
      });
      expect(spendRes.status).toBe(409);
      expect(spendRes.body.error.message).toContain('Insufficient available cash');

      // Spending ₹800 should succeed (within ₹1,000 available)
      const validSpendRes = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 80000,
        categoryId: catId,
        transactionDate: '2026-09-14',
      });
      expect(validSpendRes.status).toBe(201);
    });

    it('should mark goal as completed when total allocations reach or exceed target amount', async () => {
      const goalRes = await request(app).post('/api/goals').send({
        name: 'Keyboard',
        targetAmount: 300000, // ₹3,000
      });
      const goalId = goalRes.body.data.id;

      // Allocate ₹2,000 from Wallet
      await request(app)
        .post(`/api/goals/${goalId}/allocations`)
        .send({
          accountId: walletId,
          amount: 200000,
        });

      // Allocate ₹1,000 from Room
      const completeRes = await request(app)
        .post(`/api/goals/${goalId}/allocations`)
        .send({
          accountId: roomId,
          amount: 100000,
        });

      expect(completeRes.status).toBe(201);
      expect(completeRes.body.data.allocatedAmount).toBe(300000);
      expect(completeRes.body.data.remainingAmount).toBe(0);
      expect(completeRes.body.data.isCompleted).toBe(true);
    });
  });

  describe('PATCH & DELETE /api/goals/:id/allocations/:allocationId', () => {
    it('should update allocation amount and release or reserve cash accordingly', async () => {
      const goalRes = await request(app).post('/api/goals').send({
        name: 'Headphones',
        targetAmount: 500000, // ₹5,000
      });
      const goalId = goalRes.body.data.id;

      // Initial allocation: ₹3,000 from Wallet
      const allocRes = await request(app)
        .post(`/api/goals/${goalId}/allocations`)
        .send({
          accountId: walletId,
          amount: 300000,
        });
      const allocationId = allocRes.body.data.allocations[0].id;

      // Decrease allocation to ₹1,000 (releases ₹2,000 back to available)
      const updateRes = await request(app)
        .patch(`/api/goals/${goalId}/allocations/${allocationId}`)
        .send({ amount: 100000 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.allocatedAmount).toBe(100000);
      expect(updateRes.body.data.remainingAmount).toBe(400000);
    });

    it('should delete allocation and release all reserved cash back to available', async () => {
      const goalRes = await request(app).post('/api/goals').send({
        name: 'Phone',
        targetAmount: 500000,
      });
      const goalId = goalRes.body.data.id;

      // Allocate ₹3,000 from Wallet
      const allocRes = await request(app)
        .post(`/api/goals/${goalId}/allocations`)
        .send({
          accountId: walletId,
          amount: 300000,
        });
      const allocationId = allocRes.body.data.allocations[0].id;

      // Delete allocation
      const deleteRes = await request(app)
        .delete(`/api/goals/${goalId}/allocations/${allocationId}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.allocatedAmount).toBe(0);
      expect(deleteRes.body.data.allocations.length).toBe(0);
    });
  });

  describe('DELETE /api/goals/:id — Goal Deletion', () => {
    it('should delete goal and cascade delete its allocations, unreserving cash', async () => {
      const goalRes = await request(app).post('/api/goals').send({
        name: 'Temporary Goal',
        targetAmount: 200000,
      });
      const goalId = goalRes.body.data.id;

      await request(app)
        .post(`/api/goals/${goalId}/allocations`)
        .send({
          accountId: walletId,
          amount: 200000,
        });

      const delRes = await request(app).delete(`/api/goals/${goalId}`);
      expect(delRes.status).toBe(200);

      // Verify goal is gone
      const getRes = await request(app).get(`/api/goals/${goalId}`);
      expect(getRes.status).toBe(404);

      // Verify wallet balance is still ₹5,000
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(500000);
    });
  });
});
