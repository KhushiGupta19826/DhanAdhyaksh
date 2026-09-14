import { Request, Response, NextFunction } from 'express';
import {
  createTransfer,
  getTransfers,
  getTransferById,
  updateTransfer,
  deleteTransfer,
} from '../services/transfer.service';

/**
 * POST /api/transfers
 * Creates a physical cash transfer between two distinct accounts.
 */
export async function createTransferHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const transfer = await createTransfer(req.body);
    res.status(201).json({ data: transfer });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transfers
 * Retrieves list of transfers with optional query filters.
 */
export async function getTransfersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const transfers = await getTransfers(req.query);
    res.status(200).json({ data: transfers });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transfers/:id
 * Retrieves single transfer details.
 */
export async function getTransferByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const transfer = await getTransferById(req.params.id);
    res.status(200).json({ data: transfer });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/transfers/:id
 * Updates transfer details with atomic available balance checks across affected accounts.
 */
export async function updateTransferHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const transfer = await updateTransfer(req.params.id, req.body);
    res.status(200).json({ data: transfer });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/transfers/:id
 * Deletes a transfer record and reverses its financial effect.
 */
export async function deleteTransferHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await deleteTransfer(req.params.id);
    res.status(200).json({ data: deleted });
  } catch (error) {
    next(error);
  }
}
