import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API Client for HustleHub Backend
 * Handles authentication, request/response interceptors
 */

const API_URL = __DEV__
  ? 'http://localhost:5000/api/v1'  // Development (use your local IP for real device: http://192.168.x.x:5000/api/v1)
  : 'https://api.hustlehub.app/api/v1'; // Production

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors globally
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear auth
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user');
          // You can dispatch a logout action here if using Redux/Zustand
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth APIs
  async sendOTP(phoneNumber: string) {
    const response = await this.client.post('/auth/send-otp', { phone_number: phoneNumber });
    return response.data;
  }

  async verifyOTP(phoneNumber: string, otpCode: string) {
    const response = await this.client.post('/auth/verify-otp', {
      phone_number: phoneNumber,
      otp_code: otpCode,
    });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updateProfile(name: string) {
    const response = await this.client.patch('/auth/profile', { name });
    return response.data;
  }

  // Task APIs
  async getNearbyTasks(latitude: number, longitude: number, radiusKm: number = 5) {
    const response = await this.client.get('/tasks/nearby', {
      params: { latitude, longitude, radius_km: radiusKm },
    });
    return response.data;
  }

  async getTask(taskId: string) {
    const response = await this.client.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(taskData: {
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    fee_amount: number;
  }) {
    const response = await this.client.post('/tasks', taskData);
    return response.data;
  }

  async getMyPostedTasks() {
    const response = await this.client.get('/tasks/my/posted');
    return response.data;
  }

  async getMyAcceptedTasks() {
    const response = await this.client.get('/tasks/my/accepted');
    return response.data;
  }

  async acceptTask(taskId: string) {
    const response = await this.client.post(`/tasks/${taskId}/accept`);
    return response.data;
  }

  async completeTask(taskId: string) {
    const response = await this.client.post(`/tasks/${taskId}/complete`);
    return response.data;
  }

  async confirmCompletion(taskId: string) {
    const response = await this.client.post(`/tasks/${taskId}/confirm`);
    return response.data;
  }

  async cancelTask(taskId: string) {
    const response = await this.client.delete(`/tasks/${taskId}`);
    return response.data;
  }

  // Wallet APIs
  async getWallet() {
    const response = await this.client.get('/wallet');
    return response.data;
  }

  async getBalance() {
    const response = await this.client.get('/wallet/balance');
    return response.data;
  }

  async getTransactions(limit: number = 50, offset: number = 0) {
    const response = await this.client.get('/wallet/transactions', {
      params: { limit, offset },
    });
    return response.data;
  }

  async requestWithdrawal(data: {
    amount: number;
    account_number: string;
    bank_code: string;
  }) {
    const response = await this.client.post('/wallet/withdraw', data);
    return response.data;
  }
}

export const api = new APIClient();
