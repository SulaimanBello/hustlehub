import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';
import { JWTPayload } from '../types';

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(userId: string, phoneNumber: string): string {
  const payload: JWTPayload = {
    userId,
    phoneNumber,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
}

/**
 * Generate 6-digit OTP code
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Normalize phone number format
 * Converts various formats to E.164 format
 * Example: 0801234567 -> +2348001234567 (Nigeria)
 *
 * TODO: Implement proper phone number validation library (libphonenumber-js)
 * For MVP, we'll do basic normalization
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove spaces, dashes, and parentheses
  let normalized = phoneNumber.replace(/[\s\-()]/g, '');

  // If starts with 0, assume Nigeria and replace with +234
  if (normalized.startsWith('0')) {
    normalized = '+234' + normalized.substring(1);
  }

  // If doesn't start with +, assume it needs country code
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }

  return normalized;
}

/**
 * Validate phone number format (basic validation)
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const normalized = normalizePhoneNumber(phoneNumber);

  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;

  return e164Regex.test(normalized);
}

/**
 * Hash sensitive data (for comparison, not for passwords)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
