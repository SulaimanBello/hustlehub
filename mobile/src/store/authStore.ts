import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { socketService } from '../services/socket';

/**
 * Authentication State Management
 * Handles user authentication, OTP flow, and session persistence
 */

interface User {
  id: string;
  phone_number: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  sendOTP: (phoneNumber: string) => Promise<void>;
  verifyOTP: (phoneNumber: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Send OTP
  sendOTP: async (phoneNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.sendOTP(phoneNumber);
      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send OTP';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  // Verify OTP and login
  verifyOTP: async (phoneNumber: string, otpCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.verifyOTP(phoneNumber, otpCode);

      if (response.success && response.data) {
        const { token, user } = response.data;

        // Store in AsyncStorage
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));

        // Update state
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Connect socket
        await socketService.connect();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Invalid OTP';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    // Disconnect socket
    socketService.disconnect();

    // Clear storage
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');

    // Reset state
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // Load stored authentication on app start
  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('user'),
      ]);

      if (token && userJson) {
        const user = JSON.parse(userJson);

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        // Connect socket
        await socketService.connect();

        // Optionally refresh user data
        try {
          const response = await api.getCurrentUser();
          if (response.success && response.data) {
            set({ user: response.data });
            await AsyncStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.warn('Failed to refresh user data:', error);
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      set({ isLoading: false });
    }
  },

  // Update user profile
  updateProfile: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.updateProfile(name);

      if (response.success && response.data) {
        const updatedUser = response.data;
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser, isLoading: false });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
