import request from 'supertest';
import app from '../../src/app';
import { cleanDatabase, createTestUser, createTestTask, createTestTransaction, getWallet } from '../helpers';
import { query } from '../../src/config/database';
import crypto from 'crypto';
import config from '../../src/config';

describe('Payment Flow Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe('Webhook Handling', () => {
    it('should process successful payment webhook', async () => {
      const { user } = await createTestUser();
      const task = await createTestTask(user.id, { fee_amount: 5000 });
      const wallet = await getWallet(user.id);

      // Create pending transaction
      await createTestTransaction(wallet.id, {
        task_id: task.id,
        type: 'ESCROW_HOLD',
        amount: 5000,
        status: 'PENDING',
      });

      // Create webhook payload
      const webhookData = {
        event: 'charge.completed',
        data: {
          id: 123456,
          tx_ref: `task_${task.id}_${Date.now()}`,
          flw_ref: 'FLW-MOCK-REF-123',
          amount: 5000,
          currency: 'NGN',
          status: 'successful',
        },
      };

      const payload = JSON.stringify(webhookData);
      const signature = crypto
        .createHmac('sha256', config.flutterwave.webhookSecret!)
        .update(payload)
        .digest('hex');

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('verif-hash', signature)
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify transaction was updated to COMPLETED
      const txResult = await query(
        'SELECT * FROM transactions WHERE task_id = $1 AND type = $2',
        [task.id, 'ESCROW_HOLD']
      );
      expect(txResult.rows[0].status).toBe('COMPLETED');
      expect(txResult.rows[0].payment_provider_id).toBe('FLW-MOCK-REF-123');
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookData = {
        event: 'charge.completed',
        data: {
          id: 123456,
          tx_ref: 'test-tx-ref',
          amount: 5000,
          status: 'successful',
        },
      };

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('verif-hash', 'invalid-signature')
        .send(webhookData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid webhook signature');
    });

    it('should handle transfer completion webhook', async () => {
      const { user } = await createTestUser();
      const wallet = await getWallet(user.id);

      // Create pending withdrawal transaction
      const transaction = await createTestTransaction(wallet.id, {
        type: 'WITHDRAWAL',
        amount: -2000,
        status: 'PENDING',
      });

      // Create webhook payload for transfer completion
      const webhookData = {
        event: 'transfer.completed',
        data: {
          id: 789012,
          reference: `withdrawal_${transaction.id}_${Date.now()}`,
          status: 'successful',
          amount: 2000,
        },
      };

      const payload = JSON.stringify(webhookData);
      const signature = crypto
        .createHmac('sha256', config.flutterwave.webhookSecret!)
        .update(payload)
        .digest('hex');

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('verif-hash', signature)
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify transaction was completed
      const txResult = await query(
        'SELECT * FROM transactions WHERE id = $1',
        [transaction.id]
      );
      expect(txResult.rows[0].status).toBe('COMPLETED');

      // Verify wallet balance was deducted
      const updatedWallet = await getWallet(user.id);
      expect(parseFloat(updatedWallet.balance)).toBe(-2000);
    });

    it('should handle failed transfer webhook', async () => {
      const { user } = await createTestUser();
      const wallet = await getWallet(user.id);

      const transaction = await createTestTransaction(wallet.id, {
        type: 'WITHDRAWAL',
        amount: -2000,
        status: 'PENDING',
      });

      const webhookData = {
        event: 'transfer.completed',
        data: {
          id: 789012,
          reference: `withdrawal_${transaction.id}_${Date.now()}`,
          status: 'failed',
          amount: 2000,
        },
      };

      const payload = JSON.stringify(webhookData);
      const signature = crypto
        .createHmac('sha256', config.flutterwave.webhookSecret!)
        .update(payload)
        .digest('hex');

      await request(app)
        .post('/api/v1/payments/webhook')
        .set('verif-hash', signature)
        .send(webhookData)
        .expect(200);

      // Verify transaction was marked as failed
      const txResult = await query(
        'SELECT * FROM transactions WHERE id = $1',
        [transaction.id]
      );
      expect(txResult.rows[0].status).toBe('FAILED');

      // Verify wallet balance was NOT deducted
      const updatedWallet = await getWallet(user.id);
      expect(parseFloat(updatedWallet.balance)).toBe(0);
    });
  });

  describe('POST /api/v1/wallet/withdraw', () => {
    it('should create withdrawal request', async () => {
      const { user, token } = await createTestUser();
      const wallet = await getWallet(user.id);

      // Credit wallet first
      await query(
        `INSERT INTO transactions (wallet_id, type, amount, status)
         VALUES ($1, 'ESCROW_RELEASE', 10000, 'COMPLETED')`,
        [wallet.id]
      );

      const withdrawalData = {
        amount: 5000,
        account_number: '0123456789',
        bank_code: '058',
      };

      const response = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send(withdrawalData)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.amount).toBe(5000);

      // Verify transaction created
      const txResult = await query(
        'SELECT * FROM transactions WHERE wallet_id = $1 AND type = $2',
        [wallet.id, 'WITHDRAWAL']
      );
      expect(txResult.rows.length).toBe(1);
      expect(txResult.rows[0].status).toBe('PENDING');
      expect(JSON.parse(txResult.rows[0].metadata).account_number).toBe('0123456789');
    });

    it('should reject withdrawal with insufficient balance', async () => {
      const { token } = await createTestUser();

      const response = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 5000,
          account_number: '0123456789',
          bank_code: '058',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient balance');
    });

    it('should reject invalid account number', async () => {
      const { token } = await createTestUser();

      const response = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 5000,
          account_number: '123', // Too short
          bank_code: '058',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should reject negative withdrawal amount', async () => {
      const { token } = await createTestUser();

      const response = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: -1000,
          account_number: '0123456789',
          bank_code: '058',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/wallet', () => {
    it('should return wallet with balance and transactions', async () => {
      const { user, token } = await createTestUser();
      const wallet = await getWallet(user.id);

      // Create some transactions
      await query(
        `INSERT INTO transactions (wallet_id, type, amount, status)
         VALUES ($1, 'ESCROW_RELEASE', 5000, 'COMPLETED')`,
        [wallet.id]
      );

      const response = await request(app)
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.wallet).toBeDefined();
      expect(parseFloat(response.body.data.wallet.balance)).toBe(5000);
      expect(response.body.data.recent_transactions).toBeDefined();
      expect(response.body.data.recent_transactions.length).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/wallet')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/wallet/transactions', () => {
    it('should return paginated transaction history', async () => {
      const { user, token } = await createTestUser();
      const wallet = await getWallet(user.id);

      // Create multiple transactions
      for (let i = 0; i < 15; i++) {
        await query(
          `INSERT INTO transactions (wallet_id, type, amount, status)
           VALUES ($1, 'ESCROW_RELEASE', ${1000 + i}, 'COMPLETED')`,
          [wallet.id]
        );
      }

      // Get first page
      const response = await request(app)
        .get('/api/v1/wallet/transactions')
        .query({ limit: '10', offset: '0' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(10);

      // Get second page
      const response2 = await request(app)
        .get('/api/v1/wallet/transactions')
        .query({ limit: '10', offset: '10' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response2.body.data.length).toBe(5);
    });

    it('should validate pagination parameters', async () => {
      const { token } = await createTestUser();

      const response = await request(app)
        .get('/api/v1/wallet/transactions')
        .query({ limit: '200' }) // Over limit
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });
  });

  describe('Platform Fee Calculation', () => {
    it('should correctly calculate and record platform fee', async () => {
      const { user: poster } = await createTestUser('+2348012345678', 'Poster');
      const { user: doer } = await createTestUser('+2348087654321', 'Doer');

      const task = await createTestTask(poster.id, { fee_amount: 10000 });

      // Set task to completed
      await query(
        'UPDATE tasks SET status = $1, doer_id = $2, completed_at = NOW() WHERE id = $3',
        ['COMPLETED', doer.id, task.id]
      );

      // Release payment
      const { PaymentService } = await import('../../src/services/payment.service');
      await PaymentService.releaseEscrowPayment(task.id);

      // Check doer wallet
      const doerWallet = await getWallet(doer.id);
      expect(parseFloat(doerWallet.balance)).toBe(8500); // 10000 - 15%

      // Check platform fee transaction
      const posterWallet = await getWallet(poster.id);
      const feeResult = await query(
        'SELECT * FROM transactions WHERE wallet_id = $1 AND type = $2',
        [posterWallet.id, 'PLATFORM_FEE']
      );
      expect(feeResult.rows.length).toBe(1);
      expect(parseFloat(feeResult.rows[0].amount)).toBe(1500); // 15% of 10000
      expect(parseFloat(feeResult.rows[0].platform_fee)).toBe(1500);
    });
  });

  describe('Wallet Balance Triggers', () => {
    it('should automatically update balance when transaction is completed', async () => {
      const { user } = await createTestUser();
      const wallet = await getWallet(user.id);

      expect(parseFloat(wallet.balance)).toBe(0);

      // Create a completed transaction
      await query(
        `INSERT INTO transactions (wallet_id, type, amount, status)
         VALUES ($1, 'ESCROW_RELEASE', 5000, 'COMPLETED')`,
        [wallet.id]
      );

      // Check balance was updated
      const updatedWallet = await getWallet(user.id);
      expect(parseFloat(updatedWallet.balance)).toBe(5000);

      // Add another transaction
      await query(
        `INSERT INTO transactions (wallet_id, type, amount, status)
         VALUES ($1, 'WITHDRAWAL', -2000, 'COMPLETED')`,
        [wallet.id]
      );

      const finalWallet = await getWallet(user.id);
      expect(parseFloat(finalWallet.balance)).toBe(3000);
    });

    it('should not update balance for pending transactions', async () => {
      const { user } = await createTestUser();
      const wallet = await getWallet(user.id);

      await query(
        `INSERT INTO transactions (wallet_id, type, amount, status)
         VALUES ($1, 'ESCROW_HOLD', 5000, 'PENDING')`,
        [wallet.id]
      );

      const updatedWallet = await getWallet(user.id);
      expect(parseFloat(updatedWallet.balance)).toBe(0);
    });
  });
});
