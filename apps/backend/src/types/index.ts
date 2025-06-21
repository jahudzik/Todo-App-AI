/**
 * Common types used across the Todo App backend
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  offset?: string;
}

export interface SortQuery {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * User ID type - currently hardcoded to 'demo' for MVP
 */
export type UserId = 'demo';

/**
 * Standard error codes used throughout the application
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  INVALID_JSON = 'INVALID_JSON',
}