import request from 'supertest';
import app from '../../src/app';
import { cleanDatabase, createTestUser } from '../helpers';
import { query } from '../../src/config/database';

describe('Auth Flow Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe('POST /api/v1/auth/send-otp', () => {
    it('should send OTP to valid phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone_number: '+2348012345678' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');

      // Verify OTP was created in database
      const otpResult = await query(
        'SELECT * FROM otp_records WHERE phone_number = $1',
        ['+2348012345678']
      );
      expect(otpResult.rows.length).toBe(1);
      expect(otpResult.rows[0].otp_code).toMatch(/^\d{6}$/);
    });

    it('should reject invalid phone number format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone_number: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should reject missing phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should normalize phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone_number: '08012345678' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check normalized format in database
      const otpResult = await query(
        'SELECT * FROM otp_records WHERE phone_number LIKE $1',
        ['%8012345678']
      );
      expect(otpResult.rows.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should verify correct OTP and return JWT token', async () => {
      const phoneNumber = '+2348012345678';

      // First send OTP
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone_number: phoneNumber });

      // Get OTP from database
      const otpResult = await query(
        'SELECT otp_code FROM otp_records WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1',
        [phoneNumber]
      );
      const otpCode = otpResult.rows[0].otp_code;

      // Verify OTP
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone_number: phoneNumber,
          otp_code: otpCode,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.phone_number).toBe(phoneNumber);

      // Verify user was created
      const userResult = await query(
        'SELECT * FROM users WHERE phone_number = $1',
        [phoneNumber]
      );
      expect(userResult.rows.length).toBe(1);
      expect(userResult.rows[0].phone_verified).toBe(true);

      // Verify wallet was auto-created
      const walletResult = await query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [userResult.rows[0].id]
      );
      expect(walletResult.rows.length).toBe(1);
      expect(walletResult.rows[0].balance).toBe('0.00');
    });

    it('should reject incorrect OTP', async () => {
      const phoneNumber = '+2348012345678';

      // Send OTP
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone_number: phoneNumber });

      // Try wrong OTP
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone_number: phoneNumber,
          otp_code: '000000',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired OTP');
    });

    it('should reject expired OTP', async () => {
      const phoneNumber = '+2348012345678';

      // Create expired OTP directly in database
      const expiredTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      await query(
        `INSERT INTO otp_records (phone_number, otp_code, expires_at)
         VALUES ($1, '123456', $2)`,
        [phoneNumber, expiredTime]
      );

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone_number: phoneNumber,
          otp_code: '123456',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired OTP');
    });

    it('should reject invalid OTP format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone_number: '+2348012345678',
          otp_code: '12345', // Only 5 digits
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user with valid token', async () => {
      const { user, token } = await createTestUser();

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.phone_number).toBe(user.phone_number);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('PATCH /api/v1/auth/profile', () => {
    it('should update user name', async () => {
      const { user, token } = await createTestUser();

      const response = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');

      // Verify in database
      const userResult = await query(
        'SELECT * FROM users WHERE id = $1',
        [user.id]
      );
      expect(userResult.rows[0].name).toBe('Updated Name');
    });

    it('should reject empty name', async () => {
      const { token } = await createTestUser();

      const response = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject name longer than 100 characters', async () => {
      const { token } = await createTestUser();

      const response = await request(app)
        .patch('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'a'.repeat(101) })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });
  });
});
