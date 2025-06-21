import { Request, Response } from 'express';
import { Prisma } from '@db';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

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
        orderIndex: 'asc', // Lists ordered by their orderIndex
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