import { Request, Response } from 'express';
import { Prisma } from '@db';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { getNextListOrderIndex } from '../utils/gapIndexing';
import { validateListName, validateListId } from '../utils/validation';

/**
 * Get all todo lists for the demo user with nested items
 * Items are sorted by completion status (incomplete first), then by position
 */
export async function getAllLists(req: Request, res: Response): Promise<void> {
  try {
    // Use demo user for MVP (authentication not implemented)
    const userId = 'demo';
    
    logger.info(`Fetching all lists for user: ${userId}`);

    // Fetch all lists with their items, ordered by list orderIndex
    const lists = await db.todoList.findMany({
      where: {
        userId,
      },
      include: {
        items: {
          orderBy: [
            { isCompleted: 'asc' }, // Incomplete items first
            { positionInList: 'asc' }, // Then by position
          ],
        },
      },
      orderBy: {
        orderIndex: 'desc', // Lists ordered by their orderIndex (highest first)
      },
    });

    logger.info(`Found ${lists.length} lists with ${lists.reduce((total: number, list) => total + list.items.length, 0)} total items`);

    // Transform the data to match expected frontend format
    const formattedLists = lists.map((list) => ({
      id: list.id,
      name: list.name,
      userId: list.userId,
      orderIndex: list.orderIndex,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      items: list.items.map((item) => ({
        id: item.id,
        title: item.title,
        isCompleted: item.isCompleted,
        positionInList: item.positionInList,
        listId: item.listId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    }));

    res.status(200).json({
      success: true,
      data: formattedLists,
      meta: {
        total: lists.length,
        totalItems: formattedLists.reduce((total: number, list) => total + list.items.length, 0),
      },
    });

  } catch (error) {
    logger.error('Error fetching lists:', error);
    
    // Check for specific Prisma connection errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      // Database connection/initialization errors
      throw createError(
        'Unable to connect to database. Please check your DATABASE_URL configuration.',
        503,
        'DATABASE_CONNECTION_ERROR'
      );
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Check for specific connection-related error codes
      // P1001: Can't reach database server
      // P1008: Operations timed out
      // P1017: Server has closed the connection
      if (error.code === 'P1001' || error.code === 'P1008' || error.code === 'P1017') {
        throw createError(
          'Database connection failed. Please verify database is accessible.',
          503,
          'DATABASE_CONNECTION_ERROR'
        );
      }
    }
    
    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}

/**
 * Create a new todo list with default name "New List"
 * Uses gap indexing to determine the highest orderIndex
 */
export async function createList(req: Request, res: Response): Promise<void> {
  try {
    // Use demo user for MVP (authentication not implemented)
    const userId = 'demo';
    const defaultName = 'New List';

    logger.info(`Creating new list for user: ${userId}`);

    // Get the next available orderIndex using gap indexing
    const orderIndex = await getNextListOrderIndex(userId);

    // Create the new list
    const newList = await db.todoList.create({
      data: {
        name: defaultName,
        userId,
        orderIndex,
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

    logger.info(`Created new list with ID: ${newList.id}, orderIndex: ${orderIndex}`);

    // Format response to match expected frontend format
    const formattedList = {
      id: newList.id,
      name: newList.name,
      userId: newList.userId,
      orderIndex: newList.orderIndex,
      createdAt: newList.createdAt,
      updatedAt: newList.updatedAt,
      items: newList.items.map((item) => ({
        id: item.id,
        title: item.title,
        isCompleted: item.isCompleted,
        positionInList: item.positionInList,
        listId: item.listId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };

    res.status(201).json({
      success: true,
      data: formattedList,
    });

  } catch (error) {
    logger.error('Error creating list:', error);

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Unique constraint violation (userId, orderIndex combination)
      if (error.code === 'P2002') {
        throw createError(
          'Failed to create list due to ordering conflict. Please try again.',
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
 * Update a todo list's name
 * Validates input and returns 400 for empty names
 */
export async function updateList(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validate list ID
    validateListId(id);

    // Validate and sanitize the list name
    const sanitizedName = validateListName(name);

    logger.info(`Updating list ${id} with name: ${sanitizedName}`);

    // Check if list exists and belongs to demo user
    const existingList = await db.todoList.findFirst({
      where: {
        id,
        userId: 'demo',
      },
    });

    if (!existingList) {
      throw createError(
        'List not found',
        404,
        'NOT_FOUND'
      );
    }

    // Update the list
    const updatedList = await db.todoList.update({
      where: { id },
      data: { name: sanitizedName },
      include: {
        items: {
          orderBy: [
            { isCompleted: 'asc' },
            { positionInList: 'asc' },
          ],
        },
      },
    });

    logger.info(`Successfully updated list ${id}`);

    // Format response to match expected frontend format
    const formattedList = {
      id: updatedList.id,
      name: updatedList.name,
      userId: updatedList.userId,
      orderIndex: updatedList.orderIndex,
      createdAt: updatedList.createdAt,
      updatedAt: updatedList.updatedAt,
      items: updatedList.items.map((item) => ({
        id: item.id,
        title: item.title,
        isCompleted: item.isCompleted,
        positionInList: item.positionInList,
        listId: item.listId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };

    res.status(200).json({
      success: true,
      data: formattedList,
    });

  } catch (error: unknown) {
    logger.error('Error updating list:', error);

    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record not found
      if (error.code === 'P2025') {
        throw createError(
          'List not found',
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
 * Delete a todo list and all its items permanently
 * Uses Prisma cascade delete to remove all associated items
 */
export async function deleteList(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate list ID
    validateListId(id);

    logger.info(`Deleting list ${id} and all its items`);

    // Check if list exists and belongs to demo user
    const existingList = await db.todoList.findFirst({
      where: {
        id,
        userId: 'demo',
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!existingList) {
      throw createError(
        'List not found',
        404,
        'NOT_FOUND'
      );
    }

    const itemCount = existingList._count.items;

    // Delete the list (this will cascade to delete all items due to onDelete: Cascade in schema)
    await db.todoList.delete({
      where: { id },
    });

    logger.info(`Successfully deleted list ${id} and ${itemCount} items`);

    res.status(200).json({
      success: true,
      message: `List deleted permanently along with ${itemCount} items`,
      data: {
        deletedListId: id,
        deletedItemsCount: itemCount,
      },
    });

  } catch (error: unknown) {
    logger.error('Error deleting list:', error);

    // Re-throw validation and not found errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle specific database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record not found
      if (error.code === 'P2025') {
        throw createError(
          'List not found',
          404,
          'NOT_FOUND'
        );
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
}