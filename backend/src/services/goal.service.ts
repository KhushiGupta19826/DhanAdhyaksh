import { Goal, GoalAllocation, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  InsufficientFundsError,
} from '../utils/errors';
import {
  validateString,
  validatePaise,
  validateId,
  validateDate,
} from '../utils/validation';
import { computeAvailableBalanceById } from './account.service';

export interface GoalWithAllocations extends Goal {
  allocatedAmount: bigint;
  remainingAmount: bigint;
  allocations: (GoalAllocation & {
    account: { id: bigint; name: string };
  })[];
}

export interface CreateGoalInput {
  name: unknown;
  targetAmount: unknown;
  targetDate?: unknown;
}

export interface UpdateGoalInput {
  name?: unknown;
  targetAmount?: unknown;
  targetDate?: unknown;
  isCompleted?: unknown;
}

export interface AllocateGoalInput {
  accountId: unknown;
  amount: unknown;
}

export interface UpdateAllocationInput {
  amount: unknown;
}

/**
 * Transforms a Goal record with allocations into a GoalWithAllocations structure
 * computing total allocated amount and remaining amount.
 */
function enrichGoal(
  goal: Goal & {
    allocations: (GoalAllocation & {
      account: { id: bigint; name: string };
    })[];
  }
): GoalWithAllocations {
  const allocatedAmount = goal.allocations.reduce(
    (sum, alloc) => sum + alloc.amount,
    0n
  );
  const remainingAmount =
    goal.targetAmount > allocatedAmount ? goal.targetAmount - allocatedAmount : 0n;

  return {
    ...goal,
    allocatedAmount,
    remainingAmount,
    isCompleted: goal.isCompleted || allocatedAmount >= goal.targetAmount,
  };
}

/**
 * Creates a new savings goal.
 */
