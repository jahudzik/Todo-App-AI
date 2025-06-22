import { Request, Response } from 'express';
import { Prisma } from '@db';
import {
  getItemsByListId,
  createItem,
  updateItem,
  deleteItem,
  toggleItemCompletion,
  moveItem,
  moveItemBetweenSections,
  batchUpdateItems,
} from '../itemsController';

// Mock all dependencies
jest.mock('../../utils/database', () => ({
  db: {
    todoList: {
      findFirst: jest.fn(),
    },
    todoItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../middleware/errorHandler', () => ({
  createError: jest.fn((message: string, statusCode: number, code: string) => {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    error.code = code;
    return error;
  }),
}));

jest.mock('../../utils/gapIndexing', () => ({
  getNextItemPosition: jest.fn(),
  calculateItemPosition: jest.fn(),
}));

jest.mock('../../utils/validation', () => ({
  validateItemTitle: jest.fn(),
  validateListId: jest.fn(),
  isValidCuid: jest.fn(),
}));

// Import mocked modules
import { db } from '../../utils/database';
import { logger } from '../../utils/logger';
import { createError } from '../../middleware/errorHandler';
import { getNextItemPosition, calculateItemPosition } from '../../utils/gapIndexing';
import { validateItemTitle, validateListId, isValidCuid } from '../../utils/validation';

// Type the mocks
const mockDb = db as jest.Mocked<typeof db>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockCreateError = createError as jest.MockedFunction<typeof createError>;
const mockGetNextItemPosition = getNextItemPosition as jest.MockedFunction<typeof getNextItemPosition>;
const mockCalculateItemPosition = calculateItemPosition as jest.MockedFunction<typeof calculateItemPosition>;
const mockValidateItemTitle = validateItemTitle as jest.MockedFunction<typeof validateItemTitle>;
const mockValidateListId = validateListId as jest.MockedFunction<typeof validateListId>;
const mockIsValidCuid = isValidCuid as jest.MockedFunction<typeof isValidCuid>;

describe('ItemsController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  // Sample test data
  const mockListId = 'clisttest123456789012345';
  const mockItemId = 'citemtest123456789012345';
  const mockList = {
    id: mockListId,
    name: 'Test List',
    userId: 'demo',
    orderIndex: 1000,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
  const mockItem = {
    id: mockItemId,
    title: 'Test Item',
    isCompleted: false,
    positionInList: 1000,
    listId: mockListId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock behavior
    mockValidateListId.mockImplementation(() => {});
    mockValidateItemTitle.mockImplementation((title) => title);
    mockIsValidCuid.mockReturnValue(true);
  });

  describe('getItemsByListId', () => {
    beforeEach(() => {
      mockReq.query = { listId: mockListId };
    });

    it('should successfully fetch items for a valid list', async () => {
      const mockItems = [mockItem];
      (mockDb.todoList.findFirst as jest.Mock).mockResolvedValue(mockList);
      (mockDb.todoItem.findMany as jest.Mock).mockResolvedValue(mockItems);

      await getItemsByListId(mockReq as Request, mockRes as Response);

      expect(mockValidateListId).toHaveBeenCalledWith(mockListId);
      expect(mockDb.todoList.findFirst).toHaveBeenCalledWith({
        where: { id: mockListId, userId: 'demo' },
      });
      expect(mockDb.todoItem.findMany).toHaveBeenCalledWith({
        where: { listId: mockListId },
        orderBy: [
          { isCompleted: 'asc' },
          { positionInList: 'asc' },
        ],
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockItems,
        meta: {
          total: 1,
          listId: mockListId,
        },
      });
    });

    it('should throw validation error for missing listId', async () => {
      mockReq.query = {};

      await expect(getItemsByListId(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'List ID is required as query parameter',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw not found error for non-existent list', async () => {
      (mockDb.todoList.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(getItemsByListId(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'List not found',
        404,
        'NOT_FOUND'
      );
    });

    it('should handle database connection errors', async () => {
      const connectionError = new Prisma.PrismaClientInitializationError('Connection failed', '4.0.0', 'P1001');
      (mockDb.todoList.findFirst as jest.Mock).mockRejectedValue(connectionError);

      await expect(getItemsByListId(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'Unable to connect to database',
        503,
        'DATABASE_CONNECTION_ERROR'
      );
    });
  });

  describe('createItem', () => {
    beforeEach(() => {
      mockReq.body = { title: 'New Item', listId: mockListId };
    });

    it('should successfully create a new item', async () => {
      const newItem = { ...mockItem, title: 'New Item' };
      (mockDb.todoList.findFirst as jest.Mock).mockResolvedValue(mockList);
      mockGetNextItemPosition.mockResolvedValue(2000);
      (mockDb.todoItem.create as jest.Mock).mockResolvedValue(newItem);

      await createItem(mockReq as Request, mockRes as Response);

      expect(mockValidateListId).toHaveBeenCalledWith(mockListId);
      expect(mockValidateItemTitle).toHaveBeenCalledWith('New Item');
      expect(mockGetNextItemPosition).toHaveBeenCalledWith(mockListId);
      expect(mockDb.todoItem.create).toHaveBeenCalledWith({
        data: {
          title: 'New Item',
          listId: mockListId,
          positionInList: 2000,
          isCompleted: false,
        },
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: newItem,
      });
    });

    it('should throw validation error for missing listId', async () => {
      mockReq.body = { title: 'New Item' };

      await expect(createItem(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'List ID is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw not found error for non-existent list', async () => {
      (mockDb.todoList.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(createItem(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'List not found',
        404,
        'NOT_FOUND'
      );
    });

    it('should handle unique constraint violations', async () => {
      (mockDb.todoList.findFirst as jest.Mock).mockResolvedValue(mockList);
      mockGetNextItemPosition.mockResolvedValue(2000);
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint violation',
        { code: 'P2002', clientVersion: '4.0.0' }
      );
      (mockDb.todoItem.create as jest.Mock).mockRejectedValue(uniqueError);

      await expect(createItem(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'Failed to create item due to positioning conflict. Please try again.',
        409,
        'CONFLICT_ERROR'
      );
    });
  });

  describe('updateItem', () => {
    beforeEach(() => {
      mockReq.params = { id: mockItemId };
      mockReq.body = { title: 'Updated Item' };
    });

    it('should successfully update item title', async () => {
      const existingItem = { ...mockItem, list: mockList };
      const updatedItem = { ...mockItem, title: 'Updated Item' };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      (mockDb.todoItem.update as jest.Mock).mockResolvedValue(updatedItem);

      await updateItem(mockReq as Request, mockRes as Response);

      expect(mockDb.todoItem.findFirst).toHaveBeenCalledWith({
        where: { id: mockItemId },
        include: { list: true },
      });
      expect(mockDb.todoItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { title: 'Updated Item' },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: updatedItem,
      });
    });

    it('should successfully update completion status', async () => {
      mockReq.body = { isCompleted: true };
      const existingItem = { ...mockItem, list: mockList };
      const updatedItem = { ...mockItem, isCompleted: true };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      (mockDb.todoItem.update as jest.Mock).mockResolvedValue(updatedItem);

      await updateItem(mockReq as Request, mockRes as Response);

      expect(mockDb.todoItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { isCompleted: true },
      });
    });

    it('should successfully update position', async () => {
      mockReq.body = { positionInList: 2000 };
      const existingItem = { ...mockItem, list: mockList };
      const updatedItem = { ...mockItem, positionInList: 2000 };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      (mockDb.todoItem.update as jest.Mock).mockResolvedValue(updatedItem);

      await updateItem(mockReq as Request, mockRes as Response);

      expect(mockDb.todoItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { positionInList: 2000 },
      });
    });

    it('should throw validation error for invalid item ID', async () => {
      mockIsValidCuid.mockReturnValue(false);

      await expect(updateItem(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'Invalid item ID format',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw not found error for non-existent item', async () => {
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(updateItem(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'Item not found',
        404,
        'NOT_FOUND'
      );
    });

    it('should throw validation error for invalid completion status', async () => {
      mockReq.body = { isCompleted: 'invalid' };
      // Mock the item exists first, so validation happens
      const existingItem = { ...mockItem, list: mockList };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);

      await expect(updateItem(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'isCompleted must be a boolean value',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw validation error for invalid position', async () => {
      mockReq.body = { positionInList: -1 };
      // Mock the item exists first, so validation happens
      const existingItem = { ...mockItem, list: mockList };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);

      await expect(updateItem(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'positionInList must be a non-negative number',
        400,
        'VALIDATION_ERROR'
      );
    });
  });

  describe('deleteItem', () => {
    beforeEach(() => {
      mockReq.params = { id: mockItemId };
    });

    it('should successfully delete an item', async () => {
      const existingItem = { ...mockItem, list: mockList };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      (mockDb.todoItem.delete as jest.Mock).mockResolvedValue(mockItem);

      await deleteItem(mockReq as Request, mockRes as Response);

      expect(mockDb.todoItem.findFirst).toHaveBeenCalledWith({
        where: { id: mockItemId },
        include: { list: true },
      });
      expect(mockDb.todoItem.delete).toHaveBeenCalledWith({
        where: { id: mockItemId },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Item deleted permanently',
        data: {
          deletedItemId: mockItemId,
        },
      });
    });

    it('should throw validation error for invalid item ID', async () => {
      mockIsValidCuid.mockReturnValue(false);

      await expect(deleteItem(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'Invalid item ID format',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw not found error for non-existent item', async () => {
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(deleteItem(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'Item not found',
        404,
        'NOT_FOUND'
      );
    });
  });

  describe('toggleItemCompletion', () => {
    beforeEach(() => {
      mockReq.params = { id: mockItemId };
    });

    it('should successfully toggle item completion from false to true', async () => {
      const existingItem = { ...mockItem, list: mockList, isCompleted: false };
      const toggledItem = { ...mockItem, isCompleted: true };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      (mockDb.todoItem.update as jest.Mock).mockResolvedValue(toggledItem);

      await toggleItemCompletion(mockReq as Request, mockRes as Response);

      expect(mockDb.todoItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { isCompleted: true },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: toggledItem,
        meta: {
          action: 'toggle',
          previousState: false,
          newState: true,
        },
      });
    });

    it('should successfully toggle item completion from true to false', async () => {
      const existingItem = { ...mockItem, list: mockList, isCompleted: true };
      const toggledItem = { ...mockItem, isCompleted: false };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      (mockDb.todoItem.update as jest.Mock).mockResolvedValue(toggledItem);

      await toggleItemCompletion(mockReq as Request, mockRes as Response);

      expect(mockDb.todoItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { isCompleted: false },
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: toggledItem,
        meta: {
          action: 'toggle',
          previousState: true,
          newState: false,
        },
      });
    });
  });

  describe('moveItem', () => {
    beforeEach(() => {
      mockReq.params = { id: mockItemId };
    });

    it('should move item to direct position', async () => {
      mockReq.body = { newPosition: 2000 };
      const existingItem = { ...mockItem, list: mockList };
      const movedItem = { ...mockItem, positionInList: 2000 };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      (mockDb.todoItem.update as jest.Mock).mockResolvedValue(movedItem);

      await moveItem(mockReq as Request, mockRes as Response);

      expect(mockDb.todoItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { positionInList: 2000 },
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: movedItem,
        meta: {
          action: 'move',
          previousPosition: 1000,
          newPosition: 2000,
        },
      });
    });

    it('should move item relative to another position', async () => {
      mockReq.body = { insertAfterPosition: 1500 };
      const existingItem = { ...mockItem, list: mockList };
      const movedItem = { ...mockItem, positionInList: 1750 };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      mockCalculateItemPosition.mockResolvedValue(1750);
      (mockDb.todoItem.update as jest.Mock).mockResolvedValue(movedItem);

      await moveItem(mockReq as Request, mockRes as Response);

      expect(mockCalculateItemPosition).toHaveBeenCalledWith(mockListId, 1500);
      expect(mockDb.todoItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { positionInList: 1750 },
      });
    });

    it('should move item to end of list when no position specified', async () => {
      mockReq.body = {};
      const existingItem = { ...mockItem, list: mockList };
      const movedItem = { ...mockItem, positionInList: 3000 };
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      mockGetNextItemPosition.mockResolvedValue(3000);
      (mockDb.todoItem.update as jest.Mock).mockResolvedValue(movedItem);

      await moveItem(mockReq as Request, mockRes as Response);

      expect(mockGetNextItemPosition).toHaveBeenCalledWith(mockListId);
      expect(mockDb.todoItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { positionInList: 3000 },
      });
    });
  });

  describe('moveItemBetweenSections', () => {
    beforeEach(() => {
      mockReq.params = { id: mockItemId };
    });

    it('should move item from todo to done section', async () => {
      mockReq.body = { targetSection: 'done' };
      const existingItem = { ...mockItem, list: mockList, isCompleted: false };
      const itemsInTargetSection = [
        { id: 'item1', positionInList: 2000 },
        { id: 'item2', positionInList: 1000 },
      ];
      const movedItem = { ...mockItem, isCompleted: true, positionInList: 3000 };
      
      (mockDb.todoItem.findFirst as jest.Mock).mockResolvedValue(existingItem);
      (mockDb.todoItem.findMany as jest.Mock).mockResolvedValue(itemsInTargetSection);
      (mockDb.todoItem.update as jest.Mock).mockResolvedValue(movedItem);

      await moveItemBetweenSections(mockReq as Request, mockRes as Response);

      expect(mockDb.todoItem.findMany).toHaveBeenCalledWith({
        where: { listId: mockListId, isCompleted: true },
        select: { id: true, positionInList: true },
        orderBy: { positionInList: 'desc' },
      });
      expect(mockDb.todoItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { isCompleted: true, positionInList: 3000 },
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: movedItem,
        meta: {
          action: 'move-section',
          targetSection: 'done',
          previousSection: 'todo',
          previousPosition: 1000,
          newPosition: 3000,
        },
      });
    });

    it('should throw validation error for invalid target section', async () => {
      mockReq.body = { targetSection: 'invalid' };

      await expect(moveItemBetweenSections(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'targetSection must be either "todo" or "done"',
        400,
        'VALIDATION_ERROR'
      );
    });
  });

  describe('batchUpdateItems', () => {
    it('should successfully batch update multiple items', async () => {
      const updates = [
        { id: 'citemtest123456789012345', title: 'Updated Item 1', isCompleted: true },
        { id: 'citemtest123456789012346', positionInList: 2000 },
      ];
      mockReq.body = { updates };

      const mockUpdatedItems = [
        { ...mockItem, id: 'citemtest123456789012345', title: 'Updated Item 1', isCompleted: true },
        { ...mockItem, id: 'citemtest123456789012346', positionInList: 2000 },
      ];

      // Mock transaction
      (mockDb.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          todoItem: {
            findFirst: jest.fn()
              .mockResolvedValueOnce({ ...mockItem, id: 'citemtest123456789012345', list: mockList })
              .mockResolvedValueOnce({ ...mockItem, id: 'citemtest123456789012346', list: mockList }),
            update: jest.fn()
              .mockResolvedValueOnce(mockUpdatedItems[0])
              .mockResolvedValueOnce(mockUpdatedItems[1]),
          },
        };
        return await callback(tx as any);
      });

      await batchUpdateItems(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedItems,
        meta: {
          action: 'batch-update',
          totalUpdated: 2,
        },
      });
    });

    it('should throw validation error for empty updates array', async () => {
      mockReq.body = { updates: [] };

      await expect(batchUpdateItems(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'updates must be a non-empty array',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw validation error for too many updates', async () => {
      const tooManyUpdates = Array(101).fill({ id: 'citemtest123456789012345' });
      mockReq.body = { updates: tooManyUpdates };

      await expect(batchUpdateItems(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'Cannot update more than 100 items at once',
        400,
        'VALIDATION_ERROR'
      );
    });

    it('should throw validation error for invalid update object', async () => {
      mockReq.body = { updates: [{ invalidField: 'test' }] };
      mockIsValidCuid.mockReturnValue(false);

      await expect(batchUpdateItems(mockReq as Request, mockRes as Response))
        .rejects.toThrow();

      expect(mockCreateError).toHaveBeenCalledWith(
        'Each update must have a valid item ID',
        400,
        'VALIDATION_ERROR'
      );
    });
  });
});