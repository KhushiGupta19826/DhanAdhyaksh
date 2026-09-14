import { Router } from 'express';
import {
  createAccountHandler,
  getAccountsHandler,
  getAccountByIdHandler,
  updateAccountHandler,
  archiveAccountHandler,
} from '../controllers/account.controller';

const router = Router();

router.post('/', createAccountHandler);
router.get('/', getAccountsHandler);
router.get('/:id', getAccountByIdHandler);
router.patch('/:id', updateAccountHandler);
router.delete('/:id', archiveAccountHandler);

export default router;
