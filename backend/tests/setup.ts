/**
 * Test setup and global configuration
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.FLUTTERWAVE_SECRET_KEY = 'test-flw-secret';
process.env.FLUTTERWAVE_PUBLIC_KEY = 'test-flw-public';
process.env.FLUTTERWAVE_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.SMS_PROVIDER = 'mock'; // Always use mock SMS in tests

// Increase timeout for integration tests
jest.setTimeout(10000);

// Suppress console logs during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging test failures
  error: console.error,
};
