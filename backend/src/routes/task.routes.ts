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
import {
  validate,
  validateQuery,
  CreateTaskSchema,
  NearbyTasksQuerySchema,
} from '../middleware/validation';

const router = Router();

// Public routes (with optional auth for personalization)
router.get('/nearby', optionalAuth, validateQuery(NearbyTasksQuerySchema), getNearbyTasks);
router.get('/:id', optionalAuth, getTaskById);

// Protected routes (require authentication)
router.post('/', authenticateToken, validate(CreateTaskSchema), createTask);
router.get('/my/posted', authenticateToken, getMyPostedTasks);
router.get('/my/accepted', authenticateToken, getMyAcceptedTasks);
router.post('/:id/accept', authenticateToken, acceptTask);
router.post('/:id/complete', authenticateToken, completeTask);
router.post('/:id/confirm', authenticateToken, confirmCompletion);
router.delete('/:id', authenticateToken, cancelTask);

export default router;
