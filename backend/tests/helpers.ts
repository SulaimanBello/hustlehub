import { query } from '../src/config/database';
import jwt from 'jsonwebtoken';
import config from '../src/config';

/**
 * Test helper functions
 */

/**
 * Clean all test data from database
 */
export async function cleanDatabase() {
  // Delete in correct order to avoid FK constraint violations
  await query('DELETE FROM chat_messages');
  await query('DELETE FROM transactions');
  await query('DELETE FROM tasks');
  await query('DELETE FROM wallets');
  await query('DELETE FROM otp_records');
  await query('DELETE FROM users');
}

/**
 * Create a test user and return auth token
 */
export async function createTestUser(phoneNumber: string = '+2348012345678', name: string = 'Test User') {
  const result = await query(
    `INSERT INTO users (phone_number, phone_verified, name)
     VALUES ($1, TRUE, $2)
     RETURNING *`,
    [phoneNumber, name]
  );

  const user = result.rows[0];

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, phoneNumber: user.phone_number },
    config.jwt.secret,
    { expiresIn: '7d' }
  );

  return { user, token };
}

/**
 * Create a test task
 */
export async function createTestTask(
  posterId: string,
  data: {
    title?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    fee_amount?: number;
  } = {}
) {
  const {
    title = 'Test Task',
    description = 'Test description',
    latitude = 6.5244,
    longitude = 3.3792,
    fee_amount = 5000,
  } = data;

  const result = await query(
    `INSERT INTO tasks (poster_id, title, description, latitude, longitude, fee_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'POSTED')
     RETURNING *`,
    [posterId, title, description, latitude, longitude, fee_amount]
  );

  return result.rows[0];
}

/**
 * Create a test transaction
 */
export async function createTestTransaction(
  walletId: string,
  data: {
    task_id?: string;
    type?: string;
    amount?: number;
    status?: string;
  } = {}
) {
  const {
    task_id = null,
    type = 'ESCROW_HOLD',
    amount = 5000,
    status = 'PENDING',
  } = data;

  const result = await query(
    `INSERT INTO transactions (wallet_id, task_id, type, amount, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [walletId, task_id, type, amount, status]
  );

  return result.rows[0];
}

/**
 * Get wallet for user
 */
export async function getWallet(userId: string) {
  const result = await query(
    'SELECT * FROM wallets WHERE user_id = $1',
    [userId]
  );
  return result.rows[0];
}

/**
 * Mock Flutterwave API responses
 */
export const mockFlutterwaveResponses = {
  initializePayment: {
    status: 'success',
    message: 'Hosted Link',
    data: {
      link: 'https://checkout.flutterwave.com/mock-payment-link',
    },
  },
  verifyPayment: {
    status: 'success',
    message: 'Payment verified',
    data: {
      id: 123456,
      tx_ref: 'test-tx-ref',
      flw_ref: 'FLW-MOCK-REF',
      amount: 5000,
      currency: 'NGN',
      status: 'successful',
    },
  },
  initiateTransfer: {
    status: 'success',
    message: 'Transfer initiated',
    data: {
      id: 789012,
      reference: 'test-transfer-ref',
      status: 'pending',
    },
  },
};
