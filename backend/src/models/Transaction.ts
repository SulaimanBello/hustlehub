import { query } from '../config/database';
import { Transaction, TransactionType, TransactionStatus } from '../types';

interface CreateTransactionParams {
  wallet_id: string;
  task_id?: string;
  type: TransactionType;
  amount: number;
  platform_fee?: number;
  payment_provider_id?: string;
  metadata?: Record<string, any>;
}

export class TransactionModel {
  /**
   * Create a new transaction
   */
  static async create(params: CreateTransactionParams): Promise<Transaction> {
    const sql = `
      INSERT INTO transactions (
        wallet_id, task_id, type, amount, platform_fee,
        payment_provider_id, metadata, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await query<Transaction>(sql, [
      params.wallet_id,
      params.task_id || null,
      params.type,
      params.amount,
      params.platform_fee || 0,
      params.payment_provider_id || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      TransactionStatus.PENDING,
    ]);

    return result.rows[0];
  }

  /**
   * Find transaction by ID
   */
  static async findById(id: string): Promise<Transaction | null> {
    const sql = `SELECT * FROM transactions WHERE id = $1`;
    const result = await query<Transaction>(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find by payment provider ID
   */
  static async findByProviderId(providerId: string): Promise<Transaction | null> {
    const sql = `SELECT * FROM transactions WHERE payment_provider_id = $1`;
    const result = await query<Transaction>(sql, [providerId]);
    return result.rows[0] || null;
  }

  /**
   * Get transaction history for wallet
   */
  static async findByWallet(
    walletId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions
      WHERE wallet_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query<Transaction>(sql, [walletId, limit, offset]);
    return result.rows;
  }

  /**
   * Get transactions for a task
   */
  static async findByTask(taskId: string): Promise<Transaction[]> {
    const sql = `
      SELECT * FROM transactions
      WHERE task_id = $1
      ORDER BY created_at ASC
    `;

    const result = await query<Transaction>(sql, [taskId]);
    return result.rows;
  }

  /**
   * Update transaction status
   */
  static async updateStatus(
    id: string,
    status: TransactionStatus,
    providerId?: string
  ): Promise<Transaction | null> {
    const sql = providerId
      ? `
          UPDATE transactions
          SET status = $1, payment_provider_id = $2
          WHERE id = $3
          RETURNING *
        `
      : `
          UPDATE transactions
          SET status = $1
          WHERE id = $2
          RETURNING *
        `;

    const params = providerId ? [status, providerId, id] : [status, id];
    const result = await query<Transaction>(sql, params);

    return result.rows[0] || null;
  }

  /**
   * Get platform fee total (for analytics)
   */
  static async getPlatformFeeTotal(): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(platform_fee), 0) as total
      FROM transactions
      WHERE type = $1 AND status = $2
    `;

    const result = await query<{ total: number }>(sql, [
      TransactionType.PLATFORM_FEE,
      TransactionStatus.COMPLETED,
    ]);

    return Number(result.rows[0]?.total || 0);
  }
}
