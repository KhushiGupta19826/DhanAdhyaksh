import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

/**
 * GET /api/categories
 * Returns default categories list.
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ data: categories });
  } catch (error) {
    next(error);
  }
});

export default router;
