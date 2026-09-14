import { Request, Response, NextFunction } from 'express';
import {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  allocateGoal,
  updateGoalAllocation,
  deleteGoalAllocation,
} from '../services/goal.service';

/**
 * POST /api/goals
 * Creates a new savings goal.
 */
export async function createGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const goal = await createGoal(req.body);
    res.status(201).json({ data: goal });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/goals
 * Retrieves list of goals with computed allocations and remaining amounts.
 */
export async function getGoalsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const goals = await getGoals();
    res.status(200).json({ data: goals });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/goals/:id
 * Retrieves a single goal by ID.
 */
export async function getGoalByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const goal = await getGoalById(req.params.id);
    res.status(200).json({ data: goal });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/goals/:id
 * Updates goal metadata (name, targetAmount, targetDate, isCompleted).
 */
export async function updateGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const goal = await updateGoal(req.params.id, req.body);
    res.status(200).json({ data: goal });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/goals/:id
 * Deletes a goal and removes its allocations atomically.
 */
export async function deleteGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await deleteGoal(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/goals/:id/allocations
 * Allocates physical cash from an account to reserve for a goal.
 */
export async function allocateGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const goal = await allocateGoal(req.params.id, req.body);
    res.status(201).json({ data: goal });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/goals/:id/allocations/:allocationId
 * Updates allocation amount directly.
 */
export async function updateGoalAllocationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const goal = await updateGoalAllocation(
      req.params.id,
      req.params.allocationId,
      req.body
    );
    res.status(200).json({ data: goal });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/goals/:id/allocations/:allocationId
 * Deletes a goal allocation, releasing reserved cash back to available.
 */
export async function deleteGoalAllocationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const goal = await deleteGoalAllocation(
      req.params.id,
      req.params.allocationId
    );
    res.status(200).json({ data: goal });
  } catch (error) {
    next(error);
  }
}
