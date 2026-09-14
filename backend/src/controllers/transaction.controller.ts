import { Request, Response, NextFunction } from 'express';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from '../services/transaction.service';

/**
 * POST /api/transactions
 * Creates a new transaction (INCOME or EXPENSE).
 */
export async function createTransactionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const transaction = await createTransaction(req.body);
    res.status(201).json({ data: transaction });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transactions
 * Retrieves transactions list with optional query filters.
 */
export async function getTransactionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const transactions = await getTransactions(req.query);
    res.status(200).json({ data: transactions });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transactions/:id
 * Retrieves a single transaction by ID.
 */
export async function getTransactionByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const transaction = await getTransactionById(req.params.id);
    res.status(200).json({ data: transaction });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/transactions/:id
 * Updates transaction details with atomic balance integrity check.
 */
export async function updateTransactionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const transaction = await updateTransaction(req.params.id, req.body);
    res.status(200).json({ data: transaction });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/transactions/:id
 * Deletes a transaction and removes its financial effect from the ledger.
 */
export async function deleteTransactionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await deleteTransaction(req.params.id);
    res.status(200).json({ data: deleted });
  } catch (error) {
    next(error);
  }
}
