import { Transfer, PrismaClient, Prisma } from '@prisma/client';
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
} from '../utils/validation';
import { computeAvailableBalanceById } from './account.service';

export interface CreateTransferInput {
  fromAccountId: unknown;
  toAccountId: unknown;
  amount: unknown;
  note?: unknown;
  transferDate: unknown;
}

export interface FilterTransfersInput {
  fromAccountId?: unknown;
  toAccountId?: unknown;
  fromDate?: unknown;
  toDate?: unknown;
}

export interface UpdateTransferInput {
  fromAccountId?: unknown;
  toAccountId?: unknown;
  amount?: unknown;
  note?: unknown;
  transferDate?: unknown;
}

/**
 * Creates a physical cash transfer between two distinct active accounts.
 */
export async function createTransfer(input: CreateTransferInput): Promise<Transfer> {
  const fromAccountId = validateId(input.fromAccountId, 'fromAccountId');
  const toAccountId = validateId(input.toAccountId, 'toAccountId');

  if (fromAccountId === toAccountId) {
    throw new ValidationError('Source and destination accounts must be different');
  }

  const amount = validatePaise(input.amount, 'amount');
  const transferDate = validateDate(input.transferDate, 'transferDate');

  let note: string | null = null;
  if (input.note !== undefined && input.note !== null && String(input.note).trim() !== '') {
    note = validateString(input.note, 'note', { required: false, max: 1000 });
  }

  // Verify accounts exist and are active
  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findUnique({ where: { id: fromAccountId } }),
    prisma.account.findUnique({ where: { id: toAccountId } }),
  ]);

  if (!fromAccount) {
    throw new NotFoundError('Source account not found');
  }
  if (!toAccount) {
    throw new NotFoundError('Destination account not found');
  }

  if (!fromAccount.isActive) {
    throw new ValidationError('Source account is archived');
  }
  if (!toAccount.isActive) {
    throw new ValidationError('Destination account is archived');
  }

  // Atomic transaction execution & available cash check
  return prisma.$transaction(async (tx) => {
    const { availableBalance } = await computeAvailableBalanceById(fromAccountId, tx);
    if (amount > availableBalance) {
      throw new InsufficientFundsError('Insufficient available cash for this transfer');
    }

    return tx.transfer.create({
      data: {
        fromAccountId,
        toAccountId,
        amount,
        note,
        transferDate,
      },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });
  });
}

/**
 * Retrieves list of transfers ordered by transferDate DESC, id DESC.
 */
export async function getTransfers(filters: FilterTransfersInput = {}): Promise<Transfer[]> {
  const where: any = {};

  if (filters.fromAccountId !== undefined && filters.fromAccountId !== null && filters.fromAccountId !== '') {
    where.fromAccountId = validateId(filters.fromAccountId, 'fromAccountId');
  }

  if (filters.toAccountId !== undefined && filters.toAccountId !== null && filters.toAccountId !== '') {
    where.toAccountId = validateId(filters.toAccountId, 'toAccountId');
  }

  if (
    (filters.fromDate !== undefined && filters.fromDate !== null && filters.fromDate !== '') ||
    (filters.toDate !== undefined && filters.toDate !== null && filters.toDate !== '')
  ) {
    where.transferDate = {};
    if (filters.fromDate !== undefined && filters.fromDate !== null && filters.fromDate !== '') {
      where.transferDate.gte = validateDate(filters.fromDate, 'fromDate');
    }
    if (filters.toDate !== undefined && filters.toDate !== null && filters.toDate !== '') {
      where.transferDate.lte = validateDate(filters.toDate, 'toDate');
    }
  }

  return prisma.transfer.findMany({
    where,
    orderBy: [
      { transferDate: 'desc' },
      { id: 'desc' },
    ],
    include: {
      fromAccount: true,
      toAccount: true,
    },
  });
}

/**
 * Retrieves a single transfer by ID.
 */
export async function getTransferById(rawId: unknown): Promise<Transfer> {
  const id = validateId(rawId, 'id');
  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include: {
      fromAccount: true,
      toAccount: true,
    },
  });

  if (!transfer) {
    throw new NotFoundError('Transfer not found');
  }

  return transfer;
}

/**
 * Updates a transfer with atomic available balance verification across affected accounts.
 */
export async function updateTransfer(
  rawId: unknown,
  input: UpdateTransferInput
): Promise<Transfer> {
  const id = validateId(rawId, 'id');
  const existing = await prisma.transfer.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Transfer not found');
  }

  const targetFromAccountId = input.fromAccountId !== undefined
    ? validateId(input.fromAccountId, 'fromAccountId')
    : existing.fromAccountId;

  const targetToAccountId = input.toAccountId !== undefined
    ? validateId(input.toAccountId, 'toAccountId')
    : existing.toAccountId;

  if (targetFromAccountId === targetToAccountId) {
    throw new ValidationError('Source and destination accounts must be different');
  }

  const targetAmount = input.amount !== undefined
    ? validatePaise(input.amount, 'amount')
    : existing.amount;

  const targetDate = input.transferDate !== undefined
    ? validateDate(input.transferDate, 'transferDate')
    : existing.transferDate;

  let targetNote: string | null = existing.note;
  if (input.note !== undefined) {
    if (input.note === null || String(input.note).trim() === '') {
      targetNote = null;
    } else {
      targetNote = validateString(input.note, 'note', { required: false, max: 1000 });
    }
  }

  // Verify target accounts exist and are active
  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findUnique({ where: { id: targetFromAccountId } }),
    prisma.account.findUnique({ where: { id: targetToAccountId } }),
  ]);

  if (!fromAccount) {
    throw new NotFoundError('Source account not found');
  }
  if (!toAccount) {
    throw new NotFoundError('Destination account not found');
  }

  if (!fromAccount.isActive) {
    throw new ValidationError('Source account is archived');
  }
  if (!toAccount.isActive) {
    throw new ValidationError('Destination account is archived');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.transfer.update({
      where: { id },
      data: {
        fromAccountId: targetFromAccountId,
        toAccountId: targetToAccountId,
        amount: targetAmount,
        note: targetNote,
        transferDate: targetDate,
      },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });

    // Check available balances on all affected accounts after update
    const affectedAccountIds = new Set<bigint>([
      existing.fromAccountId,
      existing.toAccountId,
      targetFromAccountId,
      targetToAccountId,
    ]);

    for (const accId of affectedAccountIds) {
      const { availableBalance } = await computeAvailableBalanceById(accId, tx);
      if (availableBalance < 0n) {
        throw new InsufficientFundsError('Editing transfer causes insufficient funds in account');
      }
    }

    return updated;
  });
}

/**
 * Deletes a transfer record atomically and verifies account balances.
 */
export async function deleteTransfer(rawId: unknown): Promise<Transfer> {
  const id = validateId(rawId, 'id');
  const existing = await prisma.transfer.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Transfer not found');
  }

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.transfer.delete({ where: { id } });

    const [fromAvail, toAvail] = await Promise.all([
      computeAvailableBalanceById(existing.fromAccountId, tx),
      computeAvailableBalanceById(existing.toAccountId, tx),
    ]);

    if (fromAvail.availableBalance < 0n || toAvail.availableBalance < 0n) {
      throw new InsufficientFundsError('Deleting this transfer causes insufficient funds in account');
    }

    return deleted;
  });
}
