import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import {
  getDashboardMetrics,
  getUsers,
  getUserDetails,
  updateUserRole,
  getTasks,
  resolveTask,
  getTransactions,
  getAnalytics,
} from '../controllers/admin.controller';

const router = express.Router();

/**
 * All admin routes require authentication and admin role
 * authenticateToken: Validates JWT and sets req.user
 * requireAdmin: Checks if user has ADMIN role
 */

// Dashboard metrics
router.get('/dashboard', authenticateToken, requireAdmin, getDashboardMetrics);

// User management
router.get('/users', authenticateToken, requireAdmin, getUsers);
router.get('/users/:userId', authenticateToken, requireAdmin, getUserDetails);
router.patch('/users/:userId/role', authenticateToken, requireAdmin, updateUserRole);

// Task management
router.get('/tasks', authenticateToken, requireAdmin, getTasks);
router.patch('/tasks/:taskId/resolve', authenticateToken, requireAdmin, resolveTask);

// Transaction management
router.get('/transactions', authenticateToken, requireAdmin, getTransactions);

// Analytics
router.get('/analytics', authenticateToken, requireAdmin, getAnalytics);

export default router;
