import { query } from '../config/database';
import { User } from '../types';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(phoneNumber: string, name?: string): Promise<User> {
    const sql = `
      INSERT INTO users (phone_number, phone_verified, name)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await query<User>(sql, [phoneNumber, false, name || null]);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE id = $1`;
    const result = await query<User>(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by phone number
   */
  static async findByPhone(phoneNumber: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE phone_number = $1`;
    const result = await query<User>(sql, [phoneNumber]);
    return result.rows[0] || null;
  }

  /**
   * Update user
   */
  static async update(
    id: string,
    updates: Partial<Pick<User, 'name' | 'phone_verified'>>
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.phone_verified !== undefined) {
      fields.push(`phone_verified = $${paramIndex++}`);
      values.push(updates.phone_verified);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query<User>(sql, values);
    return result.rows[0] || null;
  }

  /**
   * Mark phone as verified
   */
  static async verifyPhone(phoneNumber: string): Promise<void> {
    const sql = `
      UPDATE users
      SET phone_verified = TRUE
      WHERE phone_number = $1
    `;
    await query(sql, [phoneNumber]);
  }

  /**
   * Delete user (for testing/admin)
   */
  static async delete(id: string): Promise<void> {
    const sql = `DELETE FROM users WHERE id = $1`;
    await query(sql, [id]);
  }
}
