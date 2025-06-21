/**
 * Jest test setup file
 * Configures testing environment and global test utilities
 */

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/todoapp_test';
process.env.LOG_LEVEL = 'ERROR'; // Reduce log noise in tests

// Increase test timeout for database operations
jest.setTimeout(30000);

// Note: Database mocking is handled per-test file as needed

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up process listeners to avoid warnings
beforeEach(() => {
  // Remove any existing database process listeners
  process.removeAllListeners('beforeExit');
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
});