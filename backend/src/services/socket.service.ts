import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ChatMessageModel, TaskModel } from '../models';
import { JWTPayload } from '../types';
import config from '../config';

/**
 * Socket.IO Service for real-time features
 * - One-to-one task-based chat
 * - Task status updates
 */

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initializeSocketService(io: SocketIOServer) {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      socket.userId = decoded.userId;

      console.log('🔌 Socket authenticated:', socket.userId);
      next();
    } catch (error) {
      console.error('❌ Socket auth failed:', error);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('✅ Client connected:', socket.id, 'User:', socket.userId);

    /**
     * Join a task chat room
     * Client emits: { task_id: string }
     */
    socket.on('join_task_chat', async (data: { task_id: string }) => {
      try {
        const { task_id } = data;

        // Verify user is part of this task (poster or doer)
        const task = await TaskModel.findById(task_id);

        if (!task) {
          socket.emit('error', { message: 'Task not found' });
          return;
        }

        const isParticipant =
          task.poster_id === socket.userId || task.doer_id === socket.userId;

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized for this task' });
          return;
        }

        // Join the room
        socket.join(`task_${task_id}`);
        console.log(`📥 User ${socket.userId} joined chat for task ${task_id}`);

        // Send chat history
        const messages = await ChatMessageModel.getLatest(task_id, 50);

        socket.emit('chat_history', {
          task_id,
          messages,
        });
      } catch (error) {
        console.error('❌ Error joining task chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    /**
     * Leave a task chat room
     */
    socket.on('leave_task_chat', (data: { task_id: string }) => {
      const { task_id } = data;
      socket.leave(`task_${task_id}`);
      console.log(`📤 User ${socket.userId} left chat for task ${task_id}`);
    });

    /**
     * Send a chat message
     * Client emits: { task_id: string, message: string }
     */
    socket.on('send_message', async (data: { task_id: string; message: string }) => {
      try {
        const { task_id, message } = data;

        if (!message || message.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Verify user is part of this task
        const task = await TaskModel.findById(task_id);

        if (!task) {
          socket.emit('error', { message: 'Task not found' });
          return;
        }

        const isParticipant =
          task.poster_id === socket.userId || task.doer_id === socket.userId;

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized for this task' });
          return;
        }

        // Save message to database
        const chatMessage = await ChatMessageModel.create(
          task_id,
          socket.userId,
          message.trim()
        );

        // Broadcast to all participants in the task room
        io.to(`task_${task_id}`).emit('new_message', chatMessage);

        console.log(`💬 Message sent in task ${task_id} by ${socket.userId}`);
      } catch (error) {
        console.error('❌ Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Typing indicator
     * Client emits: { task_id: string, is_typing: boolean }
     */
    socket.on('typing', (data: { task_id: string; is_typing: boolean }) => {
      const { task_id, is_typing } = data;

      // Broadcast to others in the room (not to sender)
      socket.to(`task_${task_id}`).emit('user_typing', {
        user_id: socket.userId,
        is_typing,
      });
    });

    /**
     * Disconnect
     */
    socket.on('disconnect', () => {
      console.log('👋 Client disconnected:', socket.id, 'User:', socket.userId);
    });
  });

  console.log('✅ Socket.IO service initialized');
}

/**
 * Helper to emit task updates to participants
 * Can be called from API controllers
 */
export function emitTaskUpdate(io: SocketIOServer, taskId: string, update: any) {
  io.to(`task_${taskId}`).emit('task_updated', update);
  console.log(`📢 Task update emitted for task ${taskId}`);
}
