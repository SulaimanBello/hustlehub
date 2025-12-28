import { Router } from 'express';
import {
  sendOTP,
  verifyOTP,
  getCurrentUser,
  updateProfile,
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';
import {
  validate,
  SendOTPSchema,
  VerifyOTPSchema,
  UpdateProfileSchema,
} from '../middleware/validation';

const router = Router();

// Public routes
router.post('/send-otp', validate(SendOTPSchema), sendOTP);
router.post('/verify-otp', validate(VerifyOTPSchema), verifyOTP);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);
router.patch('/profile', authenticateToken, validate(UpdateProfileSchema), updateProfile);

export default router;
