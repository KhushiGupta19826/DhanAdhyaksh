import { Router } from 'express';
import { loginController, logoutController, meController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/login  — public
router.post('/login', loginController);

// POST /api/auth/logout — public (client discards its token)
router.post('/logout', logoutController);

// GET /api/auth/me      — protected: verifies the current JWT
router.get('/me', authenticateToken, meController);

export default router;
