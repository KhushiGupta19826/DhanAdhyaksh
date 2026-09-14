import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('Phase 6: Transactions API', () => {
  let walletId: string;
  let roomId: string;
  let foodCategoryId: string;
  let travelCategoryId: string;

  beforeEach(async () => {
    // Clean database before each test run
    await prisma.goalAllocation.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
    await prisma.category.deleteMany();

    // Create categories
    const foodCat = await prisma.category.create({ data: { name: 'Food' } });
    const travelCat = await prisma.category.create({ data: { name: 'Travel' } });
    foodCategoryId = foodCat.id.toString();
    travelCategoryId = travelCat.id.toString();

    // Create test accounts
    const walletRes = await request(app).post('/api/accounts').send({
      name: 'Wallet',
      initialBalance: 200000, // ₹2,000
    });
    walletId = walletRes.body.data.id.toString();

    const roomRes = await request(app).post('/api/accounts').send({
      name: 'Room',
      initialBalance: 100000, // ₹1,000
    });
    roomId = roomRes.body.data.id.toString();
  });

  describe('POST /api/transactions — Receive Money (INCOME)', () => {
    it('should create an income transaction successfully and increase account balance', async () => {
      const res = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'INCOME',
        amount: 100000, // ₹1,000
        source: 'Mom',
        note: 'Monthly allowance',
        transactionDate: '2026-09-14',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        type: 'INCOME',
        amount: 100000,
        source: 'Mom',
        note: 'Monthly allowance',
        transactionDate: '2026-09-14T00:00:00.000Z',
      });
      expect(res.body.data.categoryId).toBeNull();

      // Verify wallet balance increased from ₹2,000 to ₹3,000 (300000 paise)
      const accRes = await request(app).get(`/api/accounts/${walletId}`);
      expect(accRes.body.data.balance).toBe(300000);
    });

    it('should reject income missing source', async () => {
      const res = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'INCOME',
        amount: 50000,
        transactionDate: '2026-09-14',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/'source' is required/i);
    });

    it('should reject income with non-positive or floating-point amount', async () => {
      const res1 = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'INCOME',
        amount: 0,
        source: 'Salary',
        transactionDate: '2026-09-14',
      });
      expect(res1.status).toBe(400);

      const res2 = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'INCOME',
        amount: 99.5,
        source: 'Salary',
        transactionDate: '2026-09-14',
      });
      expect(res2.status).toBe(400);
    });

    it('should reject creating income for an archived account', async () => {
      await request(app).delete(`/api/accounts/${walletId}`);

      const res = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'INCOME',
        amount: 50000,
        source: 'Freelance',
        transactionDate: '2026-09-14',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/archived account/i);
    });
  });

  describe('POST /api/transactions — Spend Money (EXPENSE)', () => {
    it('should create an expense transaction successfully and decrease account balance', async () => {
      const res = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 50000, // ₹500
        categoryId: foodCategoryId,
        note: 'Lunch',
        transactionDate: '2026-09-14',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        type: 'EXPENSE',
        amount: 50000,
        note: 'Lunch',
      });
      expect(res.body.data.source).toBeNull();

      // Verify wallet balance decreased from ₹2,000 to ₹1,500 (150000 paise)
      const accRes = await request(app).get(`/api/accounts/${walletId}`);
      expect(accRes.body.data.balance).toBe(150000);
    });

    it('should reject expense missing categoryId', async () => {
      const res = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 50000,
        transactionDate: '2026-09-14',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject expense with non-existent categoryId', async () => {
      const res = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 50000,
        categoryId: '999999',
        transactionDate: '2026-09-14',
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject expense exceeding available cash with 409 INSUFFICIENT_FUNDS', async () => {
      // Wallet initial balance = ₹2,000 (200000 paise)
      // Attempt expense = ₹2,500 (250000 paise)
      const res = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 250000,
        categoryId: foodCategoryId,
        transactionDate: '2026-09-14',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient available cash for this expense',
      });

      // Verify database remains unchanged and wallet balance is still ₹2,000
      const accRes = await request(app).get(`/api/accounts/${walletId}`);
      expect(accRes.body.data.balance).toBe(200000);
    });
  });

  describe('GET /api/transactions — List & Filter Transactions', () => {
    it('should list transactions in newest-first order', async () => {
      await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'INCOME',
        amount: 100000,
        source: 'Mom',
        transactionDate: '2026-09-01',
      });

      await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 20000,
        categoryId: foodCategoryId,
        transactionDate: '2026-09-10',
      });

      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].transactionDate).toMatch(/^2026-09-10/);
      expect(res.body.data[1].transactionDate).toMatch(/^2026-09-01/);
    });

    it('should filter transactions by accountId and type', async () => {
      await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'INCOME',
        amount: 100000,
        source: 'Mom',
        transactionDate: '2026-09-01',
      });

      await request(app).post('/api/transactions').send({
        accountId: roomId,
        type: 'EXPENSE',
        amount: 10000,
        categoryId: travelCategoryId,
        transactionDate: '2026-09-02',
      });

      const res = await request(app).get(`/api/transactions?accountId=${walletId}&type=INCOME`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].accountId).toBe(Number(walletId));
      expect(res.body.data[0].type).toBe('INCOME');
    });

    it('should filter transactions by date range', async () => {
      await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'INCOME',
        amount: 100000,
        source: 'Mom',
        transactionDate: '2026-09-01',
      });

      await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 20000,
        categoryId: foodCategoryId,
        transactionDate: '2026-09-15',
      });

      const res = await request(app).get('/api/transactions?fromDate=2026-09-10&toDate=2026-09-20');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].type).toBe('EXPENSE');
    });

    it('should return 404 for missing single transaction GET', async () => {
      const res = await request(app).get('/api/transactions/999999');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/transactions/:id — Edit Transaction', () => {
    it('should edit transaction details (note, amount, date) and correctly recalculate balance', async () => {
      const createRes = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 50000, // ₹500
        categoryId: foodCategoryId,
        note: 'Lunch',
        transactionDate: '2026-09-14',
      });
      const txId = createRes.body.data.id;

      const editRes = await request(app).patch(`/api/transactions/${txId}`).send({
        amount: 80000, // ₹800
        note: 'Fancy Dinner',
        transactionDate: '2026-09-15',
      });

      expect(editRes.status).toBe(200);
      expect(editRes.body.data.amount).toBe(80000);
      expect(editRes.body.data.note).toBe('Fancy Dinner');

      // Wallet balance was ₹2,000, now minus ₹800 = ₹1,200 (120000 paise)
      const accRes = await request(app).get(`/api/accounts/${walletId}`);
      expect(accRes.body.data.balance).toBe(120000);
    });

    it('should correctly move transaction to another account', async () => {
      // Wallet = ₹2,000, Room = ₹1,000
      const createRes = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 50000, // ₹500 expense on Wallet
        categoryId: foodCategoryId,
        transactionDate: '2026-09-14',
      });
      const txId = createRes.body.data.id;

      // Move expense to Room
      const editRes = await request(app).patch(`/api/transactions/${txId}`).send({
        accountId: roomId,
      });
      expect(editRes.status).toBe(200);

      // Wallet balance restored to ₹2,000
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(200000);

      // Room balance reduced to ₹500 (100000 - 50000 = 50000)
      const roomAcc = await request(app).get(`/api/accounts/${roomId}`);
      expect(roomAcc.body.data.balance).toBe(50000);
    });

    it('should reject edit that causes negative available cash with 409 INSUFFICIENT_FUNDS', async () => {
      const createRes = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 50000, // ₹500 expense (Wallet balance = ₹1,500)
        categoryId: foodCategoryId,
        transactionDate: '2026-09-14',
      });
      const txId = createRes.body.data.id;

      // Edit expense amount to ₹3,000 (exceeds ₹2,000 initial balance)
      const editRes = await request(app).patch(`/api/transactions/${txId}`).send({
        amount: 300000,
      });

      expect(editRes.status).toBe(409);
      expect(editRes.body.error.code).toBe('INSUFFICIENT_FUNDS');

      // Verify transaction amount was NOT updated and balance remains ₹1,500
      const getTx = await request(app).get(`/api/transactions/${txId}`);
      expect(getTx.body.data.amount).toBe(50000);

      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(150000);
    });
  });

  describe('DELETE /api/transactions/:id — Delete Transaction', () => {
    it('should delete an expense transaction and restore previous balance', async () => {
      const createRes = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 50000, // ₹500
        categoryId: foodCategoryId,
        transactionDate: '2026-09-14',
      });
      const txId = createRes.body.data.id;

      const deleteRes = await request(app).delete(`/api/transactions/${txId}`);
      expect(deleteRes.status).toBe(200);

      // Verify transaction no longer exists
      const getTx = await request(app).get(`/api/transactions/${txId}`);
      expect(getTx.status).toBe(404);

      // Balance restored to ₹2,000
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(200000);
    });

    it('should reject deleting income if doing so causes negative balance', async () => {
      // Wallet initial balance = 0
      const zeroAcc = await request(app).post('/api/accounts').send({ name: 'Zero Acc', initialBalance: 0 });
      const zeroAccId = zeroAcc.body.data.id;

      // Income ₹1,000 -> Balance ₹1,000
      const incRes = await request(app).post('/api/transactions').send({
        accountId: zeroAccId,
        type: 'INCOME',
        amount: 100000,
        source: 'Gift',
        transactionDate: '2026-09-14',
      });
      const incId = incRes.body.data.id;

      // Expense ₹800 -> Balance ₹200
      await request(app).post('/api/transactions').send({
        accountId: zeroAccId,
        type: 'EXPENSE',
        amount: 80000,
        categoryId: foodCategoryId,
        transactionDate: '2026-09-14',
      });

      // Attempt deleting Income ₹1,000 (would leave balance at -₹800)
      const deleteRes = await request(app).delete(`/api/transactions/${incId}`);
      expect(deleteRes.status).toBe(409);
      expect(deleteRes.body.error.code).toBe('INSUFFICIENT_FUNDS');
    });
  });

  describe('Important End-to-End Financial Scenario', () => {
    it('should correctly process: Wallet (₹2,000) -> Receive ₹1,000 -> Spend ₹500 -> Edit expense ₹500->₹800 -> Delete expense -> Delete income', async () => {
      // 1. Start with Wallet initial balance = ₹2,000 (200000 paise)
      const walletAcc0 = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc0.body.data.balance).toBe(200000);

      // 2. Receive ₹1,000 (100000 paise)
      const incRes = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'INCOME',
        amount: 100000,
        source: 'Mom',
        transactionDate: '2026-09-14',
      });
      const incId = incRes.body.data.id;

      const walletAcc1 = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc1.body.data.balance).toBe(300000); // ₹3,000

      // 3. Spend ₹500 (50000 paise)
      const expRes = await request(app).post('/api/transactions').send({
        accountId: walletId,
        type: 'EXPENSE',
        amount: 50000,
        categoryId: foodCategoryId,
        transactionDate: '2026-09-14',
      });
      const expId = expRes.body.data.id;

      const walletAcc2 = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc2.body.data.balance).toBe(250000); // ₹2,500

      // 4. Edit expense: ₹500 -> ₹800 (80000 paise)
      await request(app).patch(`/api/transactions/${expId}`).send({
        amount: 80000,
      });

      const walletAcc3 = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc3.body.data.balance).toBe(220000); // ₹2,200

      // 5. Delete expense
      await request(app).delete(`/api/transactions/${expId}`);

      const walletAcc4 = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc4.body.data.balance).toBe(300000); // ₹3,000

      // 6. Delete income
      await request(app).delete(`/api/transactions/${incId}`);

      const walletAcc5 = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc5.body.data.balance).toBe(200000); // ₹2,000
    });
  });
});
