import { Router } from 'express';
import {
  sendOTP,
  verifyOTP,
  getCurrentUser,
  updateProfile,
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);
router.patch('/profile', authenticateToken, updateProfile);

export default router;
