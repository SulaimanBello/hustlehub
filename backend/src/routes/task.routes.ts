import { Router } from 'express';
import {
  createTask,
  getNearbyTasks,
  getTaskById,
  getMyPostedTasks,
  getMyAcceptedTasks,
  acceptTask,
  completeTask,
  confirmCompletion,
  cancelTask,
} from '../controllers/task.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Public routes (with optional auth for personalization)
router.get('/nearby', optionalAuth, getNearbyTasks);
router.get('/:id', optionalAuth, getTaskById);

// Protected routes (require authentication)
router.post('/', authenticateToken, createTask);
router.get('/my/posted', authenticateToken, getMyPostedTasks);
router.get('/my/accepted', authenticateToken, getMyAcceptedTasks);
router.post('/:id/accept', authenticateToken, acceptTask);
router.post('/:id/complete', authenticateToken, completeTask);
router.post('/:id/confirm', authenticateToken, confirmCompletion);
router.delete('/:id', authenticateToken, cancelTask);

export default router;
