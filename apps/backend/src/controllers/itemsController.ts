import { Request, Response } from 'express';
import { Prisma } from '@db';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { 
  getNextItemPosition, 
  calculateItemPosition
} from '../utils/gapIndexing';
import { validateItemTitle, validateListId, isValidCuid } from '../utils/validation';

/**
 * Get all todo items for a specific list
 * Items are sorted by completion status (incomplete first), then by positionInList
 */
export async function getItemsByListId(req: Request, res: Response): Promise<void> {
  try {
    const { listId } = req.query;

    // Validate listId parameter
    if (!listId || typeof listId !== 'string') {
      throw createError(
        'List ID is required as query parameter',
        400,
        'VALIDATION_ERROR'
      );
    }

    validateListId(listId);

    logger.info(`Fetching items for list: ${listId}`);

    // Verify list exists and belongs to demo user
    const list = await db.todoList.findFirst({
      where: {
        id: listId,
        userId: 'demo',
      },
    });

    if (!list) {
      throw createError(
        'List not found',
        404,
        'NOT_FOUND'
      );
    }

    // Fetch all items for the list, sorted by completion status and position
    const items = await db.todoItem.findMany({
      where: {
        listId,
      },
      orderBy: [
        { isCompleted: 'asc' }, // Incomplete items first
        { positionInList: 'asc' }, // Then by position
      ],
    });

    logger.info(`Found ${items.length} items for list ${listId}`);

    // Format response to match expected frontend format
    const formattedItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      isCompleted: item.isCompleted,
      positionInList: item.positionInList,
      listId: item.listId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: formattedItems,
      meta: {
        total: items.length,
        listId,
      },
    });

  } catch (error) {
    logger.error('Error fetching items:', error);
    
    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific Prisma connection errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw createError(
        'Unable to connect to database',
        503,
        'DATABASE_CONNECTION_ERROR'
      );
    }
    
    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}

/**
 * Create a new todo item in a specific list
 * Uses gap indexing to calculate positionInList
 */
