import { Request, Response } from 'express';
import { WalletModel, TransactionModel } from '../models';
import { AppError } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * GET /wallet/balance
 * Get current wallet balance
 */
export const getBalance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const wallet = await WalletModel.findByUserId(req.user.userId);

  if (!wallet) {
    throw new AppError(404, 'Wallet not found');
  }

  res.status(200).json({
    success: true,
    data: {
      balance: wallet.balance,
      currency: wallet.currency,
      updated_at: wallet.updated_at,
    },
  });
});

/**
 * GET /wallet/transactions
 * Get transaction history
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { limit = '50', offset = '0' } = req.query;

  const wallet = await WalletModel.findByUserId(req.user.userId);

  if (!wallet) {
    throw new AppError(404, 'Wallet not found');
  }

  const transactions = await TransactionModel.findByWallet(
    wallet.id,
    parseInt(limit as string),
    parseInt(offset as string)
  );

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  });
});

/**
 * GET /wallet
 * Get full wallet details (balance + recent transactions)
 */
export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const wallet = await WalletModel.findByUserId(req.user.userId);

  if (!wallet) {
    throw new AppError(404, 'Wallet not found');
  }

  const recentTransactions = await TransactionModel.findByWallet(wallet.id, 10, 0);

  res.status(200).json({
    success: true,
    data: {
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        updated_at: wallet.updated_at,
      },
      recent_transactions: recentTransactions,
    },
  });
});

/**
 * POST /wallet/withdraw
 * Request withdrawal (for Phase 2 - KYC required)
 * For MVP, this is a placeholder
 */
export const requestWithdrawal = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { amount, account_number, bank_code } = req.body;

  if (!amount || !account_number || !bank_code) {
    throw new AppError(400, 'Missing required fields');
  }

  if (amount <= 0) {
    throw new AppError(400, 'Invalid withdrawal amount');
  }

  const wallet = await WalletModel.findByUserId(req.user.userId);

  if (!wallet) {
    throw new AppError(404, 'Wallet not found');
  }

  // Check sufficient balance
  if (wallet.balance < amount) {
    throw new AppError(400, 'Insufficient balance');
  }

  // TODO: For MVP, we'll create a pending withdrawal transaction
  // In Phase 2, add KYC verification before allowing withdrawals

  const transaction = await TransactionModel.create({
    wallet_id: wallet.id,
    type: 'WITHDRAWAL' as any,
    amount,
    status: 'PENDING' as any,
    metadata: {
      account_number,
      bank_code,
    },
  });

  console.log(`💸 Withdrawal requested: ${amount} from wallet ${wallet.id}`);

  res.status(202).json({
    success: true,
    message: 'Withdrawal request received and will be processed',
    data: {
      transaction_id: transaction.id,
      amount,
      status: 'pending',
    },
  });
});
