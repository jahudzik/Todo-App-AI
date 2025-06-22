/**
 * Unit tests for Validation utilities
 * Tests input validation, sanitization, and error handling
 */

import { 
  validateListName,
  validateItemTitle,
  isValidCuid,
  validateListId,
} from '../validation';

// Mock error handler
jest.mock('../../middleware/errorHandler', () => ({
  createError: jest.fn((message, status, code, field) => {
    const error = new Error(message);
    (error as any).statusCode = status;
    (error as any).code = code;
    (error as any).field = field;
    return error;
  }),
}));

describe('Validation Utilities', () => {
  const { createError } = require('../../middleware/errorHandler');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateListName', () => {
    it('should return sanitized name for valid input', () => {
      const result = validateListName('  My Todo List  ');
      expect(result).toBe('My Todo List');
    });

    it('should sanitize HTML characters', () => {
      const result = validateListName('<script>alert("test")</script>');
      expect(result).toBe('scriptalert(&quot;test&quot;)/script');
    });

    it('should escape special characters', () => {
      const result = validateListName('List & "quotes" & \'apostrophes\'');
      expect(result).toBe('List &amp; &quot;quotes&quot; &amp; &#x27;apostrophes&#x27;');
    });

    it('should throw error for missing name', () => {
      expect(() => validateListName('')).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'List name is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for null/undefined name', () => {
      expect(() => validateListName(null as any)).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'List name is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for empty trimmed name', () => {
      expect(() => validateListName('   ')).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'List name cannot be empty',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for name too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => validateListName(longName)).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'List name must be between 1 and 100 characters',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should accept name at character limit', () => {
      const exactLimitName = 'a'.repeat(100);
      const result = validateListName(exactLimitName);
      expect(result).toBe(exactLimitName);
    });

    it('should accept single character name', () => {
      const result = validateListName('a');
      expect(result).toBe('a');
    });
  });

  describe('validateItemTitle', () => {
    it('should return sanitized title for valid input', () => {
      const result = validateItemTitle('  Buy groceries  ');
      expect(result).toBe('Buy groceries');
    });

    it('should sanitize HTML characters', () => {
      const result = validateItemTitle('<b>Important</b> task');
      expect(result).toBe('bImportant/b task');
    });

    it('should escape special characters', () => {
      const result = validateItemTitle('Task & "quotes" & \'apostrophes\'');
      expect(result).toBe('Task &amp; &quot;quotes&quot; &amp; &#x27;apostrophes&#x27;');
    });

    it('should throw error for missing title', () => {
      expect(() => validateItemTitle('')).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'Item title is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for null/undefined title', () => {
      expect(() => validateItemTitle(undefined as any)).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'Item title is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for empty trimmed title', () => {
      expect(() => validateItemTitle('   ')).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'Item title cannot be empty',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for title too long', () => {
      const longTitle = 'a'.repeat(501);
      expect(() => validateItemTitle(longTitle)).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'Item title must be between 1 and 500 characters',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should accept title at character limit', () => {
      const exactLimitTitle = 'a'.repeat(500);
      const result = validateItemTitle(exactLimitTitle);
      expect(result).toBe(exactLimitTitle);
    });

    it('should accept single character title', () => {
      const result = validateItemTitle('a');
      expect(result).toBe('a');
    });
  });

  describe('isValidCuid', () => {
    it('should return true for valid CUID', () => {
      const validCuid = 'c' + 'a'.repeat(24);
      expect(isValidCuid(validCuid)).toBe(true);
    });

    it('should return true for valid CUID with mixed characters', () => {
      const validCuid = 'c1a2b3c4d5e6f7a8b9c0d1e2f';
      expect(isValidCuid(validCuid)).toBe(true);
    });

    it('should return false for CUID without leading c', () => {
      const invalidCuid = 'a' + 'b'.repeat(24);
      expect(isValidCuid(invalidCuid)).toBe(false);
    });

    it('should return false for CUID too short', () => {
      const invalidCuid = 'c' + 'a'.repeat(23);
      expect(isValidCuid(invalidCuid)).toBe(false);
    });

    it('should return false for CUID too long', () => {
      const invalidCuid = 'c' + 'a'.repeat(25);
      expect(isValidCuid(invalidCuid)).toBe(false);
    });

    it('should return false for CUID with invalid characters', () => {
      const invalidCuid = 'c' + 'A'.repeat(24); // uppercase not allowed
      expect(isValidCuid(invalidCuid)).toBe(false);
    });

    it('should return false for CUID with special characters', () => {
      const invalidCuid = 'c' + 'a'.repeat(23) + '_';
      expect(isValidCuid(invalidCuid)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidCuid('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidCuid(null as any)).toBe(false);
      expect(isValidCuid(undefined as any)).toBe(false);
    });
  });

  describe('validateListId', () => {
    it('should not throw for valid CUID', () => {
      const validCuid = 'c' + 'a'.repeat(24);
      expect(() => validateListId(validCuid)).not.toThrow();
    });

    it('should throw error for missing ID', () => {
      expect(() => validateListId('')).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'List ID is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for null/undefined ID', () => {
      expect(() => validateListId(null as any)).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'List ID is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for non-string ID', () => {
      expect(() => validateListId(123 as any)).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'List ID is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for invalid CUID format', () => {
      expect(() => validateListId('invalid-id')).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'Invalid list ID format',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for CUID too short', () => {
      const shortId = 'c' + 'a'.repeat(23);
      expect(() => validateListId(shortId)).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'Invalid list ID format',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw error for CUID with invalid characters', () => {
      const invalidId = 'c' + 'A'.repeat(24);
      expect(() => validateListId(invalidId)).toThrow();
      expect(createError).toHaveBeenCalledWith(
        'Invalid list ID format',
        400,
        'VALIDATION_ERROR'
      );
    });
  });
});