import { query } from '../config/database';
import { Wallet } from '../types';

export class WalletModel {
  /**
   * Find wallet by user ID
   */
  static async findByUserId(userId: string): Promise<Wallet | null> {
    const sql = `SELECT * FROM wallets WHERE user_id = $1`;
    const result = await query<Wallet>(sql, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Find wallet by ID
   */
  static async findById(walletId: string): Promise<Wallet | null> {
    const sql = `SELECT * FROM wallets WHERE id = $1`;
    const result = await query<Wallet>(sql, [walletId]);
    return result.rows[0] || null;
  }

  /**
   * Get balance
   */
  static async getBalance(userId: string): Promise<number> {
    const wallet = await this.findByUserId(userId);
    return wallet?.balance || 0;
  }

  /**
   * Add to balance (used by transaction trigger, but can be called directly for admin)
   */
  static async addBalance(walletId: string, amount: number): Promise<Wallet | null> {
    const sql = `
      UPDATE wallets
      SET balance = balance + $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await query<Wallet>(sql, [amount, walletId]);
    return result.rows[0] || null;
  }

  /**
   * Subtract from balance (used for withdrawals)
   */
  static async subtractBalance(walletId: string, amount: number): Promise<Wallet | null> {
    const sql = `
      UPDATE wallets
      SET balance = balance - $1
      WHERE id = $2 AND balance >= $1
      RETURNING *
    `;
    const result = await query<Wallet>(sql, [amount, walletId]);
    return result.rows[0] || null;
  }

  /**
   * Check if wallet has sufficient balance
   */
  static async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }
}
