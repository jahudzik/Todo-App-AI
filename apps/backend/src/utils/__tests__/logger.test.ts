/**
 * Unit tests for Logger utility
 * Tests logging functionality, levels, and formatting
 */

describe('Logger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: {
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    log: jest.SpyInstance;
  };

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Spy on console methods
    consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      log: jest.spyOn(console, 'log').mockImplementation(),
    };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Restore console methods
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('Singleton Export', () => {
    it('should export a singleton logger instance', () => {
      const { logger } = require('../logger');
      
      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('LogLevel Enum', () => {
    it('should export LogLevel enum with correct values', () => {
      const { LogLevel } = require('../logger');
      
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
    });
  });

  describe('Logger Functionality', () => {
    it('should call appropriate console methods for each log level', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      jest.resetModules();
      const { logger } = require('../logger');

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(consoleSpy.error).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledTimes(2); // info and debug both use console.log
    });

    it('should respect ERROR log level filtering', () => {
      process.env.LOG_LEVEL = 'ERROR';
      jest.resetModules();
      const { logger } = require('../logger');

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');
      logger.debug('debug message');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should format messages with timestamp and level', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      jest.resetModules();
      const { logger } = require('../logger');

      logger.info('test message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] test message/)
      );
    });

    it('should include metadata in formatted message', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      jest.resetModules();
      const { logger } = require('../logger');

      const metadata = { userId: 'demo', action: 'test' };
      logger.info('test message', metadata);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(metadata))
      );
    });

    it('should set appropriate log level based on NODE_ENV', () => {
      // Test development environment
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      let { logger } = require('../logger');

      logger.debug('debug in dev');
      expect(consoleSpy.log).toHaveBeenCalled();

      // Reset for production test
      jest.clearAllMocks();
      jest.resetModules();

      // Test production environment
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      ({ logger } = require('../logger'));

      logger.debug('debug in prod');
      expect(consoleSpy.log).not.toHaveBeenCalled();

      logger.info('info in prod');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});