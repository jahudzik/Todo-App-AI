/**
 * Unit tests for Lists Controller
 * Tests API endpoint logic, data transformation, and error handling
 */

import { Request, Response } from 'express';
import { getAllLists, createList, updateList, deleteList } from '../listsController';
import { createMockRequest, createMockResponse, mockTodoLists, MockPrismaClientKnownRequestError, MockPrismaClientInitializationError } from '../../__tests__/testUtils';

// Create mock database
const mockDb = {
  todoList: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  todoItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
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

jest.mock('@db', () => {
  // Define mock classes locally
  class LocalMockPrismaClientKnownRequestError extends Error {
    public code: string;
    public clientVersion: string;
    
    constructor(code: string, message: string) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = code;
      this.clientVersion = '5.0.0';
      Object.setPrototypeOf(this, LocalMockPrismaClientKnownRequestError.prototype);
    }
  }

  class LocalMockPrismaClientInitializationError extends Error {
    public clientVersion: string;
    
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientInitializationError';
      this.clientVersion = '5.0.0';
      Object.setPrototypeOf(this, LocalMockPrismaClientInitializationError.prototype);
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError: LocalMockPrismaClientKnownRequestError,
      PrismaClientInitializationError: LocalMockPrismaClientInitializationError,
    },
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../middleware/errorHandler', () => {
  // Mock AppError class
  class MockAppError extends Error {
    public statusCode: number;
    public code: string;
    public isOperational: boolean;

    constructor(message: string, statusCode: number, code: string) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.isOperational = true;
    }
  }

  return {
    createError: jest.fn((message, status, code) => {
      return new MockAppError(message, status, code);
    }),
    AppError: MockAppError,
  };
});

jest.mock('../../utils/gapIndexing', () => ({
  getNextListOrderIndex: jest.fn(),
}));

