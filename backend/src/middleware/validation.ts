import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

/**
 * Validation middleware factory
 * Creates Express middleware that validates request body/query/params against a Zod schema
 */
export function validate(schema: z.ZodObject<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new AppError(400, `Validation error: ${messages.join(', ')}`);
      }
      next(error);
    }
  };
}

/**
 * Query parameter validation
 */
export function validateQuery(schema: z.ZodObject<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new AppError(400, `Query validation error: ${messages.join(', ')}`);
      }
      next(error);
    }
  };
}

/**
 * Validation Schemas
 */

// Auth schemas
export const SendOTPSchema = z.object({
  phone_number: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be at most 20 digits')
    .regex(/^[+]?[0-9]+$/, 'Phone number must contain only digits and optional + prefix'),
});

export const VerifyOTPSchema = z.object({
  phone_number: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be at most 20 digits'),
  otp_code: z.string()
    .length(6, 'OTP code must be exactly 6 digits')
    .regex(/^[0-9]{6}$/, 'OTP code must be 6 digits'),
});

export const UpdateProfileSchema = z.object({
  name: z.string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
});

// Task schemas
export const CreateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be at most 1000 characters')
    .trim()
    .optional(),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  fee_amount: z.number()
    .positive('Fee amount must be greater than 0')
    .max(1000000, 'Fee amount must be less than 1,000,000'),
});

export const NearbyTasksQuerySchema = z.object({
  latitude: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val >= -90 && val <= 90, 'Invalid latitude'),
  longitude: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val >= -180 && val <= 180, 'Invalid longitude'),
  radius_km: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val > 0 && val <= 100, 'Radius must be between 0 and 100 km')
    .optional(),
  limit: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .optional(),
});

// Wallet schemas
export const WithdrawalRequestSchema = z.object({
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount must be less than 1,000,000'),
  account_number: z.string()
    .min(10, 'Account number must be at least 10 digits')
    .max(10, 'Account number must be exactly 10 digits')
    .regex(/^[0-9]{10}$/, 'Account number must be 10 digits'),
  bank_code: z.string()
    .min(3, 'Bank code is required')
    .max(10, 'Invalid bank code'),
});

export const TransactionQuerySchema = z.object({
  limit: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
    .default('50'),
  offset: z.string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val >= 0, 'Offset must be 0 or greater')
    .optional()
    .default('0'),
});
