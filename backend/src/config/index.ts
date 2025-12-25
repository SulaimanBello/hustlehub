import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'FLUTTERWAVE_SECRET_KEY',
  'FLUTTERWAVE_PUBLIC_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  database: {
    url: process.env.DATABASE_URL!,
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2'),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Flutterwave
  flutterwave: {
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY!,
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY!,
    encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
    webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET,
  },

  // SMS Provider
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    termii: {
      apiKey: process.env.TERMII_API_KEY,
      senderId: process.env.TERMII_SENDER_ID || 'HustleHub',
    },
    africasTalking: {
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    },
  },

  // Business rules
  business: {
    platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '15'),
    defaultTaskRadiusKm: parseInt(process.env.DEFAULT_TASK_RADIUS_KM || '5'),
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3'),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;

export default config;
