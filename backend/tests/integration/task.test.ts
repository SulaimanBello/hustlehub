import request from 'supertest';
import app from '../../src/app';
import { cleanDatabase, createTestUser, createTestTask, getWallet } from '../helpers';
import { query } from '../../src/config/database';

// Mock Flutterwave API calls
jest.mock('axios', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({
    data: {
      status: 'success',
      data: {
        link: 'https://checkout.flutterwave.com/mock-link',
      },
    },
  })),
}));

describe('Task Lifecycle Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe('POST /api/v1/tasks', () => {
    it('should create task and return payment link', async () => {
      const { user, token } = await createTestUser();

      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        latitude: 6.5244,
        longitude: 3.3792,
        fee_amount: 5000,
      };

      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task).toBeDefined();
      expect(response.body.data.task.poster_id).toBe(user.id);
      expect(response.body.data.task.status).toBe('POSTED');
      expect(response.body.data.payment).toBeDefined();
      expect(response.body.data.payment.payment_link).toContain('flutterwave');

      // Verify task in database
      const taskResult = await query(
        'SELECT * FROM tasks WHERE poster_id = $1',
        [user.id]
      );
      expect(taskResult.rows.length).toBe(1);

      // Verify transaction created
      const wallet = await getWallet(user.id);
      const txResult = await query(
        'SELECT * FROM transactions WHERE wallet_id = $1 AND type = $2',
        [wallet.id, 'ESCROW_HOLD']
      );
      expect(txResult.rows.length).toBe(1);
      expect(txResult.rows[0].status).toBe('PENDING');
      expect(parseFloat(txResult.rows[0].amount)).toBe(5000);
    });

    it('should reject task without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Test Task',
          latitude: 6.5244,
          longitude: 3.3792,
          fee_amount: 5000,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject task with invalid coordinates', async () => {
      const { token } = await createTestUser();

      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Task',
          latitude: 100, // Invalid
          longitude: 3.3792,
          fee_amount: 5000,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should reject task with zero fee', async () => {
      const { token } = await createTestUser();

      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Task',
          latitude: 6.5244,
          longitude: 3.3792,
          fee_amount: 0,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/tasks/nearby', () => {
    it('should return nearby tasks', async () => {
      const { user } = await createTestUser();

      // Create a task
      await createTestTask(user.id, {
        latitude: 6.5244,
        longitude: 3.3792,
      });

      const response = await request(app)
        .get('/api/v1/tasks/nearby')
        .query({
          latitude: '6.5244',
          longitude: '3.3792',
          radius_km: '10',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].title).toBe('Test Task');
    });

    it('should not return distant tasks', async () => {
      const { user } = await createTestUser();

      // Create a task in Lagos
      await createTestTask(user.id, {
        latitude: 6.5244,
        longitude: 3.3792,
      });

      // Query from Abuja (far away)
      const response = await request(app)
        .get('/api/v1/tasks/nearby')
        .query({
          latitude: '9.0765',
          longitude: '7.3986',
          radius_km: '10',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
    });

    it('should reject invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/nearby')
        .query({
          latitude: 'invalid',
          longitude: '3.3792',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/tasks/:id/accept', () => {
    it('should allow doer to accept task', async () => {
      const { user: poster } = await createTestUser('+2348012345678', 'Poster');
      const { user: doer, token: doerToken } = await createTestUser('+2348087654321', 'Doer');

      const task = await createTestTask(poster.id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task.id}/accept`)
        .set('Authorization', `Bearer ${doerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ACCEPTED');
      expect(response.body.data.doer_id).toBe(doer.id);

      // Verify in database
      const taskResult = await query('SELECT * FROM tasks WHERE id = $1', [task.id]);
      expect(taskResult.rows[0].status).toBe('ACCEPTED');
      expect(taskResult.rows[0].doer_id).toBe(doer.id);
    });

    it('should prevent poster from accepting own task', async () => {
      const { user: poster, token } = await createTestUser();
      const task = await createTestTask(poster.id);

      const response = await request(app)
        .post(`/api/v1/tasks/${task.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot accept your own task');
    });

    it('should prevent accepting already accepted task', async () => {
      const { user: poster } = await createTestUser('+2348012345678', 'Poster');
      const { token: token1 } = await createTestUser('+2348087654321', 'Doer1');
      const { token: token2 } = await createTestUser('+2348011111111', 'Doer2');

      const task = await createTestTask(poster.id);

      // First doer accepts
      await request(app)
        .post(`/api/v1/tasks/${task.id}/accept`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      // Second doer tries to accept
      const response = await request(app)
        .post(`/api/v1/tasks/${task.id}/accept`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already accepted');
    });
  });

  describe('POST /api/v1/tasks/:id/complete', () => {
    it('should allow doer to mark task as completed', async () => {
      const { user: poster } = await createTestUser('+2348012345678', 'Poster');
      const { user: doer, token: doerToken } = await createTestUser('+2348087654321', 'Doer');

      const task = await createTestTask(poster.id);

      // Accept task
      await query(
        'UPDATE tasks SET status = $1, doer_id = $2 WHERE id = $3',
        ['ACCEPTED', doer.id, task.id]
      );

      const response = await request(app)
        .post(`/api/v1/tasks/${task.id}/complete`)
        .set('Authorization', `Bearer ${doerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.completed_at).toBeDefined();
    });

    it('should prevent non-doer from marking task complete', async () => {
      const { user: poster } = await createTestUser('+2348012345678', 'Poster');
      const { user: doer } = await createTestUser('+2348087654321', 'Doer');
      const { token: otherToken } = await createTestUser('+2348011111111', 'Other');

      const task = await createTestTask(poster.id);

      // Accept task as doer
      await query(
        'UPDATE tasks SET status = $1, doer_id = $2 WHERE id = $3',
        ['ACCEPTED', doer.id, task.id]
      );

      const response = await request(app)
        .post(`/api/v1/tasks/${task.id}/complete`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/tasks/:id/confirm', () => {
    it('should release payment when poster confirms completion', async () => {
      const { user: poster, token: posterToken } = await createTestUser('+2348012345678', 'Poster');
      const { user: doer } = await createTestUser('+2348087654321', 'Doer');

      const task = await createTestTask(poster.id, { fee_amount: 10000 });

      // Set task to COMPLETED
      await query(
        'UPDATE tasks SET status = $1, doer_id = $2, completed_at = NOW() WHERE id = $3',
        ['COMPLETED', doer.id, task.id]
      );

      const response = await request(app)
        .post(`/api/v1/tasks/${task.id}/confirm`)
        .set('Authorization', `Bearer ${posterToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('PAID');

      // Verify doer's wallet was credited
      const doerWallet = await getWallet(doer.id);
      expect(parseFloat(doerWallet.balance)).toBe(8500); // 10000 - 15% platform fee

      // Verify transactions created
      const txResult = await query(
        'SELECT * FROM transactions WHERE wallet_id = $1',
        [doerWallet.id]
      );
      expect(txResult.rows.length).toBeGreaterThan(0);

      const releaseTransaction = txResult.rows.find(tx => tx.type === 'ESCROW_RELEASE');
      expect(releaseTransaction).toBeDefined();
      expect(parseFloat(releaseTransaction.amount)).toBe(8500);
      expect(releaseTransaction.status).toBe('COMPLETED');
    });

    it('should prevent non-poster from confirming', async () => {
      const { user: poster } = await createTestUser('+2348012345678', 'Poster');
      const { user: doer, token: doerToken } = await createTestUser('+2348087654321', 'Doer');

      const task = await createTestTask(poster.id);

      await query(
        'UPDATE tasks SET status = $1, doer_id = $2, completed_at = NOW() WHERE id = $3',
        ['COMPLETED', doer.id, task.id]
      );

      const response = await request(app)
        .post(`/api/v1/tasks/${task.id}/confirm`)
        .set('Authorization', `Bearer ${doerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should allow poster to cancel unaccepted task', async () => {
      const { user: poster, token } = await createTestUser();
      const task = await createTestTask(poster.id);

      const response = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CANCELLED');
    });

    it('should prevent cancelling accepted task', async () => {
      const { user: poster, token } = await createTestUser('+2348012345678', 'Poster');
      const { user: doer } = await createTestUser('+2348087654321', 'Doer');

      const task = await createTestTask(poster.id);

      // Accept task
      await query(
        'UPDATE tasks SET status = $1, doer_id = $2 WHERE id = $3',
        ['ACCEPTED', doer.id, task.id]
      );

      const response = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not been accepted');
    });

    it('should prevent non-poster from cancelling', async () => {
      const { user: poster } = await createTestUser('+2348012345678', 'Poster');
      const { token: otherToken } = await createTestUser('+2348087654321', 'Other');

      const task = await createTestTask(poster.id);

      const response = await request(app)
        .delete(`/api/v1/tasks/${task.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
