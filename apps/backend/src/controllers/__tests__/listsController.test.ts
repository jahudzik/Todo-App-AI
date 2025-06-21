/**
 * Unit tests for Lists Controller
 * Tests API endpoint logic, data transformation, and error handling
 */

import { Request, Response } from 'express';
import { getAllLists } from '../listsController';
import { createMockRequest, createMockResponse, mockTodoLists, MockPrismaClientKnownRequestError, MockPrismaClientInitializationError } from '../../__tests__/testUtils';

// Create mock database
const mockDb = {
  todoList: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  todoItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock dependencies
jest.mock('../../utils/database', () => ({
  get db() { return mockDb; },
  get prisma() { return mockDb; },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../middleware/errorHandler', () => ({
  createError: jest.fn((message, status, code) => {
    const error = new Error(message);
    (error as any).statusCode = status;
    (error as any).code = code;
    return error;
  }),
}));

describe('Lists Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    
    jest.clearAllMocks();
  });

  describe('getAllLists', () => {
    it('should successfully return all lists with formatted data', async () => {
      // Mock successful database response
      mockDb.todoList.findMany.mockResolvedValue(mockTodoLists);

      await getAllLists(mockRequest as Request, mockResponse as Response);

      // Verify database query
      expect(mockDb.todoList.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'demo',
        },
        include: {
          items: {
            orderBy: [
              { isCompleted: 'asc' },
              { positionInList: 'asc' },
            ],
          },
        },
        orderBy: {
          orderIndex: 'asc',
        },
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: '1',
            name: 'Personal Tasks',
            userId: 'demo',
            orderIndex: 100,
            createdAt: mockTodoLists[0].createdAt,
            updatedAt: mockTodoLists[0].updatedAt,
            items: [
              {
                id: '1',
                title: 'Buy groceries',
                isCompleted: false,
                positionInList: 100,
                listId: '1',
                createdAt: mockTodoLists[0].items[0].createdAt,
                updatedAt: mockTodoLists[0].items[0].updatedAt,
              },
              {
                id: '2',
                title: 'Walk the dog',
                isCompleted: true,
                positionInList: 200,
                listId: '1',
                createdAt: mockTodoLists[0].items[1].createdAt,
                updatedAt: mockTodoLists[0].items[1].updatedAt,
              },
            ],
          },
          {
            id: '2',
            name: 'Work Tasks',
            userId: 'demo',
            orderIndex: 200,
            createdAt: mockTodoLists[1].createdAt,
            updatedAt: mockTodoLists[1].updatedAt,
            items: [
              {
                id: '3',
                title: 'Review pull request',
                isCompleted: false,
                positionInList: 100,
                listId: '2',
                createdAt: mockTodoLists[1].items[0].createdAt,
                updatedAt: mockTodoLists[1].items[0].updatedAt,
              },
            ],
          },
        ],
        meta: {
          total: 2,
          totalItems: 3,
        },
      });
    });

    it('should return empty array when no lists exist', async () => {
      mockDb.todoList.findMany.mockResolvedValue([]);

      await getAllLists(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: {
          total: 0,
          totalItems: 0,
        },
      });
    });

    it('should log fetching attempt and results', async () => {
      const { logger } = require('../../utils/logger');
      mockDb.todoList.findMany.mockResolvedValue(mockTodoLists);

      await getAllLists(mockRequest as Request, mockResponse as Response);

      expect(logger.info).toHaveBeenCalledWith('Fetching all lists for user: demo');
      expect(logger.info).toHaveBeenCalledWith('Found 2 lists with 3 total items');
    });

    it('should handle database errors gracefully', async () => {
      const { logger } = require('../../utils/logger');
      const dbError = new Error('Database connection failed');
      mockDb.todoList.findMany.mockRejectedValue(dbError);

      await expect(getAllLists(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Database connection failed');

      expect(logger.error).toHaveBeenCalledWith('Error fetching lists:', dbError);
    });

    it('should re-throw non-connection Prisma errors', async () => {
      const unknownError = new MockPrismaClientKnownRequestError('P2025', 'Record not found');
      mockDb.todoList.findMany.mockRejectedValue(unknownError);

      await expect(getAllLists(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Record not found');
    });

    it('should re-throw generic errors', async () => {
      const genericError = new Error('Generic error');
      mockDb.todoList.findMany.mockRejectedValue(genericError);

      await expect(getAllLists(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Generic error');
    });

    it('should log errors before throwing', async () => {
      const { logger } = require('../../utils/logger');
      const testError = new Error('Test error');
      mockDb.todoList.findMany.mockRejectedValue(testError);

      await expect(getAllLists(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith('Error fetching lists:', testError);
    });

    it('should calculate correct item counts in meta', async () => {
      const listsWithDifferentItemCounts = [
        {
          ...mockTodoLists[0],
          items: mockTodoLists[0].items.slice(0, 1), // 1 item
        },
        {
          ...mockTodoLists[1],
          items: [], // 0 items
        },
      ];
      
      mockDb.todoList.findMany.mockResolvedValue(listsWithDifferentItemCounts);

      await getAllLists(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: {
            total: 2,
            totalItems: 1,
          },
        })
      );
    });

    it('should use demo userId consistently', async () => {
      mockDb.todoList.findMany.mockResolvedValue([]);

      await getAllLists(mockRequest as Request, mockResponse as Response);

      expect(mockDb.todoList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'demo',
          },
        })
      );
    });
  });
});