export async function createGoal(input: CreateGoalInput): Promise<GoalWithAllocations> {
  const name = validateString(input.name, 'name', { min: 1, max: 100 });
  const targetAmount = validatePaise(input.targetAmount, 'targetAmount');

  let targetDate: Date | null = null;
  if (input.targetDate !== undefined && input.targetDate !== null && String(input.targetDate).trim() !== '') {
    targetDate = validateDate(input.targetDate, 'targetDate');
  }

  // Check unique name
  const existing = await prisma.goal.findUnique({ where: { name } });
  if (existing) {
    throw new ConflictError(`Goal with name '${name}' already exists`);
  }

  const goal = await prisma.goal.create({
    data: {
      name,
      targetAmount,
      targetDate,
      isCompleted: false,
    },
    include: {
      allocations: {
        include: {
          account: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return enrichGoal(goal);
}

/**
 * Retrieves all goals with allocations and computed progress amounts.
 */
export async function getGoals(): Promise<GoalWithAllocations[]> {
  const goals = await prisma.goal.findMany({
    orderBy: { id: 'asc' },
    include: {
      allocations: {
        orderBy: { id: 'asc' },
        include: {
          account: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return goals.map(enrichGoal);
}

/**
 * Retrieves a single goal by ID.
 */
export async function getGoalById(rawId: unknown): Promise<GoalWithAllocations> {
  const id = validateId(rawId, 'id');
  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      allocations: {
        orderBy: { id: 'asc' },
        include: {
          account: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  return enrichGoal(goal);
}

/**
 * Updates goal metadata (name, target amount, target date, completion status).
 */
export async function updateGoal(
  rawId: unknown,
  input: UpdateGoalInput
): Promise<GoalWithAllocations> {
  const id = validateId(rawId, 'id');
  const existing = await prisma.goal.findUnique({
    where: { id },
    include: { allocations: true },
  });

  if (!existing) {
    throw new NotFoundError('Goal not found');
  }

  let nameToUpdate = existing.name;
  if (input.name !== undefined) {
    const newName = validateString(input.name, 'name', { min: 1, max: 100 });
    if (newName !== existing.name) {
      const duplicate = await prisma.goal.findUnique({ where: { name: newName } });
      if (duplicate) {
        throw new ConflictError(`Goal with name '${newName}' already exists`);
      }
      nameToUpdate = newName;
    }
  }

  let targetAmountToUpdate = existing.targetAmount;
  if (input.targetAmount !== undefined) {
    targetAmountToUpdate = validatePaise(input.targetAmount, 'targetAmount');
  }

  let targetDateToUpdate = existing.targetDate;
  if (input.targetDate !== undefined) {
    if (input.targetDate === null || String(input.targetDate).trim() === '') {
      targetDateToUpdate = null;
    } else {
      targetDateToUpdate = validateDate(input.targetDate, 'targetDate');
    }
  }

  const currentAllocated = existing.allocations.reduce((sum, a) => sum + a.amount, 0n);
  let isCompletedToUpdate = existing.isCompleted;

  if (input.isCompleted !== undefined) {
    if (typeof input.isCompleted !== 'boolean') {
      throw new ValidationError("'isCompleted' must be a boolean");
    }
    isCompletedToUpdate = input.isCompleted;
  } else {
    isCompletedToUpdate = currentAllocated >= targetAmountToUpdate;
  }

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      name: nameToUpdate,
      targetAmount: targetAmountToUpdate,
      targetDate: targetDateToUpdate,
      isCompleted: isCompletedToUpdate,
    },
    include: {
      allocations: {
        include: {
          account: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return enrichGoal(updated);
}

/**
 * Deletes a goal and removes its allocations atomically.
 * Releasing allocations unreserves cash back to available accounts.
 */
export async function deleteGoal(rawId: unknown): Promise<{ success: boolean }> {
  const id = validateId(rawId, 'id');
  const existing = await prisma.goal.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Goal not found');
  }

  await prisma.$transaction(async (tx) => {
    // Delete allocations first
    await tx.goalAllocation.deleteMany({ where: { goalId: id } });
    // Delete goal
    await tx.goal.delete({ where: { id } });
  });

  return { success: true };
}

/**
 * Allocates physical cash from an account to a goal.
 * FINANCIAL INVARIANTS:
 * - Does NOT change total cash.
 * - Does NOT change account balance.
 * - Increases reserved cash, decreases available cash in the account.
 * - Must not exceed account's available cash.
 */
export async function allocateGoal(
  rawGoalId: unknown,
  input: AllocateGoalInput
): Promise<GoalWithAllocations> {
  const goalId = validateId(rawGoalId, 'goalId');
  const accountId = validateId(input.accountId, 'accountId');
  const amount = validatePaise(input.amount, 'amount');

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  if (!account.isActive) {
    throw new ValidationError('Cannot allocate money from an archived account');
  }

  return prisma.$transaction(async (tx) => {
    // Check if allocation for this goal & account already exists
    const existingAllocation = await tx.goalAllocation.findUnique({
      where: {
        goalId_accountId: {
          goalId,
          accountId,
        },
      },
    });

    const { availableBalance } = await computeAvailableBalanceById(accountId, tx);

    if (existingAllocation) {
      // Adding more to existing allocation: delta = amount
      // The new total allocation for this account will be existingAllocation.amount + amount
      if (amount > availableBalance) {
        throw new InsufficientFundsError(
          'Insufficient available cash in account to allocate to this goal'
        );
      }

      await tx.goalAllocation.update({
        where: { id: existingAllocation.id },
        data: {
          amount: existingAllocation.amount + amount,
        },
      });
    } else {
      // New allocation
      if (amount > availableBalance) {
        throw new InsufficientFundsError(
          'Insufficient available cash in account to allocate to this goal'
        );
      }

      await tx.goalAllocation.create({
        data: {
          goalId,
          accountId,
          amount,
        },
      });
    }

    // Re-fetch all allocations to compute new total and update completion state
    const allAllocations = await tx.goalAllocation.findMany({
      where: { goalId },
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    });

    const totalAllocated = allAllocations.reduce((sum, a) => sum + a.amount, 0n);
    const isCompleted = totalAllocated >= goal.targetAmount;

    const updatedGoal = await tx.goal.update({
      where: { id: goalId },
      data: { isCompleted },
      include: {
        allocations: {
          include: {
            account: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return enrichGoal(updatedGoal);
  });
}

/**
 * Updates an allocation amount directly.
 */
export async function updateGoalAllocation(
  rawGoalId: unknown,
  rawAllocationId: unknown,
  input: UpdateAllocationInput
): Promise<GoalWithAllocations> {
  const goalId = validateId(rawGoalId, 'goalId');
  const allocationId = validateId(rawAllocationId, 'allocationId');
  const newAmount = validatePaise(input.amount, 'amount');

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  const allocation = await prisma.goalAllocation.findUnique({
    where: { id: allocationId },
  });
  if (!allocation || allocation.goalId !== goalId) {
    throw new NotFoundError('Goal allocation not found');
  }

  return prisma.$transaction(async (tx) => {
    const delta = newAmount - allocation.amount;

    if (delta > 0n) {
      const { availableBalance } = await computeAvailableBalanceById(
        allocation.accountId,
        tx
      );
      if (delta > availableBalance) {
        throw new InsufficientFundsError(
          'Insufficient available cash in account to increase allocation'
        );
      }
    }

    await tx.goalAllocation.update({
      where: { id: allocationId },
      data: { amount: newAmount },
    });

    const allAllocations = await tx.goalAllocation.findMany({
      where: { goalId },
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    });

    const totalAllocated = allAllocations.reduce((sum, a) => sum + a.amount, 0n);
    const isCompleted = totalAllocated >= goal.targetAmount;

    const updatedGoal = await tx.goal.update({
      where: { id: goalId },
      data: { isCompleted },
      include: {
        allocations: {
          include: {
            account: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return enrichGoal(updatedGoal);
  });
}

/**
 * Deletes a goal allocation, releasing reserved cash back to available cash.
 */
export async function deleteGoalAllocation(
  rawGoalId: unknown,
  rawAllocationId: unknown
): Promise<GoalWithAllocations> {
  const goalId = validateId(rawGoalId, 'goalId');
  const allocationId = validateId(rawAllocationId, 'allocationId');

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) {
    throw new NotFoundError('Goal not found');
  }

  const allocation = await prisma.goalAllocation.findUnique({
    where: { id: allocationId },
  });
  if (!allocation || allocation.goalId !== goalId) {
    throw new NotFoundError('Goal allocation not found');
  }

  return prisma.$transaction(async (tx) => {
    await tx.goalAllocation.delete({ where: { id: allocationId } });

    const allAllocations = await tx.goalAllocation.findMany({
      where: { goalId },
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
    });

    const totalAllocated = allAllocations.reduce((sum, a) => sum + a.amount, 0n);
    const isCompleted = totalAllocated >= goal.targetAmount;

    const updatedGoal = await tx.goal.update({
      where: { id: goalId },
      data: { isCompleted },
      include: {
        allocations: {
          include: {
            account: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return enrichGoal(updatedGoal);
  });
}
