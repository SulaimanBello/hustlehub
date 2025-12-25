import { Request, Response } from 'express';
import { UserModel, OTPModel } from '../models';
import { SMSService } from '../services/sms.service';
import {
  generateToken,
  generateOTP,
  normalizePhoneNumber,
  isValidPhoneNumber,
} from '../utils/auth.utils';
import { AppError, SendOTPRequest, VerifyOTPRequest, AuthResponse } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import config from '../config';

/**
 * POST /auth/send-otp
 * Send OTP code to phone number
 */
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone_number } = req.body as SendOTPRequest;

  // Validate phone number
  if (!phone_number || !isValidPhoneNumber(phone_number)) {
    throw new AppError(400, 'Invalid phone number format');
  }

  const normalizedPhone = normalizePhoneNumber(phone_number);

  // Generate OTP code
  const otpCode = generateOTP();

  // Check if there's already an active OTP
  const existingOTP = await OTPModel.findActive(normalizedPhone);

  if (existingOTP) {
    // If OTP was created less than 1 minute ago, prevent spam
    const timeSinceCreation = Date.now() - new Date(existingOTP.created_at).getTime();
    if (timeSinceCreation < 60000) {
      throw new AppError(429, 'Please wait before requesting a new OTP');
    }

    // Invalidate existing OTP
    await OTPModel.invalidateAll(normalizedPhone);
  }

  // Create new OTP record
  await OTPModel.create(normalizedPhone, otpCode);

  // Send SMS (in production)
  const smsSent = await SMSService.sendOTP(normalizedPhone, otpCode);

  if (!smsSent) {
    throw new AppError(500, 'Failed to send OTP. Please try again.');
  }

  console.log(`📱 OTP sent to ${normalizedPhone}: ${otpCode}`);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully',
    data: {
      phone_number: normalizedPhone,
      expires_in_minutes: config.business.otpExpiryMinutes,
      // In development, include OTP for testing
      ...(config.env === 'development' && { otp_code: otpCode }),
    },
  });
});

/**
 * POST /auth/verify-otp
 * Verify OTP and return JWT token
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone_number, otp_code } = req.body as VerifyOTPRequest;

  // Validate input
  if (!phone_number || !otp_code) {
    throw new AppError(400, 'Phone number and OTP code are required');
  }

  const normalizedPhone = normalizePhoneNumber(phone_number);

  // Find active OTP
  const otpRecord = await OTPModel.findActive(normalizedPhone);

  if (!otpRecord) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  // Check max attempts
  if (otpRecord.attempts >= config.business.otpMaxAttempts) {
    await OTPModel.invalidateAll(normalizedPhone);
    throw new AppError(400, 'Too many failed attempts. Please request a new OTP.');
  }

  // Verify OTP code
  if (otpRecord.otp_code !== otp_code) {
    await OTPModel.incrementAttempts(otpRecord.id);
    throw new AppError(400, 'Invalid OTP code');
  }

  // Mark OTP as verified
  await OTPModel.markVerified(otpRecord.id);

  // Find or create user
  let user = await UserModel.findByPhone(normalizedPhone);

  if (!user) {
    // Create new user
    user = await UserModel.create(normalizedPhone);
    console.log('✨ New user created:', user.id);
  }

  // Verify phone if not already verified
  if (!user.phone_verified) {
    await UserModel.verifyPhone(normalizedPhone);
    user.phone_verified = true;
  }

  // Generate JWT token
  const token = generateToken(user.id, user.phone_number);

  // Return user data and token
  const response: AuthResponse = {
    token,
    user: {
      id: user.id,
      phone_number: user.phone_number,
      name: user.name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  };

  res.status(200).json({
    success: true,
    message: 'Authentication successful',
    data: response,
  });
});

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const user = await UserModel.findById(req.user.userId);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      phone_number: user.phone_number,
      name: user.name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  });
});

/**
 * PATCH /auth/profile
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    throw new AppError(400, 'Name is required');
  }

  const updatedUser = await UserModel.update(req.user.userId, { name: name.trim() });

  if (!updatedUser) {
    throw new AppError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: updatedUser.id,
      phone_number: updatedUser.phone_number,
      name: updatedUser.name,
      updated_at: updatedUser.updated_at,
    },
  });
});
