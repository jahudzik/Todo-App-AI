/**
 * Unit tests for Error Handler middleware
 * Tests custom error handling, Prisma errors, and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler, asyncHandler, createError } from '../errorHandler';
import { createMockRequest, createMockResponse, createMockNext } from '../../__tests__/testUtils';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('AppError Class', () => {
    it('should create custom error with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('Error');
    });

    it('should maintain proper stack trace', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
    });
  });

  describe('createError Helper', () => {
    it('should create AppError instance', () => {
      const error = createError('Test message', 422, 'VALIDATION_ERROR');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('errorHandler Middleware', () => {
    it('should handle AppError instances correctly', () => {
      const customError = new AppError('Custom error message', 422, 'CUSTOM_ERROR');

      errorHandler(customError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'CUSTOM_ERROR',
        message: 'Custom error message',
      });
    });

    it('should handle Prisma known request errors', () => {
      const prismaError = new Error('Prisma error');
      prismaError.name = 'PrismaClientKnownRequestError';

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Database operation failed',
      });
    });

    it('should handle validation errors', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      errorHandler(validationError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
      });
    });

    it('should handle JSON syntax errors', () => {
      const jsonError = new SyntaxError('Unexpected token in JSON');
      (jsonError as any).body = 'invalid json';

      errorHandler(jsonError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      });
    });

    it('should handle generic errors with default response', () => {
      const genericError = new Error('Some random error');

      errorHandler(genericError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      });
    });

    it('should include error details in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const testError = new Error('Test error');
      testError.stack = 'Error stack trace';

      errorHandler(testError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: {
          stack: 'Error stack trace',
          name: 'Error',
        },
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include error details in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const testError = new Error('Test error');

      errorHandler(testError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should log error details', () => {
      const { logger } = require('../../utils/logger');
      const testError = new Error('Test error');
      
      mockRequest.url = '/api/test';
      mockRequest.method = 'POST';
      mockRequest.body = { test: 'data' };
      mockRequest.query = { param: 'value' };
      mockRequest.params = { id: '123' };

      errorHandler(testError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Error occurred:', {
        message: 'Test error',
        stack: testError.stack,
        url: '/api/test',
        method: 'POST',
        body: { test: 'data' },
        query: { param: 'value' },
        params: { id: '123' },
      });
    });
  });

  describe('asyncHandler Wrapper', () => {
    it('should call next with error when async function rejects', async () => {
      const testError = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(testError);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });

    it('should not call next when async function resolves', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
    });


    it('should pass through function arguments correctly', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
    });
  });
});