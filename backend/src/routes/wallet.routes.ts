import { Router } from 'express';
import {
  getBalance,
  getTransactions,
  getWallet,
  requestWithdrawal,
} from '../controllers/wallet.controller';
import { authenticateToken } from '../middleware/auth';
import {
  validate,
  validateQuery,
  WithdrawalRequestSchema,
  TransactionQuerySchema,
} from '../middleware/validation';

const router = Router();

// All wallet routes require authentication
router.use(authenticateToken);

router.get('/', getWallet);
router.get('/balance', getBalance);
router.get('/transactions', validateQuery(TransactionQuerySchema), getTransactions);
router.post('/withdraw', validate(WithdrawalRequestSchema), requestWithdrawal);

export default router;
