import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('Phase 7: Transfers API', () => {
  let walletId: string;
  let roomId: string;
  let bagId: string;

  beforeEach(async () => {
    // Clean database before each test run
    await prisma.goalAllocation.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();

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

    const bagRes = await request(app).post('/api/accounts').send({
      name: 'Bag',
      initialBalance: 0, // ₹0
    });
    bagId = bagRes.body.data.id.toString();
  });

  describe('POST /api/transfers — Create Transfer', () => {
    it('should create a transfer successfully, update balances, preserve total cash, and create zero transactions', async () => {
      // Calculate total cash before transfer
      const listBefore = await request(app).get('/api/accounts');
      const totalCashBefore = listBefore.body.data.reduce(
        (sum: number, acc: { balance: number }) => sum + acc.balance,
        0
      );
      expect(totalCashBefore).toBe(300000); // ₹3,000

      const res = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 50000, // ₹500
        note: 'Move cash to room',
        transferDate: '2026-09-14',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        fromAccountId: Number(walletId),
        toAccountId: Number(roomId),
        amount: 50000,
        note: 'Move cash to room',
      });

      // Verify source balance decreased (Wallet: ₹2,000 -> ₹1,500)
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(150000);

      // Verify destination balance increased (Room: ₹1,000 -> ₹1,500)
      const roomAcc = await request(app).get(`/api/accounts/${roomId}`);
      expect(roomAcc.body.data.balance).toBe(150000);

      // CRITICAL TOTAL CASH INVARIANT: totalCashBefore === totalCashAfter
      const listAfter = await request(app).get('/api/accounts');
      const totalCashAfter = listAfter.body.data.reduce(
        (sum: number, acc: { balance: number }) => sum + acc.balance,
        0
      );
      expect(totalCashAfter).toBe(totalCashBefore);

      // NON-TRANSACTION INVARIANT: Zero Transaction records created
      const txCount = await prisma.transaction.count();
      expect(txCount).toBe(0);
    });

    it('should reject same-account transfer (fromAccountId === toAccountId)', async () => {
      const res = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: walletId,
        amount: 10000,
        transferDate: '2026-09-14',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/must be different/i);
    });

    it('should reject non-positive or floating-point amounts', async () => {
      const res1 = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 0,
        transferDate: '2026-09-14',
      });
      expect(res1.status).toBe(400);

      const res2 = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 99.5,
        transferDate: '2026-09-14',
      });
      expect(res2.status).toBe(400);
    });

    it('should reject transfer involving non-existent accounts', async () => {
      const res = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: '999999',
        amount: 10000,
        transferDate: '2026-09-14',
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject transfer involving an archived source or destination account', async () => {
      await request(app).delete(`/api/accounts/${roomId}`);

      const res = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 10000,
        transferDate: '2026-09-14',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/archived/i);
    });

    it('should reject transfer exceeding available balance with 409 INSUFFICIENT_FUNDS and leave DB unchanged', async () => {
      // Wallet balance = ₹2,000 (200000 paise). Attempt transfer ₹2,500 (250000 paise)
      const res = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 250000,
        transferDate: '2026-09-14',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient available cash for this transfer',
      });

      // Verify no transfer was created
      const transferCount = await prisma.transfer.count();
      expect(transferCount).toBe(0);

      // Verify Wallet balance is still ₹2,000
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(200000);
    });
  });

  describe('GET /api/transfers — List & Filter Transfers', () => {
    it('should list transfers in newest-first order', async () => {
      await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 10000,
        transferDate: '2026-09-01',
      });

      await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: bagId,
        amount: 20000,
        transferDate: '2026-09-10',
      });

      const res = await request(app).get('/api/transfers');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].transferDate).toMatch(/^2026-09-10/);
      expect(res.body.data[1].transferDate).toMatch(/^2026-09-01/);
    });

    it('should filter transfers by fromAccountId and toAccountId', async () => {
      await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 10000,
        transferDate: '2026-09-01',
      });

      await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: bagId,
        amount: 20000,
        transferDate: '2026-09-02',
      });

      const res = await request(app).get(`/api/transfers?toAccountId=${bagId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].toAccountId).toBe(Number(bagId));
    });

    it('should return 404 for non-existent single transfer GET', async () => {
      const res = await request(app).get('/api/transfers/999999');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/transfers/:id — Edit Transfer', () => {
    it('should edit transfer amount and preserve total cash invariant', async () => {
      const createRes = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 50000, // ₹500
        transferDate: '2026-09-14',
      });
      const transferId = createRes.body.data.id;

      // Edit transfer: ₹500 -> ₹800 (80000 paise)
      const editRes = await request(app).patch(`/api/transfers/${transferId}`).send({
        amount: 80000,
      });

      expect(editRes.status).toBe(200);
      expect(editRes.body.data.amount).toBe(80000);

      // Wallet = ₹2,000 - ₹800 = ₹1,200 (120000 paise)
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(120000);

      // Room = ₹1,000 + ₹800 = ₹1,800 (180000 paise)
      const roomAcc = await request(app).get(`/api/accounts/${roomId}`);
      expect(roomAcc.body.data.balance).toBe(180000);

      // Total cash invariant = ₹3,000
      const listRes = await request(app).get('/api/accounts');
      const totalCash = listRes.body.data.reduce((sum: number, acc: { balance: number }) => sum + acc.balance, 0);
      expect(totalCash).toBe(300000);
    });

    it('should edit transfer destination account and correctly update all 3 affected balances', async () => {
      // Initial: Wallet = ₹2,000, Room = ₹1,000, Bag = ₹0
      const createRes = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 50000, // ₹500 Wallet -> Room
        transferDate: '2026-09-14',
      });
      const transferId = createRes.body.data.id;

      // Change destination from Room to Bag
      const editRes = await request(app).patch(`/api/transfers/${transferId}`).send({
        toAccountId: bagId,
      });
      expect(editRes.status).toBe(200);

      // Wallet = ₹1,500 (200000 - 50000)
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(150000);

      // Room = ₹1,000 (restored to initial)
      const roomAcc = await request(app).get(`/api/accounts/${roomId}`);
      expect(roomAcc.body.data.balance).toBe(100000);

      // Bag = ₹500 (0 + 50000)
      const bagAcc = await request(app).get(`/api/accounts/${bagId}`);
      expect(bagAcc.body.data.balance).toBe(50000);
    });

    it('FAILED EDIT ROLLBACK INVARIANT: should reject edit causing insufficient funds and leave original transfer completely unchanged', async () => {
      // Wallet = ₹2,000, Room = ₹1,000
      // Transfer ₹1,500 from Wallet to Room (Wallet balance = ₹500)
      const createRes = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 150000,
        transferDate: '2026-09-14',
      });
      const transferId = createRes.body.data.id;

      // Attempt to edit transfer amount to ₹2,500 (Wallet only had ₹2,000 initial)
      const editRes = await request(app).patch(`/api/transfers/${transferId}`).send({
        amount: 250000,
      });

      expect(editRes.status).toBe(409);
      expect(editRes.body.error.code).toBe('INSUFFICIENT_FUNDS');

      // Verify original transfer in database is completely unchanged
      const getTransfer = await request(app).get(`/api/transfers/${transferId}`);
      expect(getTransfer.body.data.amount).toBe(150000);

      // Verify Wallet balance is still ₹500
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(50000);
    });
  });

  describe('DELETE /api/transfers/:id — Delete Transfer', () => {
    it('should delete a transfer, restore account balances, and preserve total cash invariant', async () => {
      const createRes = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 50000, // ₹500
        transferDate: '2026-09-14',
      });
      const transferId = createRes.body.data.id;

      const deleteRes = await request(app).delete(`/api/transfers/${transferId}`);
      expect(deleteRes.status).toBe(200);

      // Verify transfer no longer exists
      const getRes = await request(app).get(`/api/transfers/${transferId}`);
      expect(getRes.status).toBe(404);

      // Wallet restored to ₹2,000
      const walletAcc = await request(app).get(`/api/accounts/${walletId}`);
      expect(walletAcc.body.data.balance).toBe(200000);

      // Room restored to ₹1,000
      const roomAcc = await request(app).get(`/api/accounts/${roomId}`);
      expect(roomAcc.body.data.balance).toBe(100000);
    });
  });

  describe('Step 20 Verification Scenario: End-to-End Transfer Lifecycle & Invariants', () => {
    it('should process Wallet (₹2,000) & Room (₹1,000) -> Transfer ₹500 -> Edit to ₹800 -> Move to Bag -> Delete transfer', async () => {
      // 1. Initial State: Wallet = ₹2,000, Room = ₹1,000, Bag = ₹0. Total = ₹3,000
      const w0 = await request(app).get(`/api/accounts/${walletId}`);
      const r0 = await request(app).get(`/api/accounts/${roomId}`);
      const b0 = await request(app).get(`/api/accounts/${bagId}`);
      expect(w0.body.data.balance).toBe(200000);
      expect(r0.body.data.balance).toBe(100000);
      expect(b0.body.data.balance).toBe(0);

      // 2. Create Transfer: Wallet -> Room ₹500 (50000 paise)
      const createRes = await request(app).post('/api/transfers').send({
        fromAccountId: walletId,
        toAccountId: roomId,
        amount: 50000,
        transferDate: '2026-09-14',
      });
      const transferId = createRes.body.data.id;

      const w1 = await request(app).get(`/api/accounts/${walletId}`);
      const r1 = await request(app).get(`/api/accounts/${roomId}`);
      expect(w1.body.data.balance).toBe(150000); // ₹1,500
      expect(r1.body.data.balance).toBe(150000); // ₹1,500
      expect(w1.body.data.balance + r1.body.data.balance).toBe(300000); // Total = ₹3,000

      // 3. Edit Transfer: ₹500 -> ₹800 (80000 paise)
      await request(app).patch(`/api/transfers/${transferId}`).send({
        amount: 80000,
      });

      const w2 = await request(app).get(`/api/accounts/${walletId}`);
      const r2 = await request(app).get(`/api/accounts/${roomId}`);
      expect(w2.body.data.balance).toBe(120000); // ₹1,200
      expect(r2.body.data.balance).toBe(180000); // ₹1,800
      expect(w2.body.data.balance + r2.body.data.balance).toBe(300000); // Total = ₹3,000

      // 4. Edit destination: Wallet -> Room becomes Wallet -> Bag
      await request(app).patch(`/api/transfers/${transferId}`).send({
        toAccountId: bagId,
      });

      const w3 = await request(app).get(`/api/accounts/${walletId}`);
      const r3 = await request(app).get(`/api/accounts/${roomId}`);
      const b3 = await request(app).get(`/api/accounts/${bagId}`);
      expect(w3.body.data.balance).toBe(120000); // ₹1,200
      expect(r3.body.data.balance).toBe(100000); // ₹1,000
      expect(b3.body.data.balance).toBe(80000);  // ₹800
      expect(w3.body.data.balance + r3.body.data.balance + b3.body.data.balance).toBe(300000); // Total = ₹3,000

      // 5. Delete Transfer
      await request(app).delete(`/api/transfers/${transferId}`);

      const w4 = await request(app).get(`/api/accounts/${walletId}`);
      const r4 = await request(app).get(`/api/accounts/${roomId}`);
      const b4 = await request(app).get(`/api/accounts/${bagId}`);
      expect(w4.body.data.balance).toBe(200000); // ₹2,000
      expect(r4.body.data.balance).toBe(100000); // ₹1,000
      expect(b4.body.data.balance).toBe(0);      // ₹0
      expect(w4.body.data.balance + r4.body.data.balance + b4.body.data.balance).toBe(300000); // Total = ₹3,000
    });
  });
});
