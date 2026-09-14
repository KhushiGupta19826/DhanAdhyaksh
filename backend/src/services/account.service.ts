import { Account, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors';
import { validateString, validatePaise, validateId } from '../utils/validation';

export interface AccountWithBalance extends Account {
  balance: bigint;
}

export interface CreateAccountInput {
  name: unknown;
  initialBalance?: unknown;
}

export interface UpdateAccountInput {
  name?: unknown;
  balance?: unknown;
  initialBalance?: unknown;
  initial_balance?: unknown;
}

/**
 * Calculates dynamic balance for an account using the formula:
 * balance = initial_balance + income - expenses + transfers_in - transfers_out
 */
export async function computeAccountBalance(account: Account): Promise<bigint> {
  const [incomeResult, expenseResult, transferInResult, transferOutResult] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId: account.id, type: 'INCOME' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId: account.id, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    prisma.transfer.aggregate({
      where: { toAccountId: account.id },
      _sum: { amount: true },
    }),
    prisma.transfer.aggregate({
      where: { fromAccountId: account.id },
      _sum: { amount: true },
    }),
  ]);

  const income = incomeResult._sum.amount ?? 0n;
  const expense = expenseResult._sum.amount ?? 0n;
  const transferIn = transferInResult._sum.amount ?? 0n;
  const transferOut = transferOutResult._sum.amount ?? 0n;

  return account.initialBalance + income - expense + transferIn - transferOut;
}

/**
 * Calculates total balance and available balance for an account by ID.
 * Available balance = balance - reserved_goal_money
 * Accepts optional Prisma transaction client for atomic checks inside $transaction.
 */
export async function computeAvailableBalanceById(
  accountId: bigint,
  txClient: PrismaClient | Prisma.TransactionClient = prisma as any
): Promise<{ balance: bigint; availableBalance: bigint }> {
  const account = await txClient.account.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const [incomeResult, expenseResult, transferInResult, transferOutResult, goalResult] = await Promise.all([
    txClient.transaction.aggregate({
      where: { accountId, type: 'INCOME' },
      _sum: { amount: true },
    }),
    txClient.transaction.aggregate({
      where: { accountId, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    txClient.transfer.aggregate({
      where: { toAccountId: accountId },
      _sum: { amount: true },
    }),
    txClient.transfer.aggregate({
      where: { fromAccountId: accountId },
      _sum: { amount: true },
    }),
    txClient.goalAllocation.aggregate({
      where: { accountId },
      _sum: { amount: true },
    }),
  ]);

  const income = incomeResult._sum.amount ?? 0n;
  const expense = expenseResult._sum.amount ?? 0n;
  const transferIn = transferInResult._sum.amount ?? 0n;
  const transferOut = transferOutResult._sum.amount ?? 0n;
  const reservedGoalMoney = goalResult._sum.amount ?? 0n;

  const balance = account.initialBalance + income - expense + transferIn - transferOut;
  const availableBalance = balance - reservedGoalMoney;

  return { balance, availableBalance };
}


/**
 * Creates a new account with an optional initial balance.
 */
export async function createAccount(input: CreateAccountInput): Promise<AccountWithBalance> {
  const name = validateString(input.name, 'name', { min: 1, max: 100 });

  let initialBalance = 0n;
  if (input.initialBalance !== undefined && input.initialBalance !== null) {
    initialBalance = validatePaise(input.initialBalance, 'initialBalance', { allowZero: true });
  }

  // Check for duplicate account name
  const existing = await prisma.account.findUnique({ where: { name } });
  if (existing) {
    throw new ConflictError(`Account with name '${name}' already exists`);
  }

  const account = await prisma.account.create({
    data: {
      name,
      initialBalance,
    },
  });

  const balance = await computeAccountBalance(account);

  return {
    ...account,
    balance,
  };
}

/**
 * Retrieves list of accounts. Returns active accounts by default.
 */
export async function getAccounts(includeArchived = false): Promise<AccountWithBalance[]> {
  const where = includeArchived ? {} : { isActive: true };
  const accounts = await prisma.account.findMany({
    where,
    orderBy: { id: 'asc' },
  });

  return Promise.all(
    accounts.map(async (account) => {
      const balance = await computeAccountBalance(account);
      return {
        ...account,
        balance,
      };
    })
  );
}

/**
 * Gets a single account by ID with calculated dynamic balance.
 */
export async function getAccountById(rawId: unknown): Promise<AccountWithBalance> {
  const id = validateId(rawId, 'id');
  const account = await prisma.account.findUnique({ where: { id } });

  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const balance = await computeAccountBalance(account);

  return {
    ...account,
    balance,
  };
}

/**
 * Updates account metadata (name). Strictly rejects balance/initialBalance modification.
 */
export async function updateAccount(
  rawId: unknown,
  input: UpdateAccountInput
): Promise<AccountWithBalance> {
  const id = validateId(rawId, 'id');

  // Prevent financial modification
  if (
    'balance' in input ||
    'initialBalance' in input ||
    'initial_balance' in input
  ) {
    throw new ValidationError(
      'Financial balance fields (balance, initialBalance) cannot be directly modified'
    );
  }

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  let nameToUpdate = account.name;
  if (input.name !== undefined) {
    const newName = validateString(input.name, 'name', { min: 1, max: 100 });
    if (newName !== account.name) {
      const existing = await prisma.account.findUnique({ where: { name: newName } });
      if (existing) {
        throw new ConflictError(`Account with name '${newName}' already exists`);
      }
      nameToUpdate = newName;
    }
  }

  const updatedAccount = await prisma.account.update({
    where: { id },
    data: {
      name: nameToUpdate,
    },
  });

  const balance = await computeAccountBalance(updatedAccount);

  return {
    ...updatedAccount,
    balance,
  };
}

/**
 * Archives an account by setting is_active = false. Does NOT delete row or history.
 */
export async function archiveAccount(rawId: unknown): Promise<AccountWithBalance> {
  const id = validateId(rawId, 'id');

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const archivedAccount = await prisma.account.update({
    where: { id },
    data: { isActive: false },
  });

  const balance = await computeAccountBalance(archivedAccount);

  return {
    ...archivedAccount,
    balance,
  };
}
