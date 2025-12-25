import { query } from '../config/database';
import { OTPRecord } from '../types';
import config from '../config';

export class OTPModel {
  /**
   * Create a new OTP record
   */
  static async create(phoneNumber: string, otpCode: string): Promise<OTPRecord> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.business.otpExpiryMinutes);

    const sql = `
      INSERT INTO otp_records (phone_number, otp_code, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await query<OTPRecord>(sql, [phoneNumber, otpCode, expiresAt]);
    return result.rows[0];
  }

  /**
   * Find active OTP for phone number
   */
  static async findActive(phoneNumber: string): Promise<OTPRecord | null> {
    const sql = `
      SELECT * FROM otp_records
      WHERE phone_number = $1
        AND verified = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await query<OTPRecord>(sql, [phoneNumber]);
    return result.rows[0] || null;
  }

  /**
   * Increment attempts
   */
  static async incrementAttempts(id: string): Promise<void> {
    const sql = `
      UPDATE otp_records
      SET attempts = attempts + 1
      WHERE id = $1
    `;
    await query(sql, [id]);
  }

  /**
   * Mark OTP as verified
   */
  static async markVerified(id: string): Promise<void> {
    const sql = `
      UPDATE otp_records
      SET verified = TRUE
      WHERE id = $1
    `;
    await query(sql, [id]);
  }

  /**
   * Clean up expired OTPs (run periodically)
   */
  static async cleanupExpired(): Promise<number> {
    const sql = `
      DELETE FROM otp_records
      WHERE expires_at < NOW() - INTERVAL '24 hours'
    `;
    const result = await query(sql);
    return result.rowCount || 0;
  }

  /**
   * Invalidate all OTPs for phone number
   */
  static async invalidateAll(phoneNumber: string): Promise<void> {
    const sql = `
      UPDATE otp_records
      SET verified = TRUE
      WHERE phone_number = $1 AND verified = FALSE
    `;
    await query(sql, [phoneNumber]);
  }
}