export async function createItem(req: Request, res: Response): Promise<void> {
  try {
    const { title, listId } = req.body;

    // Validate input
    if (!listId || typeof listId !== 'string') {
      throw createError(
        'List ID is required',
        400,
        'VALIDATION_ERROR'
      );
    }

    validateListId(listId);
    const sanitizedTitle = validateItemTitle(title);

    logger.info(`Creating new item in list: ${listId}`);

    // Verify list exists and belongs to demo user
    const list = await db.todoList.findFirst({
      where: {
        id: listId,
        userId: 'demo',
      },
    });

    if (!list) {
      throw createError(
        'List not found',
        404,
        'NOT_FOUND'
      );
    }

    // Calculate next position using gap indexing
    const positionInList = await getNextItemPosition(listId);

    // Create the new item
    const newItem = await db.todoItem.create({
      data: {
        title: sanitizedTitle,
        listId,
        positionInList,
        isCompleted: false,
      },
    });

    logger.info(`Created new item with ID: ${newItem.id}, position: ${positionInList}`);

    // Format response to match expected frontend format
    const formattedItem = {
      id: newItem.id,
      title: newItem.title,
      isCompleted: newItem.isCompleted,
      positionInList: newItem.positionInList,
      listId: newItem.listId,
      createdAt: newItem.createdAt,
      updatedAt: newItem.updatedAt,
    };

    res.status(201).json({
      success: true,
      data: formattedItem,
    });

  } catch (error) {
    logger.error('Error creating item:', error);

    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Unique constraint violation (listId, positionInList combination)
      if (error.code === 'P2002') {
        throw createError(
          'Failed to create item due to positioning conflict. Please try again.',
          409,
          'CONFLICT_ERROR'
        );
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}

/**
 * Update a todo item's title, completion status, or position
 */
export async function updateItem(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, isCompleted, positionInList } = req.body;

    // Validate item ID
    if (!id || typeof id !== 'string' || !isValidCuid(id)) {
      throw createError(
        'Invalid item ID format',
        400,
        'VALIDATION_ERROR'
      );
    }

    logger.info(`Updating item ${id}`);

    // Check if item exists
    const existingItem = await db.todoItem.findFirst({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!existingItem || !existingItem.list) {
      throw createError(
        'Item not found',
        404,
        'NOT_FOUND'
      );
    }

    // Prepare update data
    const updateData: Prisma.TodoItemUpdateInput = {};

    // Validate and set title if provided
    if (title !== undefined) {
      updateData.title = validateItemTitle(title);
    }

    // Set completion status if provided
    if (isCompleted !== undefined) {
      if (typeof isCompleted !== 'boolean') {
        throw createError(
          'isCompleted must be a boolean value',
          400,
          'VALIDATION_ERROR'
        );
      }
      updateData.isCompleted = isCompleted;
    }

    // Set position if provided
    if (positionInList !== undefined) {
      if (typeof positionInList !== 'number' || positionInList < 0) {
        throw createError(
          'positionInList must be a non-negative number',
          400,
          'VALIDATION_ERROR'
        );
      }
      updateData.positionInList = positionInList;
    }

    // Update the item
    const updatedItem = await db.todoItem.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Successfully updated item ${id}`);

    // Format response to match expected frontend format
    const formattedItem = {
      id: updatedItem.id,
      title: updatedItem.title,
      isCompleted: updatedItem.isCompleted,
      positionInList: updatedItem.positionInList,
      listId: updatedItem.listId,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedItem,
    });

  } catch (error: unknown) {
    logger.error('Error updating item:', error);

    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record not found
      if (error.code === 'P2025') {
        throw createError(
          'Item not found',
          404,
          'NOT_FOUND'
        );
      }
      // P2002: Unique constraint violation
      if (error.code === 'P2002') {
        throw createError(
          'Position conflict in list. Please try again.',
          409,
          'CONFLICT_ERROR'
        );
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}

/**
 * Delete a todo item permanently
 * Immediate deletion without confirmation
 */
export async function deleteItem(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate item ID
    if (!id || typeof id !== 'string' || !isValidCuid(id)) {
      throw createError(
        'Invalid item ID format',
        400,
        'VALIDATION_ERROR'
      );
    }

    logger.info(`Deleting item ${id}`);

    // Check if item exists and belongs to demo user's list
    const existingItem = await db.todoItem.findFirst({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!existingItem || !existingItem.list || existingItem.list.userId !== 'demo') {
      throw createError(
        'Item not found',
        404,
        'NOT_FOUND'
      );
    }

    // Delete the item permanently
    await db.todoItem.delete({
      where: { id },
    });

    logger.info(`Successfully deleted item ${id}`);

    res.status(200).json({
      success: true,
      message: 'Item deleted permanently',
      data: {
        deletedItemId: id,
      },
    });

  } catch (error: unknown) {
    logger.error('Error deleting item:', error);

    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record not found
      if (error.code === 'P2025') {
        throw createError(
          'Item not found',
          404,
          'NOT_FOUND'
        );
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}

/**
 * Toggle completion status of a todo item instantly
 */
export async function toggleItemCompletion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate item ID
    if (!id || typeof id !== 'string' || !isValidCuid(id)) {
      throw createError(
        'Invalid item ID format',
        400,
        'VALIDATION_ERROR'
      );
    }

    logger.info(`Toggling completion status for item ${id}`);

    // Check if item exists and belongs to demo user's list
    const existingItem = await db.todoItem.findFirst({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!existingItem || !existingItem.list || existingItem.list.userId !== 'demo') {
      throw createError(
        'Item not found',
        404,
        'NOT_FOUND'
      );
    }

    // Toggle the completion status
    const updatedItem = await db.todoItem.update({
      where: { id },
      data: {
        isCompleted: !existingItem.isCompleted,
      },
    });

    logger.info(`Successfully toggled item ${id} to ${updatedItem.isCompleted ? 'completed' : 'incomplete'}`);

    // Format response to match expected frontend format
    const formattedItem = {
      id: updatedItem.id,
      title: updatedItem.title,
      isCompleted: updatedItem.isCompleted,
      positionInList: updatedItem.positionInList,
      listId: updatedItem.listId,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedItem,
      meta: {
        action: 'toggle',
        previousState: !updatedItem.isCompleted,
        newState: updatedItem.isCompleted,
      },
    });

  } catch (error: unknown) {
    logger.error('Error toggling item completion:', error);

    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record not found
      if (error.code === 'P2025') {
        throw createError(
          'Item not found',
          404,
          'NOT_FOUND'
        );
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}

/**
 * Move item to a new position within the same list (drag-and-drop reordering)
 */
export async function moveItem(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { newPosition, insertAfterPosition } = req.body;

    // Validate item ID
    if (!id || typeof id !== 'string' || !isValidCuid(id)) {
      throw createError(
        'Invalid item ID format',
        400,
        'VALIDATION_ERROR'
      );
    }

    logger.info(`Moving item ${id} to new position`);

    // Check if item exists and belongs to demo user's list
    const existingItem = await db.todoItem.findFirst({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!existingItem || !existingItem.list || existingItem.list.userId !== 'demo') {
      throw createError(
        'Item not found',
        404,
        'NOT_FOUND'
      );
    }

    let calculatedPosition: number;

    // Calculate new position based on provided parameters
    if (newPosition !== undefined) {
      // Direct position provided
      if (typeof newPosition !== 'number' || newPosition < 0) {
        throw createError(
          'newPosition must be a non-negative number',
          400,
          'VALIDATION_ERROR'
        );
      }
      calculatedPosition = newPosition;
    } else if (insertAfterPosition !== undefined) {
      // Calculate position relative to another item
      calculatedPosition = await calculateItemPosition(existingItem.listId, insertAfterPosition);
    } else {
      // Move to end of list
      calculatedPosition = await getNextItemPosition(existingItem.listId);
    }

    // Update the item position
    const updatedItem = await db.todoItem.update({
      where: { id },
      data: {
        positionInList: calculatedPosition,
      },
    });

    logger.info(`Successfully moved item ${id} to position ${calculatedPosition}`);

    // Format response to match expected frontend format
    const formattedItem = {
      id: updatedItem.id,
      title: updatedItem.title,
      isCompleted: updatedItem.isCompleted,
      positionInList: updatedItem.positionInList,
      listId: updatedItem.listId,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedItem,
      meta: {
        action: 'move',
        previousPosition: existingItem.positionInList,
        newPosition: calculatedPosition,
      },
    });

  } catch (error: unknown) {
    logger.error('Error moving item:', error);

    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record not found
      if (error.code === 'P2025') {
        throw createError(
          'Item not found',
          404,
          'NOT_FOUND'
        );
      }
      // P2002: Unique constraint violation
      if (error.code === 'P2002') {
        throw createError(
          'Position conflict in list. Please try again.',
          409,
          'CONFLICT_ERROR'
        );
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}

/**
 * Move item between "Todo" and "Done" sections (auto-toggle isCompleted)
 * Recalculates position within the target section
 */
export async function moveItemBetweenSections(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { targetSection, insertAfterPosition } = req.body;

    // Validate item ID
    if (!id || typeof id !== 'string' || !isValidCuid(id)) {
      throw createError(
        'Invalid item ID format',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Validate target section
    if (!targetSection || !['todo', 'done'].includes(targetSection)) {
      throw createError(
        'targetSection must be either "todo" or "done"',
        400,
        'VALIDATION_ERROR'
      );
    }

    logger.info(`Moving item ${id} to ${targetSection} section`);

    // Check if item exists and belongs to demo user's list
    const existingItem = await db.todoItem.findFirst({
      where: { id },
      include: {
        list: true,
      },
    });

    if (!existingItem || !existingItem.list || existingItem.list.userId !== 'demo') {
      throw createError(
        'Item not found',
        404,
        'NOT_FOUND'
      );
    }

    const targetCompleted = targetSection === 'done';

    // Get items in the target section to calculate position
    const itemsInTargetSection = await db.todoItem.findMany({
      where: {
        listId: existingItem.listId,
        isCompleted: targetCompleted,
      },
      select: { id: true, positionInList: true },
      orderBy: { positionInList: 'desc' },
    });

    let newPosition: number;

    if (insertAfterPosition !== undefined) {
      // Find position relative to an item in the target section
      const afterItem = itemsInTargetSection.find(item => item.positionInList === insertAfterPosition);
      if (!afterItem) {
        // insertAfterPosition not found in target section, add to end
        newPosition = itemsInTargetSection.length > 0 
          ? itemsInTargetSection[0].positionInList + 1000 
          : 1000;
      } else {
        // Calculate position relative to found item
        const afterIndex = itemsInTargetSection.findIndex(item => item.id === afterItem.id);
        if (afterIndex === 0) {
          // Insert at the end of the section
          newPosition = afterItem.positionInList + 1000;
        } else {
          // Insert between two items
          const nextItem = itemsInTargetSection[afterIndex - 1];
          newPosition = Math.floor((afterItem.positionInList + nextItem.positionInList) / 2);
        }
      }
    } else {
      // Add to the end of the target section
      newPosition = itemsInTargetSection.length > 0 
        ? itemsInTargetSection[0].positionInList + 1000 
        : 1000;
    }

    // Update the item with new completion status and position
    const updatedItem = await db.todoItem.update({
      where: { id },
      data: {
        isCompleted: targetCompleted,
        positionInList: newPosition,
      },
    });

    logger.info(`Successfully moved item ${id} to ${targetSection} section at position ${newPosition}`);

    // Format response to match expected frontend format
    const formattedItem = {
      id: updatedItem.id,
      title: updatedItem.title,
      isCompleted: updatedItem.isCompleted,
      positionInList: updatedItem.positionInList,
      listId: updatedItem.listId,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedItem,
      meta: {
        action: 'move-section',
        targetSection,
        previousSection: existingItem.isCompleted ? 'done' : 'todo',
        previousPosition: existingItem.positionInList,
        newPosition,
      },
    });

  } catch (error: unknown) {
    logger.error('Error moving item between sections:', error);

    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record not found
      if (error.code === 'P2025') {
        throw createError(
          'Item not found',
          404,
          'NOT_FOUND'
        );
      }
      // P2002: Unique constraint violation
      if (error.code === 'P2002') {
        throw createError(
          'Position conflict in target section. Please try again.',
          409,
          'CONFLICT_ERROR'
        );
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}

/**
 * Batch update multiple items (positions, completion status, etc.)
 */
export async function batchUpdateItems(req: Request, res: Response): Promise<void> {
  try {
    const { updates } = req.body;

    // Validate input
    if (!Array.isArray(updates) || updates.length === 0) {
      throw createError(
        'updates must be a non-empty array',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (updates.length > 100) {
      throw createError(
        'Cannot update more than 100 items at once',
        400,
        'VALIDATION_ERROR'
      );
    }

    logger.info(`Batch updating ${updates.length} items`);

    // Validate each update object
    for (const update of updates) {
      if (!update.id || typeof update.id !== 'string' || !isValidCuid(update.id)) {
        throw createError(
          'Each update must have a valid item ID',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate optional fields
      if (update.title !== undefined) {
        validateItemTitle(update.title);
      }

      if (update.isCompleted !== undefined && typeof update.isCompleted !== 'boolean') {
        throw createError(
          'isCompleted must be a boolean value',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (update.positionInList !== undefined && 
          (typeof update.positionInList !== 'number' || update.positionInList < 0)) {
        throw createError(
          'positionInList must be a non-negative number',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    // Perform batch update in transaction
    const updatedItems = await db.$transaction(async (tx) => {
      const results = [];

      for (const update of updates) {
        // Check if item exists and belongs to demo user's list
        const existingItem = await tx.todoItem.findFirst({
          where: { id: update.id },
          include: {
            list: true,
          },
        });

        if (!existingItem || !existingItem.list || existingItem.list.userId !== 'demo') {
          throw createError(
            `Item ${update.id} not found`,
            404,
            'NOT_FOUND'
          );
        }

        // Prepare update data
        const updateData: Prisma.TodoItemUpdateInput = {};
        
        if (update.title !== undefined) {
          updateData.title = validateItemTitle(update.title);
        }
        
        if (update.isCompleted !== undefined) {
          updateData.isCompleted = update.isCompleted;
        }
        
        if (update.positionInList !== undefined) {
          updateData.positionInList = update.positionInList;
        }

        // Update the item
        const updatedItem = await tx.todoItem.update({
          where: { id: update.id },
          data: updateData,
        });

        results.push({
          id: updatedItem.id,
          title: updatedItem.title,
          isCompleted: updatedItem.isCompleted,
          positionInList: updatedItem.positionInList,
          listId: updatedItem.listId,
          createdAt: updatedItem.createdAt,
          updatedAt: updatedItem.updatedAt,
        });
      }

      return results;
    });

    logger.info(`Successfully batch updated ${updatedItems.length} items`);

    res.status(200).json({
      success: true,
      data: updatedItems,
      meta: {
        action: 'batch-update',
        totalUpdated: updatedItems.length,
      },
    });

  } catch (error: unknown) {
    logger.error('Error in batch update:', error);

    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record not found
      if (error.code === 'P2025') {
        throw createError(
          'One or more items not found',
          404,
          'NOT_FOUND'
        );
      }
      // P2002: Unique constraint violation
      if (error.code === 'P2002') {
        throw createError(
          'Position conflict during batch update. Please try again.',
          409,
          'CONFLICT_ERROR'
        );
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}