import { Router } from 'express';
import healthRoutes from './health.routes';
import accountRoutes from './account.routes';
import transactionRoutes from './transaction.routes';
import transferRoutes from './transfer.routes';
import categoryRoutes from './category.routes';
import goalRoutes from './goal.routes';
import authRoutes from './auth.routes';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────
// Auth endpoints (login, logout, me)
router.use('/auth', authRoutes);

// Health check — intentionally public so Render's health probe works without auth
router.use('/health', healthRoutes);

// ── Protected financial routes ────────────────────────────────────────────────
// All financial data requires a valid JWT.
router.use('/accounts', authenticateToken, accountRoutes);
router.use('/transactions', authenticateToken, transactionRoutes);
router.use('/transfers', authenticateToken, transferRoutes);
router.use('/categories', authenticateToken, categoryRoutes);
router.use('/goals', authenticateToken, goalRoutes);

export default router;




