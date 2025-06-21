/**
 * Unit tests for Database utility functions
 * Tests connection, disconnection, and error handling
 */

// Mock the logger to avoid console output in tests
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

jest.mock('../logger', () => ({
  logger: mockLogger,
}));

// Mock the Prisma client
const mockPrismaClient = {
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('@db', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

describe('Database Utils', () => {
  let connectDatabase: any;
  let disconnectDatabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    // Re-import functions to get fresh instances
    jest.resetModules();
    const dbModule = require('../database');
    connectDatabase = dbModule.connectDatabase;
    disconnectDatabase = dbModule.disconnectDatabase;
  });

  describe('connectDatabase', () => {
    it('should successfully connect to database', async () => {
      // Mock successful connection
      mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      await expect(connectDatabase()).resolves.not.toThrow();
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });

    it('should handle database connection timeout', async () => {
      // Mock connection that takes longer than timeout by rejecting with timeout error
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Connection timeout after 10 seconds'));

      await expect(connectDatabase()).rejects.toThrow('Database connection failed');
    });

    it('should handle database connection errors', async () => {
      const connectionError = new Error('Connection refused');
      mockPrismaClient.$queryRaw.mockRejectedValue(connectionError);

      await expect(connectDatabase()).rejects.toThrow('Database connection failed: Connection refused');
    });

    it('should handle non-Error exceptions', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue('String error');

      await expect(connectDatabase()).rejects.toThrow('Database connection failed: Unknown error');
    });

    it('should log connection attempts and results', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      await connectDatabase();

      expect(mockLogger.info).toHaveBeenCalledWith('Attempting to connect to database...');
      expect(mockLogger.info).toHaveBeenCalledWith('Database URL configured:', 'Yes');
      expect(mockLogger.info).toHaveBeenCalledWith('✅ Database connection test successful');
    });

    it('should log when DATABASE_URL is not configured', async () => {
      delete process.env.DATABASE_URL;
      mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      await connectDatabase();

      expect(mockLogger.info).toHaveBeenCalledWith('Database URL configured:', 'No');
    });

    it('should log connection errors with details', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.stack = 'Error stack trace';
      mockPrismaClient.$queryRaw.mockRejectedValue(connectionError);

      await expect(connectDatabase()).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to connect to database:', {
        error: 'Connection refused',
        stack: 'Error stack trace',
      });
    });
  });

  describe('disconnectDatabase', () => {
    it('should successfully disconnect from database', async () => {
      mockPrismaClient.$disconnect.mockResolvedValue(undefined);

      await expect(disconnectDatabase()).resolves.not.toThrow();
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });

    it('should handle disconnection errors gracefully', async () => {
      const disconnectError = new Error('Disconnect failed');
      mockPrismaClient.$disconnect.mockRejectedValue(disconnectError);

      await expect(disconnectDatabase()).resolves.not.toThrow();
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });

    it('should log successful disconnection', async () => {
      mockPrismaClient.$disconnect.mockResolvedValue(undefined);

      await disconnectDatabase();

      expect(mockLogger.info).toHaveBeenCalledWith('Database connection closed');
    });

    it('should log disconnection errors', async () => {
      const disconnectError = new Error('Disconnect failed');
      mockPrismaClient.$disconnect.mockRejectedValue(disconnectError);

      await disconnectDatabase();

      expect(mockLogger.error).toHaveBeenCalledWith('Error closing database connection:', disconnectError);
    });
  });

  describe('Prisma Client Configuration', () => {
    it('should create PrismaClient instance', () => {
      const { PrismaClient } = require('@db');
      expect(PrismaClient).toBeDefined();
      expect(typeof PrismaClient).toBe('function');
    });
  });
});