import { Request, Response, NextFunction } from 'express';
import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  archiveAccount,
} from '../services/account.service';

/**
 * POST /api/accounts
 * Creates a new account.
 */
export async function createAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const account = await createAccount(req.body);
    res.status(201).json({ data: account });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/accounts
 * Lists active accounts (or all accounts if ?includeArchived=true).
 */
export async function getAccountsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const accounts = await getAccounts(includeArchived);
    res.status(200).json({ data: accounts });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/accounts/:id
 * Retrieves account details with calculated balance.
 */
export async function getAccountByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const account = await getAccountById(req.params.id);
    res.status(200).json({ data: account });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/accounts/:id
 * Updates account metadata (e.g. name). Rejects modifying balance fields.
 */
export async function updateAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const account = await updateAccount(req.params.id, req.body);
    res.status(200).json({ data: account });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/accounts/:id
 * Archives account by setting is_active = false.
 */
export async function archiveAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const account = await archiveAccount(req.params.id);
    res.status(200).json({ data: account });
  } catch (error) {
    next(error);
  }
}
