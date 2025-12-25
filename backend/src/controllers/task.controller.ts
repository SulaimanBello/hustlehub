import { Request, Response } from 'express';
import { TaskModel } from '../models';
import { AppError, CreateTaskRequest, NearbyTasksQuery, TaskStatus } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * POST /tasks
 * Create a new task (requires poster to fund via Flutterwave)
 */
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { title, description, latitude, longitude, fee_amount } = req.body as CreateTaskRequest;

  // Validate required fields
  if (!title || !latitude || !longitude || !fee_amount) {
    throw new AppError(400, 'Missing required fields');
  }

  // Validate fee amount
  if (fee_amount <= 0) {
    throw new AppError(400, 'Fee amount must be greater than 0');
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AppError(400, 'Invalid coordinates');
  }

  // Create task
  const task = await TaskModel.create({
    poster_id: req.user.userId,
    title: title.trim(),
    description: description?.trim() || '',
    latitude,
    longitude,
    fee_amount,
  });

  console.log('✨ Task created:', task.id);

  // TODO: Initiate Flutterwave escrow payment
  // For MVP, we'll assume payment is handled separately
  // In production, task creation would trigger payment flow

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: task,
  });
});

/**
 * GET /tasks/nearby
 * Get tasks near user's location
 */
export const getNearbyTasks = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, radius_km, limit } = req.query;

  // Validate coordinates
  if (!latitude || !longitude) {
    throw new AppError(400, 'Latitude and longitude are required');
  }

  const lat = parseFloat(latitude as string);
  const lng = parseFloat(longitude as string);

  if (isNaN(lat) || isNaN(lng)) {
    throw new AppError(400, 'Invalid coordinates');
  }

  const query: NearbyTasksQuery = {
    latitude: lat,
    longitude: lng,
    radius_km: radius_km ? parseFloat(radius_km as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  };

  const tasks = await TaskModel.findNearby(query);

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

/**
 * GET /tasks/:id
 * Get task details
 */
export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await TaskModel.findById(id);

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

/**
 * GET /tasks/my/posted
 * Get tasks posted by current user
 */
export const getMyPostedTasks = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const tasks = await TaskModel.findByPoster(req.user.userId);

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

/**
 * GET /tasks/my/accepted
 * Get tasks accepted/completed by current user
 */
export const getMyAcceptedTasks = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const tasks = await TaskModel.findByDoer(req.user.userId);

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

/**
 * POST /tasks/:id/accept
 * Accept a task (doer accepts posted task)
 */
export const acceptTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  // Check task exists and is available
  const task = await TaskModel.findById(id);

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  if (task.status !== TaskStatus.POSTED) {
    throw new AppError(400, 'Task is no longer available');
  }

  // Prevent poster from accepting their own task
  if (task.poster_id === req.user.userId) {
    throw new AppError(400, 'Cannot accept your own task');
  }

  // Accept the task
  const acceptedTask = await TaskModel.accept(id, req.user.userId);

  if (!acceptedTask) {
    throw new AppError(409, 'Task was already accepted by someone else');
  }

  console.log(`📌 Task ${id} accepted by ${req.user.userId}`);

  // TODO: Emit Socket.IO event to notify poster
  // io.to(task.poster_id).emit('task_updated', acceptedTask);

  res.status(200).json({
    success: true,
    message: 'Task accepted successfully',
    data: acceptedTask,
  });
});

/**
 * POST /tasks/:id/complete
 * Mark task as completed (doer marks work done)
 */
export const completeTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  const task = await TaskModel.findById(id);

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  // Only doer can mark as completed
  if (task.doer_id !== req.user.userId) {
    throw new AppError(403, 'Only the assigned doer can mark task as completed');
  }

  if (task.status !== TaskStatus.ACCEPTED) {
    throw new AppError(400, 'Task cannot be marked as completed');
  }

  const completedTask = await TaskModel.markCompleted(id, req.user.userId);

  if (!completedTask) {
    throw new AppError(400, 'Failed to mark task as completed');
  }

  console.log(`✅ Task ${id} marked as completed`);

  // TODO: Notify poster to confirm completion
  // io.to(task.poster_id).emit('task_completed', completedTask);

  res.status(200).json({
    success: true,
    message: 'Task marked as completed. Waiting for poster confirmation.',
    data: completedTask,
  });
});

/**
 * POST /tasks/:id/confirm
 * Confirm completion and release payment (poster confirms)
 */
export const confirmCompletion = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  const task = await TaskModel.findById(id);

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  // Only poster can confirm
  if (task.poster_id !== req.user.userId) {
    throw new AppError(403, 'Only the task poster can confirm completion');
  }

  if (task.status !== TaskStatus.COMPLETED) {
    throw new AppError(400, 'Task is not in completed state');
  }

  // TODO: Release payment via Flutterwave
  // 1. Deduct platform fee
  // 2. Transfer to doer's wallet
  // 3. Record transactions
  // This will be implemented in the payment service

  const paidTask = await TaskModel.markPaid(id);

  if (!paidTask) {
    throw new AppError(400, 'Failed to process payment');
  }

  console.log(`💰 Task ${id} payment released`);

  // TODO: Notify doer of payment
  // io.to(task.doer_id).emit('payment_received', { task_id: id, amount: ... });

  res.status(200).json({
    success: true,
    message: 'Payment released successfully',
    data: paidTask,
  });
});

/**
 * DELETE /tasks/:id
 * Cancel a task (only if not accepted)
 */
export const cancelTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated');
  }

  const { id } = req.params;

  const task = await TaskModel.findById(id);

  if (!task) {
    throw new AppError(404, 'Task not found');
  }

  // Only poster can cancel
  if (task.poster_id !== req.user.userId) {
    throw new AppError(403, 'Only the task poster can cancel');
  }

  if (task.status !== TaskStatus.POSTED) {
    throw new AppError(400, 'Can only cancel tasks that have not been accepted');
  }

  const cancelledTask = await TaskModel.cancel(id, req.user.userId);

  if (!cancelledTask) {
    throw new AppError(400, 'Failed to cancel task');
  }

  console.log(`❌ Task ${id} cancelled`);

  // TODO: Refund escrow payment

  res.status(200).json({
    success: true,
    message: 'Task cancelled successfully',
    data: cancelledTask,
  });
});
