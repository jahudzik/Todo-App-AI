/**
 * Comprehensive API client tests
 * Tests both happy paths and error scenarios for API utilities
 */

import { showApiError } from '../api';
import { toast } from 'react-hot-toast';

// Mock toast
jest.mock('react-hot-toast');
const mockToast = toast as jest.Mocked<typeof toast>;

describe('showApiError', () => {
  beforeEach(() => {
    mockToast.error.mockClear();
  });

  describe('Happy Paths - Proper Error Handling', () => {
    test('should show validation error message', () => {
      const error = {
        code: 'VALIDATION_ERROR' as const,
        message: 'Name is required',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledTimes(1);
      expect(mockToast.error).toHaveBeenCalledWith('Name is required');
    });

    test('should show not found error message', () => {
      const error = {
        code: 'NOT_FOUND' as const,
        message: 'List not found',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledTimes(1);
      expect(mockToast.error).toHaveBeenCalledWith('List not found');
    });

    test('should show network error message', () => {
      const error = {
        code: 'NETWORK_ERROR' as const,
        message: 'Connection failed',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledTimes(1);
      expect(mockToast.error).toHaveBeenCalledWith('Connection failed');
    });

    test('should show custom internal error message', () => {
      const error = {
        code: 'INTERNAL_ERROR' as const,
        message: 'Database connection failed',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledTimes(1);
      expect(mockToast.error).toHaveBeenCalledWith('Server error. Please try again later');
    });

    test('should handle different error message formats', () => {
      const errors = [
        { code: 'VALIDATION_ERROR' as const, message: 'Email format is invalid' },
        { code: 'NOT_FOUND' as const, message: 'Resource does not exist' },
        { code: 'NETWORK_ERROR' as const, message: 'Request timeout' },
      ];

      errors.forEach((error, index) => {
        showApiError(error);
        expect(mockToast.error).toHaveBeenCalledTimes(index + 1);
      });

      expect(mockToast.error).toHaveBeenCalledWith('Email format is invalid');
      expect(mockToast.error).toHaveBeenCalledWith('Resource does not exist');
      expect(mockToast.error).toHaveBeenCalledWith('Request timeout');
    });
  });

  describe('Fallback Scenarios', () => {
    test('should show default message for validation error without message', () => {
      const error = {
        code: 'VALIDATION_ERROR' as const,
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('Please check your input and try again');
    });

    test('should show default message for not found error without message', () => {
      const error = {
        code: 'NOT_FOUND' as const,
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('The requested resource was not found');
    });

    test('should show default message for network error without message', () => {
      const error = {
        code: 'NETWORK_ERROR' as const,
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('Please check your internet connection');
    });

    test('should show default message for internal error without message', () => {
      const error = {
        code: 'INTERNAL_ERROR' as const,
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('Server error. Please try again later');
    });

    test('should show default message for unknown error code', () => {
      const error = {
        code: 'UNKNOWN_ERROR' as any,
        message: 'Some unknown error',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });

    test('should show default message for error without code', () => {
      const error = {
        message: 'Error without code',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });

    test('should show default message for empty error object', () => {
      const error = {};

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });

    test('should show default message for null error', () => {
      showApiError(null);

      expect(mockToast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });

    test('should show default message for undefined error', () => {
      showApiError(undefined);

      expect(mockToast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });
  });

  describe('Edge Cases', () => {
    test('should handle error with empty string message', () => {
      const error = {
        code: 'VALIDATION_ERROR' as const,
        message: '',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('Please check your input and try again');
    });

    test('should handle error with whitespace-only message', () => {
      const error = {
        code: 'NOT_FOUND' as const,
        message: '   ',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('The requested resource was not found');
    });

    test('should handle multiple consecutive errors', () => {
      const errors = [
        { code: 'VALIDATION_ERROR' as const, message: 'Error 1' },
        { code: 'NOT_FOUND' as const, message: 'Error 2' },
        { code: 'NETWORK_ERROR' as const, message: 'Error 3' },
      ];

      errors.forEach(error => showApiError(error));

      expect(mockToast.error).toHaveBeenCalledTimes(3);
      expect(mockToast.error).toHaveBeenNthCalledWith(1, 'Error 1');
      expect(mockToast.error).toHaveBeenNthCalledWith(2, 'Error 2');
      expect(mockToast.error).toHaveBeenNthCalledWith(3, 'Error 3');
    });

    test('should handle error with non-string message', () => {
      const error = {
        code: 'VALIDATION_ERROR' as const,
        message: 123 as any,
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('Please check your input and try again');
    });

    test('should handle error with boolean message', () => {
      const error = {
        code: 'NOT_FOUND' as const,
        message: false as any,
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('The requested resource was not found');
    });
  });

  describe('Case Sensitivity', () => {
    test('should handle exact case matching for error codes', () => {
      const error = {
        code: 'validation_error' as any, // Different case
        message: 'Should use default',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });

    test('should handle mixed case error codes', () => {
      const error = {
        code: 'Validation_Error' as any,
        message: 'Should use default',
      };

      showApiError(error);

      expect(mockToast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });
  });
});