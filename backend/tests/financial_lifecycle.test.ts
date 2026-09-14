import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('Phase 11: End-to-End Real-World Financial Lifecycle', () => {
  beforeEach(async () => {
    // Clean database before test
    await prisma.goalAllocation.deleteMany();
    await prisma.goal.deleteMany();
    await prisma.transfer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
  });

  it('executes realistic multi-account financial lifecycle preserving all mathematical invariants', async () => {
    // 1. CREATE ACCOUNTS:
    // Wallet: ₹2,000 (200000 paise)
    // Almirah: ₹5,000 (500000 paise)
    // Bag: ₹1,000 (100000 paise)
    const walletRes = await request(app).post('/api/accounts').send({
      name: 'Wallet',
      initialBalance: 200000,
    });
    expect(walletRes.status).toBe(201);
    const walletId = walletRes.body.data.id.toString();

    const almirahRes = await request(app).post('/api/accounts').send({
      name: 'Almirah',
      initialBalance: 500000,
    });
    expect(almirahRes.status).toBe(201);
    const almirahId = almirahRes.body.data.id.toString();

    const bagRes = await request(app).post('/api/accounts').send({
      name: 'Bag',
      initialBalance: 100000,
    });
    expect(bagRes.status).toBe(201);
    const bagId = bagRes.body.data.id.toString();

    // Verify initial Total Cash = ₹8,000 (800000 paise)
    let accs = await request(app).get('/api/accounts');
    let totalCash = accs.body.data.reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);
    expect(totalCash).toBe(800000);

    // 2. RECEIVE MONEY: ₹1,000 into Wallet
    const incomeRes = await request(app).post('/api/transactions').send({
      accountId: walletId,
      type: 'INCOME',
      amount: 100000, // ₹1,000
      source: 'Allowance',
      note: 'Monthly cash allowance',
      transactionDate: '2026-09-14',
    });
    expect(incomeRes.status).toBe(201);
    const incomeTxId = incomeRes.body.data.id.toString();

    // Verify Wallet = ₹3,000, Total Cash = ₹9,000
    const walletAfterIncome = await request(app).get(`/api/accounts/${walletId}`);
    expect(walletAfterIncome.body.data.balance).toBe(300000);
    accs = await request(app).get('/api/accounts');
    totalCash = accs.body.data.reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);
    expect(totalCash).toBe(900000);

    // 3. SPEND MONEY: ₹300 from Wallet (Expense: Food)
    const category = await prisma.category.upsert({
      where: { name: 'Food' },
      update: {},
      create: { name: 'Food' },
    });
    const foodCatId = category.id.toString();

    const spendRes = await request(app).post('/api/transactions').send({
      accountId: walletId,
      type: 'EXPENSE',
      amount: 30000, // ₹300
      categoryId: foodCatId,
      note: 'Snacks and tea',
      transactionDate: '2026-09-14',
    });
    expect(spendRes.status).toBe(201);
    const spendTxId = spendRes.body.data.id.toString();

    // Verify Wallet = ₹2,700, Total Cash = ₹8,700
    const walletAfterSpend = await request(app).get(`/api/accounts/${walletId}`);
    expect(walletAfterSpend.body.data.balance).toBe(270000);
    accs = await request(app).get('/api/accounts');
    totalCash = accs.body.data.reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);
    expect(totalCash).toBe(870000);

    // 4. TRANSFER MONEY: ₹500 from Wallet to Bag
    const transferRes = await request(app).post('/api/transfers').send({
      fromAccountId: walletId,
      toAccountId: bagId,
      amount: 50000, // ₹500
      note: 'Emergency backup cash',
      transferDate: '2026-09-14',
    });
    expect(transferRes.status).toBe(201);
    const transferId = transferRes.body.data.id.toString();

    // Verify Wallet = ₹2,200, Bag = ₹1,500, Total Cash = ₹8,700 (unchanged)
    const walletAfterTr = await request(app).get(`/api/accounts/${walletId}`);
    expect(walletAfterTr.body.data.balance).toBe(220000);
    const bagAfterTr = await request(app).get(`/api/accounts/${bagId}`);
    expect(bagAfterTr.body.data.balance).toBe(150000);
    accs = await request(app).get('/api/accounts');
    totalCash = accs.body.data.reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);
    expect(totalCash).toBe(870000);

    // 5. CREATE GOAL & ALLOCATE CASH:
    // Goal "Laptop" Target = ₹10,000. Allocate ₹2,000 from Almirah
    const goalRes = await request(app).post('/api/goals').send({
      name: 'Laptop Fund',
      targetAmount: 1000000, // ₹10,000
    });
    expect(goalRes.status).toBe(201);
    const goalId = goalRes.body.data.id.toString();

    const allocRes = await request(app).post(`/api/goals/${goalId}/allocations`).send({
      accountId: almirahId,
      amount: 200000, // ₹2,000
    });
    expect(allocRes.status).toBe(201);
    expect(allocRes.body.data.allocatedAmount).toBe(200000);
    expect(allocRes.body.data.remainingAmount).toBe(800000);
    const allocationId = allocRes.body.data.allocations[0].id.toString();

    // FINANCIAL INVARIANT CHECKS AFTER GOAL ALLOCATION:
    // - Almirah physical balance remains ₹5,000 (unchanged)
    const almirahAcc = await request(app).get(`/api/accounts/${almirahId}`);
    expect(almirahAcc.body.data.balance).toBe(500000);

    // - Total Cash remains ₹8,700 (unchanged)
    accs = await request(app).get('/api/accounts');
    totalCash = accs.body.data.reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);
    expect(totalCash).toBe(870000);

    // - Goals reserved cash = ₹2,000, Available cash = ₹8,700 - ₹2,000 = ₹6,700
    const goalsList = await request(app).get('/api/goals');
    const reservedCash = goalsList.body.data.reduce((sum: number, g: { allocatedAmount: number }) => sum + g.allocatedAmount, 0);
    expect(reservedCash).toBe(200000);
    const availableCash = totalCash - reservedCash;
    expect(availableCash).toBe(670000);

    // 6. EDIT TRANSACTION: Change spend from ₹300 to ₹400
    const editSpendRes = await request(app).patch(`/api/transactions/${spendTxId}`).send({
      amount: 40000, // ₹400
    });
    expect(editSpendRes.status).toBe(200);

    // Wallet is now ₹2,100, Total Cash = ₹8,600, Available Cash = ₹6,600
    const walletAfterEdit = await request(app).get(`/api/accounts/${walletId}`);
    expect(walletAfterEdit.body.data.balance).toBe(210000);
    accs = await request(app).get('/api/accounts');
    totalCash = accs.body.data.reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);
    expect(totalCash).toBe(860000);

    // 7. EDIT ALLOCATION: Increase allocation from ₹2,000 to ₹3,000
    const updateAllocRes = await request(app).patch(`/api/goals/${goalId}/allocations/${allocationId}`).send({
      amount: 300000, // ₹3,000
    });
    expect(updateAllocRes.status).toBe(200);
    expect(updateAllocRes.body.data.allocatedAmount).toBe(300000);

    // Almirah physical balance is still ₹5,000, but only ₹2,000 is available for spending
    const almirahCheck = await request(app).get(`/api/accounts/${almirahId}`);
    expect(almirahCheck.body.data.balance).toBe(500000);

    // 8. OVER-SPEND PROTECTION: Attempt spending ₹2,500 from Almirah (available is only ₹2,000)
    const overSpendRes = await request(app).post('/api/transactions').send({
      accountId: almirahId,
      type: 'EXPENSE',
      amount: 250000,
      categoryId: foodCatId,
      transactionDate: '2026-09-14',
    });
    expect(overSpendRes.status).toBe(409);
    expect(overSpendRes.body.error.message).toContain('Insufficient available cash');

    // 9. OVER-TRANSFER PROTECTION: Attempt transferring ₹2,500 from Almirah to Wallet
    const overTransferRes = await request(app).post('/api/transfers').send({
      fromAccountId: almirahId,
      toAccountId: walletId,
      amount: 250000,
      transferDate: '2026-09-14',
    });
    expect(overTransferRes.status).toBe(409);
    expect(overTransferRes.body.error.message).toContain('Insufficient available cash');

    // 10. RELEASE ALLOCATION: Delete allocation
    const releaseRes = await request(app).delete(`/api/goals/${goalId}/allocations/${allocationId}`);
    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.data.allocatedAmount).toBe(0);

    // All ₹5,000 in Almirah is now available again
    const almirahPostRelease = await request(app).get(`/api/accounts/${almirahId}`);
    expect(almirahPostRelease.body.data.balance).toBe(500000);

    // 11. DELETE TRANSACTION: Delete ₹400 expense
    const delSpendRes = await request(app).delete(`/api/transactions/${spendTxId}`);
    expect(delSpendRes.status).toBe(200);

    // Wallet balance restored to ₹2,500, Total Cash = ₹9,000
    const walletPostDel = await request(app).get(`/api/accounts/${walletId}`);
    expect(walletPostDel.body.data.balance).toBe(250000);

    // 12. DELETE TRANSFER: Delete ₹500 transfer
    const delTransferRes = await request(app).delete(`/api/transfers/${transferId}`);
    expect(delTransferRes.status).toBe(200);

    // Wallet = ₹3,000, Bag = ₹1,000
    const walletFinal = await request(app).get(`/api/accounts/${walletId}`);
    expect(walletFinal.body.data.balance).toBe(300000);
    const bagFinal = await request(app).get(`/api/accounts/${bagId}`);
    expect(bagFinal.body.data.balance).toBe(100000);

    // 13. ARCHIVE ACCOUNT: Archive Bag
    const archiveRes = await request(app).delete(`/api/accounts/${bagId}`);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.isActive).toBe(false);

    // Cannot spend from archived account
    const spendArchivedRes = await request(app).post('/api/transactions').send({
      accountId: bagId,
      type: 'EXPENSE',
      amount: 10000,
      categoryId: foodCatId,
      transactionDate: '2026-09-14',
    });
    expect(spendArchivedRes.status).toBe(400);

    // 14. DELETE GOAL: Delete goal
    const delGoalRes = await request(app).delete(`/api/goals/${goalId}`);
    expect(delGoalRes.status).toBe(200);
    const checkGoal = await request(app).get(`/api/goals/${goalId}`);
    expect(checkGoal.status).toBe(404);
  });
});
