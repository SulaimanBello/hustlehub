import { Router } from 'express';
import {
  getBalance,
  getTransactions,
  getWallet,
  requestWithdrawal,
} from '../controllers/wallet.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All wallet routes require authentication
router.use(authenticateToken);

router.get('/', getWallet);
router.get('/balance', getBalance);
router.get('/transactions', getTransactions);
router.post('/withdraw', requestWithdrawal);

export default router;
