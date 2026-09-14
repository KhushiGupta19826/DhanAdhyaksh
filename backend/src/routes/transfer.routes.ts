import { Router } from 'express';
import {
  createTransferHandler,
  getTransfersHandler,
  getTransferByIdHandler,
  updateTransferHandler,
  deleteTransferHandler,
} from '../controllers/transfer.controller';

const router = Router();

router.post('/', createTransferHandler);
router.get('/', getTransfersHandler);
router.get('/:id', getTransferByIdHandler);
router.patch('/:id', updateTransferHandler);
router.delete('/:id', deleteTransferHandler);

export default router;
