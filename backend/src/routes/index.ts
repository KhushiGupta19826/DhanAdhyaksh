import { Router } from 'express';
import healthRoutes from './health.routes';
import accountRoutes from './account.routes';
import transactionRoutes from './transaction.routes';
import transferRoutes from './transfer.routes';
import categoryRoutes from './category.routes';
import goalRoutes from './goal.routes';

const router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/transfers', transferRoutes);
router.use('/categories', categoryRoutes);
router.use('/goals', goalRoutes);

export default router;




