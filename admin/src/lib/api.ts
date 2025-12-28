import axios from 'axios';

const API_BASE_URL = '/api/v1';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const auth = {
  sendOTP: (phoneNumber: string) =>
    api.post('/auth/send-otp', { phone_number: phoneNumber }),

  verifyOTP: (phoneNumber: string, otpCode: string) =>
    api.post('/auth/verify-otp', { phone_number: phoneNumber, otp_code: otpCode }),
};

// Admin
export const admin = {
  getDashboard: () => api.get('/admin/dashboard'),

  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get('/admin/users', { params }),

  getUserDetails: (userId: string) => api.get(`/admin/users/${userId}`),

  updateUserRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }),

  getTasks: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get('/admin/tasks', { params }),

  resolveTask: (taskId: string, resolution: string, reason: string) =>
    api.patch(`/admin/tasks/${taskId}/resolve`, { resolution, reason }),

  getTransactions: (params?: { page?: number; limit?: number; type?: string; status?: string }) =>
    api.get('/admin/transactions', { params }),

  getAnalytics: (period?: string) =>
    api.get('/admin/analytics', { params: { period } }),
};
