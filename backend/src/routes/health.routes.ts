import { Router } from 'express';
import { getHealth, getDatabaseHealthController } from '../controllers/health.controller';

const router = Router();

// GET /api/health
router.get('/', getHealth);

// GET /api/health/db
router.get('/db', getDatabaseHealthController);

export default router;

