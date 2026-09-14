import { Router } from 'express';
import {
  createGoalHandler,
  getGoalsHandler,
  getGoalByIdHandler,
  updateGoalHandler,
  deleteGoalHandler,
  allocateGoalHandler,
  updateGoalAllocationHandler,
  deleteGoalAllocationHandler,
} from '../controllers/goal.controller';

const router = Router();

router.post('/', createGoalHandler);
router.get('/', getGoalsHandler);
router.get('/:id', getGoalByIdHandler);
router.patch('/:id', updateGoalHandler);
router.delete('/:id', deleteGoalHandler);

router.post('/:id/allocations', allocateGoalHandler);
router.patch('/:id/allocations/:allocationId', updateGoalAllocationHandler);
router.delete('/:id/allocations/:allocationId', deleteGoalAllocationHandler);

export default router;
