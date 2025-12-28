import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Import screens
import PhoneInputScreen from '../screens/Auth/PhoneInputScreen';
import OTPVerificationScreen from '../screens/Auth/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/Auth/ProfileSetupScreen';
import TaskMapScreen from '../screens/Tasks/TaskMapScreen';
import TaskListScreen from '../screens/Tasks/TaskListScreen';
import TaskDetailScreen from '../screens/Tasks/TaskDetailScreen';
import CreateTaskScreen from '../screens/Tasks/CreateTaskScreen';
import WalletScreen from '../screens/Wallet/WalletScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import ChatScreen from '../screens/Chat/ChatScreen';

/**
 * Navigation Structure:
 * - Auth Stack (Phone → OTP → Profile Setup)
 * - Main App (Bottom Tabs: Tasks, Wallet, Profile)
 */

export type AuthStackParamList = {
  PhoneInput: undefined;
  OTPVerification: { phoneNumber: string };
  ProfileSetup: undefined;
};

export type MainStackParamList = {
  TaskMap: undefined;
  TaskDetail: { taskId: string };
  CreateTask: undefined;
  Chat: { taskId: string; taskTitle: string };
};

export type RootTabParamList = {
  Tasks: undefined;
  Wallet: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="PhoneInput" component={PhoneInputScreen} />
      <AuthStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <AuthStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </AuthStack.Navigator>
  );
}

// Main Tasks Navigator
function TasksNavigator() {
  return (
    <MainStack.Navigator>
      <MainStack.Screen
        name="TaskMap"
        component={TaskMapScreen}
        options={{ title: 'Nearby Tasks' }}
      />
      <MainStack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Task Details' }}
      />
      <MainStack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ title: 'Post New Task' }}
      />
      <MainStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Task Chat' }}
      />
    </MainStack.Navigator>
  );
}

// Bottom Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen
        name="Tasks"
        component={TasksNavigator}
        options={{
          tabBarLabel: 'Tasks',
          // tabBarIcon: ({ color, size }) => <Icon name="list" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          headerShown: true,
          // tabBarIcon: ({ color, size }) => <Icon name="wallet" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          headerShown: true,
          // tabBarIcon: ({ color, size }) => <Icon name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
