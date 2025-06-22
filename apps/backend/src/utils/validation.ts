import { createError } from '../middleware/errorHandler';

/**
 * Validation utilities for input sanitization and validation
 */

/**
 * Validates and sanitizes list name input
 * @param name - The list name to validate
 * @returns Sanitized list name
 * @throws ValidationError if name is invalid
 */
export function validateListName(name: string): string {
  // Check if name is provided
  if (!name) {
    throw createError(
      'List name is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Trim whitespace
  const trimmedName = name.trim();

  // Check if name is empty after trimming
  if (trimmedName.length === 0) {
    throw createError(
      'List name cannot be empty',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Check length constraints
  if (trimmedName.length > 100) {
    throw createError(
      'List name must be between 1 and 100 characters',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Basic HTML sanitization - remove potentially dangerous characters
  const sanitizedName = trimmedName
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/&/g, '&amp;') // Escape ampersands
    .replace(/"/g, '&quot;') // Escape double quotes
    .replace(/'/g, '&#x27;'); // Escape single quotes

  return sanitizedName;
}

/**
 * Validates and sanitizes item title input
 * @param title - The item title to validate
 * @returns Sanitized item title
 * @throws ValidationError if title is invalid
 */
export function validateItemTitle(title: string): string {
  // Check if title is provided
  if (!title) {
    throw createError(
      'Item title is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Trim whitespace
  const trimmedTitle = title.trim();

  // Check if title is empty after trimming
  if (trimmedTitle.length === 0) {
    throw createError(
      'Item title cannot be empty',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Check length constraints
  if (trimmedTitle.length > 500) {
    throw createError(
      'Item title must be between 1 and 500 characters',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Basic HTML sanitization
  const sanitizedTitle = trimmedTitle
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/&/g, '&amp;') // Escape ampersands
    .replace(/"/g, '&quot;') // Escape double quotes
    .replace(/'/g, '&#x27;'); // Escape single quotes

  return sanitizedTitle;
}

/**
 * Validates that a string is a valid CUID
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidCuid(id: string): boolean {
  // CUID format: c followed by 24 alphanumeric characters
  const cuidRegex = /^c[a-z0-9]{24}$/;
  return cuidRegex.test(id);
}

/**
 * Validates list ID parameter
 * @param id - The list ID to validate
 * @throws ValidationError if ID is invalid
 */
export function validateListId(id: string): void {
  if (!id || typeof id !== 'string') {
    throw createError(
      'List ID is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!isValidCuid(id)) {
    throw createError(
      'Invalid list ID format',
      400,
      'VALIDATION_ERROR'
    );
  }
}

/**
 * Validates item ID parameter
 * @param id - The item ID to validate
 * @throws ValidationError if ID is invalid
 */
export function validateItemId(id: string): void {
  if (!id || typeof id !== 'string') {
    throw createError(
      'Item ID is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!isValidCuid(id)) {
    throw createError(
      'Invalid item ID format',
      400,
      'VALIDATION_ERROR'
    );
  }
}