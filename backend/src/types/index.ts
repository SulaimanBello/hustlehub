// Core domain types for HustleHub MVP

export enum TaskStatus {
  POSTED = 'POSTED',
  ACCEPTED = 'ACCEPTED',
  COMPLETED = 'COMPLETED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  ESCROW_HOLD = 'ESCROW_HOLD',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  PLATFORM_FEE = 'PLATFORM_FEE',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Database models
export interface User {
  id: string;
  phone_number: string;
  phone_verified: boolean;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: string;
  poster_id: string;
  doer_id: string | null;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  fee_amount: number;
  status: TaskStatus;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  task_id: string | null;
  type: TransactionType;
  amount: number;
  platform_fee: number;
  status: TransactionStatus;
  payment_provider_id: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface ChatMessage {
  id: string;
  task_id: string;
  sender_id: string;
  message: string;
  created_at: Date;
}

export interface OTPRecord {
  id: string;
  phone_number: string;
  otp_code: string;
  expires_at: Date;
  attempts: number;
  verified: boolean;
  created_at: Date;
}

// API Request/Response types
export interface CreateTaskRequest {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  fee_amount: number;
}

export interface NearbyTasksQuery {
  latitude: number;
  longitude: number;
  radius_km?: number;
  limit?: number;
}

export interface SendOTPRequest {
  phone_number: string;
}

export interface VerifyOTPRequest {
  phone_number: string;
  otp_code: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'phone_verified'>;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  phoneNumber: string;
  iat?: number;
  exp?: number;
}

// Error types
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Flutterwave types
export interface FlutterwaveChargeRequest {
  tx_ref: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    phone_number: string;
    name: string;
  };
  customizations: {
    title: string;
    description: string;
  };
}

export interface FlutterwaveTransferRequest {
  account_bank: string;
  account_number: string;
  amount: number;
  currency: string;
  reference: string;
  narration: string;
  beneficiary_name: string;
}

export interface FlutterwaveWebhookPayload {
  event: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    status: string;
    payment_type: string;
    created_at: string;
    [key: string]: any;
  };
}