jest.mock('../../utils/validation', () => ({
  validateListName: jest.fn(),
  validateListId: jest.fn(),
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
          orderIndex: 'desc',
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

  describe('createList', () => {
    const mockGetNextListOrderIndex = require('../../utils/gapIndexing').getNextListOrderIndex;

    it('should successfully create a new list with default name', async () => {
      const mockNewList = {
        id: 'new-list-id',
        name: 'New List',
        userId: 'demo',
        orderIndex: 3000,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };

      mockGetNextListOrderIndex.mockResolvedValue(3000);
      mockDb.todoList.create.mockResolvedValue(mockNewList);

      await createList(mockRequest as Request, mockResponse as Response);

      // Verify gap indexing calculation
      expect(mockGetNextListOrderIndex).toHaveBeenCalledWith('demo');

      // Verify database creation
      expect(mockDb.todoList.create).toHaveBeenCalledWith({
        data: {
          name: 'New List',
          userId: 'demo',
          orderIndex: 3000,
        },
        include: {
          items: {
            orderBy: [
              { isCompleted: 'asc' },
              { positionInList: 'asc' },
            ],
          },
        },
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'new-list-id',
          name: 'New List',
          userId: 'demo',
          orderIndex: 3000,
          createdAt: mockNewList.createdAt,
          updatedAt: mockNewList.updatedAt,
          items: [],
        },
      });
    });

    it('should handle gap indexing errors', async () => {
      const gapError = new Error('Gap indexing failed');
      mockGetNextListOrderIndex.mockRejectedValue(gapError);

      await expect(createList(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Gap indexing failed');
    });

    it('should handle unique constraint violations', async () => {
      const conflictError = new MockPrismaClientKnownRequestError('P2002', 'Unique constraint violation');
      
      mockGetNextListOrderIndex.mockResolvedValue(1000);
      mockDb.todoList.create.mockRejectedValue(conflictError);

      await expect(createList(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(); // Just ensure it throws some error
    });

    it('should log creation attempts and results', async () => {
      const { logger } = require('../../utils/logger');
      const mockNewList = {
        id: 'new-list-id',
        name: 'New List',
        userId: 'demo',
        orderIndex: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };

      mockGetNextListOrderIndex.mockResolvedValue(1000);
      mockDb.todoList.create.mockResolvedValue(mockNewList);

      await createList(mockRequest as Request, mockResponse as Response);

      expect(logger.info).toHaveBeenCalledWith('Creating new list for user: demo');
      expect(logger.info).toHaveBeenCalledWith('Created new list with ID: new-list-id, orderIndex: 1000');
    });
  });

  describe('updateList', () => {
    const mockValidateListId = require('../../utils/validation').validateListId;
    const mockValidateListName = require('../../utils/validation').validateListName;

    beforeEach(() => {
      mockRequest.params = { id: 'list-123' };
      mockRequest.body = { name: 'Updated List Name' };
    });

    it('should successfully update a list name', async () => {
      const mockExistingList = { id: 'list-123', userId: 'demo' };
      const mockUpdatedList = {
        id: 'list-123',
        name: 'Updated List Name',
        userId: 'demo',
        orderIndex: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };

      mockValidateListId.mockImplementation(() => {});
      mockValidateListName.mockReturnValue('Updated List Name');
      mockDb.todoList.findFirst.mockResolvedValue(mockExistingList);
      mockDb.todoList.update.mockResolvedValue(mockUpdatedList);

      await updateList(mockRequest as Request, mockResponse as Response);

      // Verify validation calls
      expect(mockValidateListId).toHaveBeenCalledWith('list-123');
      expect(mockValidateListName).toHaveBeenCalledWith('Updated List Name');

      // Verify existence check
      expect(mockDb.todoList.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'list-123',
          userId: 'demo',
        },
      });

      // Verify update
      expect(mockDb.todoList.update).toHaveBeenCalledWith({
        where: { id: 'list-123' },
        data: { name: 'Updated List Name' },
        include: {
          items: {
            orderBy: [
              { isCompleted: 'asc' },
              { positionInList: 'asc' },
            ],
          },
        },
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedList,
      });
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('List name is required');
      (validationError as any).statusCode = 400;
      
      mockValidateListId.mockImplementation(() => {});
      mockValidateListName.mockImplementation(() => {
        throw validationError;
      });

      await expect(updateList(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('List name is required');
    });

    it('should handle list not found', async () => {
      const { createError } = require('../../middleware/errorHandler');
      
      mockValidateListId.mockImplementation(() => {});
      mockValidateListName.mockReturnValue('Valid Name');
      mockDb.todoList.findFirst.mockResolvedValue(null);

      await expect(updateList(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow();

      expect(createError).toHaveBeenCalledWith(
        'List not found',
        404,
        'NOT_FOUND'
      );
    });

    it('should handle Prisma P2025 errors', async () => {
      const notFoundError = new MockPrismaClientKnownRequestError('P2025', 'Record not found');
      
      mockValidateListId.mockImplementation(() => {});
      mockValidateListName.mockReturnValue('Valid Name');
      mockDb.todoList.findFirst.mockResolvedValue({ id: 'list-123', userId: 'demo' });
      mockDb.todoList.update.mockRejectedValue(notFoundError);

      await expect(updateList(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(); // Just ensure it throws some error
    });

    it('should log update attempts and results', async () => {
      const { logger } = require('../../utils/logger');
      const mockExistingList = { id: 'list-123', userId: 'demo' };
      const mockUpdatedList = {
        id: 'list-123',
        name: 'Updated List Name',
        userId: 'demo',
        orderIndex: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };

      mockValidateListId.mockImplementation(() => {});
      mockValidateListName.mockReturnValue('Updated List Name');
      mockDb.todoList.findFirst.mockResolvedValue(mockExistingList);
      mockDb.todoList.update.mockResolvedValue(mockUpdatedList);

      await updateList(mockRequest as Request, mockResponse as Response);

      expect(logger.info).toHaveBeenCalledWith('Updating list list-123 with name: Updated List Name');
      expect(logger.info).toHaveBeenCalledWith('Successfully updated list list-123');
    });
  });

  describe('deleteList', () => {
    const mockValidateListId = require('../../utils/validation').validateListId;

    beforeEach(() => {
      mockRequest.params = { id: 'list-123' };
    });

    it('should successfully delete a list and its items', async () => {
      const mockExistingList = {
        id: 'list-123',
        userId: 'demo',
        _count: { items: 5 },
      };

      mockValidateListId.mockImplementation(() => {});
      mockDb.todoList.findFirst.mockResolvedValue(mockExistingList);
      mockDb.todoList.delete.mockResolvedValue({ id: 'list-123' });

      await deleteList(mockRequest as Request, mockResponse as Response);

      // Verify validation
      expect(mockValidateListId).toHaveBeenCalledWith('list-123');

      // Verify existence check with item count
      expect(mockDb.todoList.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'list-123',
          userId: 'demo',
        },
        include: {
          _count: {
            select: { items: true },
          },
        },
      });

      // Verify deletion
      expect(mockDb.todoList.delete).toHaveBeenCalledWith({
        where: { id: 'list-123' },
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'List deleted permanently along with 5 items',
        data: {
          deletedListId: 'list-123',
          deletedItemsCount: 5,
        },
      });
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Invalid list ID format');
      (validationError as any).statusCode = 400;
      
      mockValidateListId.mockImplementation(() => {
        throw validationError;
      });

      await expect(deleteList(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow('Invalid list ID format');
    });

    it('should handle list not found', async () => {
      const { createError } = require('../../middleware/errorHandler');
      
      mockValidateListId.mockImplementation(() => {});
      mockDb.todoList.findFirst.mockResolvedValue(null);

      await expect(deleteList(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow();

      expect(createError).toHaveBeenCalledWith(
        'List not found',
        404,
        'NOT_FOUND'
      );
    });

    it('should handle Prisma P2025 errors', async () => {
      const notFoundError = new MockPrismaClientKnownRequestError('P2025', 'Record not found');
      
      mockValidateListId.mockImplementation(() => {});
      mockDb.todoList.findFirst.mockResolvedValue({ id: 'list-123', userId: 'demo', _count: { items: 0 } });
      mockDb.todoList.delete.mockRejectedValue(notFoundError);

      await expect(deleteList(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(); // Just ensure it throws some error
    });

    it('should log deletion attempts and results', async () => {
      const { logger } = require('../../utils/logger');
      const mockExistingList = {
        id: 'list-123',
        userId: 'demo',
        _count: { items: 3 },
      };

      mockValidateListId.mockImplementation(() => {});
      mockDb.todoList.findFirst.mockResolvedValue(mockExistingList);
      mockDb.todoList.delete.mockResolvedValue({ id: 'list-123' });

      await deleteList(mockRequest as Request, mockResponse as Response);

      expect(logger.info).toHaveBeenCalledWith('Deleting list list-123 and all its items');
      expect(logger.info).toHaveBeenCalledWith('Successfully deleted list list-123 and 3 items');
    });

    it('should delete list with zero items', async () => {
      const mockExistingList = {
        id: 'list-123',
        userId: 'demo',
        _count: { items: 0 },
      };

      mockValidateListId.mockImplementation(() => {});
      mockDb.todoList.findFirst.mockResolvedValue(mockExistingList);
      mockDb.todoList.delete.mockResolvedValue({ id: 'list-123' });

      await deleteList(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'List deleted permanently along with 0 items',
        data: {
          deletedListId: 'list-123',
          deletedItemsCount: 0,
        },
      });
    });
  });
});