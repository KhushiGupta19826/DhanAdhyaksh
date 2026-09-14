import { Transaction, TransactionType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import {
  ValidationError,
  NotFoundError,
  InsufficientFundsError,
} from '../utils/errors';
import {
  validateString,
  validatePaise,
  validateId,
  validateDate,
  validateEnum,
} from '../utils/validation';
import { computeAvailableBalanceById } from './account.service';

export interface CreateTransactionInput {
  accountId: unknown;
  type: unknown;
  amount: unknown;
  source?: unknown;
  categoryId?: unknown;
  note?: unknown;
  transactionDate: unknown;
}

export interface FilterTransactionsInput {
  accountId?: unknown;
  type?: unknown;
  categoryId?: unknown;
  fromDate?: unknown;
  toDate?: unknown;
}

export interface UpdateTransactionInput {
  accountId?: unknown;
  type?: unknown;
  amount?: unknown;
  source?: unknown;
  categoryId?: unknown;
  note?: unknown;
  transactionDate?: unknown;
}

/**
 * Creates a new transaction (INCOME or EXPENSE) with financial safety checks.
 */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  const accountId = validateId(input.accountId, 'accountId');

  // Verify account existence and active status
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  if (!account.isActive) {
    throw new ValidationError('Transactions cannot be created for an archived account');
  }

  const type = validateEnum(
    input.type,
    [TransactionType.INCOME, TransactionType.EXPENSE] as const,
    'type'
  );
  const amount = validatePaise(input.amount, 'amount');
  const transactionDate = validateDate(input.transactionDate, 'transactionDate');

  let note: string | null = null;
  if (input.note !== undefined && input.note !== null && String(input.note).trim() !== '') {
    note = validateString(input.note, 'note', { required: false, max: 1000 });
  }

  let source: string | null = null;
  let categoryId: bigint | null = null;

  if (type === TransactionType.INCOME) {
    source = validateString(input.source, 'source', { min: 1, max: 255 });
    categoryId = null;
  } else {
    // EXPENSE
    categoryId = validateId(input.categoryId, 'categoryId');
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    source = null;

    // Check available balance before creating expense
    const { availableBalance } = await computeAvailableBalanceById(accountId);
    if (amount > availableBalance) {
      throw new InsufficientFundsError('Insufficient available cash for this expense');
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      accountId,
      type,
      amount,
      source,
      categoryId,
      note,
      transactionDate,
    },
    include: {
      account: true,
      category: true,
    },
  });

  return transaction;
}

/**
 * Retrieves transactions with optional server-side filtering.
 * Ordered by transactionDate DESC, id DESC (newest first).
 */
export async function getTransactions(
  filters: FilterTransactionsInput = {}
): Promise<Transaction[]> {
  const where: any = {};

  if (filters.accountId !== undefined && filters.accountId !== null && filters.accountId !== '') {
    where.accountId = validateId(filters.accountId, 'accountId');
  }

  if (filters.type !== undefined && filters.type !== null && filters.type !== '') {
    where.type = validateEnum(
      filters.type,
      [TransactionType.INCOME, TransactionType.EXPENSE] as const,
      'type'
    );
  }

  if (filters.categoryId !== undefined && filters.categoryId !== null && filters.categoryId !== '') {
    where.categoryId = validateId(filters.categoryId, 'categoryId');
  }

  if (
    (filters.fromDate !== undefined && filters.fromDate !== null && filters.fromDate !== '') ||
    (filters.toDate !== undefined && filters.toDate !== null && filters.toDate !== '')
  ) {
    where.transactionDate = {};
    if (filters.fromDate !== undefined && filters.fromDate !== null && filters.fromDate !== '') {
      where.transactionDate.gte = validateDate(filters.fromDate, 'fromDate');
    }
    if (filters.toDate !== undefined && filters.toDate !== null && filters.toDate !== '') {
      where.transactionDate.lte = validateDate(filters.toDate, 'toDate');
    }
  }

  return prisma.transaction.findMany({
    where,
    orderBy: [
      { transactionDate: 'desc' },
      { id: 'desc' },
    ],
    include: {
      account: true,
      category: true,
    },
  });
}

