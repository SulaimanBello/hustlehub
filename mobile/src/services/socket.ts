import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Socket.IO Client for Real-Time Features
 * - Task updates
 * - Chat messages
 * - Payment notifications
 */

const SOCKET_URL = __DEV__
  ? 'http://localhost:5000'  // Use your local IP for real device: http://192.168.x.x:5000
  : 'https://api.hustlehub.app';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  async connect() {
    const token = await AsyncStorage.getItem('auth_token');

    if (!token) {
      console.warn('No auth token found, cannot connect socket');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('👋 Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Chat methods
  joinTaskChat(taskId: string, onHistory: (data: any) => void) {
    if (!this.socket) return;

    this.socket.emit('join_task_chat', { task_id: taskId });

    this.socket.on('chat_history', onHistory);
  }

  leaveTaskChat(taskId: string) {
    if (!this.socket) return;

    this.socket.emit('leave_task_chat', { task_id: taskId });
    this.socket.off('chat_history');
    this.socket.off('new_message');
  }

  sendMessage(taskId: string, message: string) {
    if (!this.socket) return;

    this.socket.emit('send_message', {
      task_id: taskId,
      message,
    });
  }

  onNewMessage(callback: (message: any) => void) {
    if (!this.socket) return;
    this.socket.on('new_message', callback);
  }

  sendTypingIndicator(taskId: string, isTyping: boolean) {
    if (!this.socket) return;

    this.socket.emit('typing', {
      task_id: taskId,
      is_typing: isTyping,
    });
  }

  onUserTyping(callback: (data: { user_id: string; is_typing: boolean }) => void) {
    if (!this.socket) return;
    this.socket.on('user_typing', callback);
  }

  // Task update notifications
  onTaskUpdated(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('task_updated', callback);
  }

  onPaymentReceived(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('payment_received', callback);
  }

  // Clean up all listeners
  removeAllListeners() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
