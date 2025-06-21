/**
 * Testing utilities and helper functions
 * Provides common mocks, fixtures, and test helpers
 */

import { Request, Response } from 'express';

/**
 * Create a mock Express Request object for testing
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    url: '/test',
    method: 'GET',
    ...overrides,
  };
}

/**
 * Create a mock Express Response object for testing
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create a mock Next function for middleware testing
 */
export function createMockNext(): jest.Mock {
  return jest.fn();
}

/**
 * Sample test data fixtures
 */
export const mockTodoLists = [
  {
    id: '1',
    name: 'Personal Tasks',
    userId: 'demo',
    orderIndex: 100,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    items: [
      {
        id: '1',
        title: 'Buy groceries',
        isCompleted: false,
        positionInList: 100,
        listId: '1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: '2',
        title: 'Walk the dog',
        isCompleted: true,
        positionInList: 200,
        listId: '1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
    ],
  },
  {
    id: '2',
    name: 'Work Tasks',
    userId: 'demo',
    orderIndex: 200,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    items: [
      {
        id: '3',
        title: 'Review pull request',
        isCompleted: false,
        positionInList: 100,
        listId: '2',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
    ],
  },
];

/**
 * Mock Prisma error instances for testing error handling
 */
export class MockPrismaClientKnownRequestError extends Error {
  public code: string;
  public clientVersion: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = code;
    this.clientVersion = '5.0.0';
  }
}

export class MockPrismaClientInitializationError extends Error {
  public clientVersion: string;
  
  constructor(message: string) {
    super(message);
    this.name = 'PrismaClientInitializationError';
    this.clientVersion = '5.0.0';
  }
}

/**
 * Utility to create consistent API response formats for testing
 */
export function createApiResponse(data: any, meta?: any) {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Utility to create consistent error response formats for testing
 */
export function createErrorResponse(code: string, message: string, details?: any) {
  return {
    success: false,
    error: code,
    message,
    ...(details && { details }),
  };
}