/**
 * Retrieves a single transaction by ID.
 */
export async function getTransactionById(rawId: unknown): Promise<Transaction> {
  const id = validateId(rawId, 'id');
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      account: true,
      category: true,
    },
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  return transaction;
}

/**
 * Updates a transaction with atomic balance validation.
 */
export async function updateTransaction(
  rawId: unknown,
  input: UpdateTransactionInput
): Promise<Transaction> {
  const id = validateId(rawId, 'id');
  const existing = await prisma.transaction.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Transaction not found');
  }

  const targetAccountId = input.accountId !== undefined ? validateId(input.accountId, 'accountId') : existing.accountId;
  const targetType = input.type !== undefined
    ? validateEnum(input.type, [TransactionType.INCOME, TransactionType.EXPENSE] as const, 'type')
    : existing.type;
  const targetAmount = input.amount !== undefined ? validatePaise(input.amount, 'amount') : existing.amount;
  const targetDate = input.transactionDate !== undefined ? validateDate(input.transactionDate, 'transactionDate') : existing.transactionDate;

  let targetNote: string | null = existing.note;
  if (input.note !== undefined) {
    if (input.note === null || String(input.note).trim() === '') {
      targetNote = null;
    } else {
      targetNote = validateString(input.note, 'note', { required: false, max: 1000 });
    }
  }

  let targetSource: string | null = null;
  let targetCategoryId: bigint | null = null;

  if (targetType === TransactionType.INCOME) {
    if (input.source !== undefined) {
      targetSource = validateString(input.source, 'source', { min: 1, max: 255 });
    } else if (existing.source !== null) {
      targetSource = existing.source;
    } else {
      throw new ValidationError("'source' is required for INCOME transactions");
    }
    targetCategoryId = null;
  } else {
    // EXPENSE
    if (input.categoryId !== undefined) {
      targetCategoryId = validateId(input.categoryId, 'categoryId');
    } else if (existing.categoryId !== null) {
      targetCategoryId = existing.categoryId;
    } else {
      throw new ValidationError("'categoryId' is required for EXPENSE transactions");
    }
    const category = await prisma.category.findUnique({ where: { id: targetCategoryId } });
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    targetSource = null;
  }

  // Check target account existence and active status
  const targetAccount = await prisma.account.findUnique({ where: { id: targetAccountId } });
  if (!targetAccount) {
    throw new NotFoundError('Account not found');
  }
  if (!targetAccount.isActive) {
    throw new ValidationError('Cannot assign transaction to an archived account');
  }

  // Execute update inside a Prisma $transaction block and validate balance outcome
  return prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.update({
      where: { id },
      data: {
        accountId: targetAccountId,
        type: targetType,
        amount: targetAmount,
        source: targetSource,
        categoryId: targetCategoryId,
        note: targetNote,
        transactionDate: targetDate,
      },
      include: {
        account: true,
        category: true,
      },
    });

    // Check available balance on destination account
    const { availableBalance: targetAvail } = await computeAvailableBalanceById(targetAccountId, tx);
    if (targetAvail < 0n) {
      throw new InsufficientFundsError('Editing transaction causes insufficient funds in account');
    }

    // If account changed, check available balance on old account as well
    if (existing.accountId !== targetAccountId) {
      const { availableBalance: oldAvail } = await computeAvailableBalanceById(existing.accountId, tx);
      if (oldAvail < 0n) {
        throw new InsufficientFundsError('Moving transaction causes insufficient funds in original account');
      }
    }

    return updated;
  });
}

/**
 * Deletes a transaction atomically.
 * Verifies that deleting an income does not cause negative available cash.
 */
export async function deleteTransaction(rawId: unknown): Promise<Transaction> {
  const id = validateId(rawId, 'id');
  const existing = await prisma.transaction.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Transaction not found');
  }

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.transaction.delete({ where: { id } });

    // Validate that removing financial effect doesn't leave account with negative available balance
    const { availableBalance } = await computeAvailableBalanceById(existing.accountId, tx);
    if (availableBalance < 0n) {
      throw new InsufficientFundsError('Deleting this transaction causes insufficient funds in account');
    }

    return deleted;
  });
}
