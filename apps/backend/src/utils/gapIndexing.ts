import { db } from './database';
import { logger } from './logger';

/**
 * Gap indexing utilities for managing orderIndex and positionInList values
 */

// Standard gap size for consistent spacing between items
const STANDARD_GAP = 1000;

// Minimum gap before compaction is triggered
const MIN_GAP = 10;

/**
 * Calculates the next available orderIndex for a new list
 * Uses gap indexing with 1000-unit intervals
 */
export async function getNextListOrderIndex(userId: string): Promise<number> {
  const maxOrderIndex = await db.todoList.aggregate({
    where: { userId },
    _max: { orderIndex: true },
  });

  // If no lists exist, start with 1000
  if (!maxOrderIndex._max.orderIndex) {
    return STANDARD_GAP;
  }

  // Add standard gap to the highest existing orderIndex
  return maxOrderIndex._max.orderIndex + STANDARD_GAP;
}

/**
 * Calculates orderIndex for inserting a list at a specific position
 * Handles gap compaction when necessary
 */
export async function calculateListOrderIndex(
  userId: string,
  insertAfterIndex?: number
): Promise<number> {
  const lists = await db.todoList.findMany({
    where: { userId },
    select: { id: true, orderIndex: true },
    orderBy: { orderIndex: 'desc' },
  });

  // If no lists exist or inserting at the end (highest orderIndex)
  if (lists.length === 0 || !insertAfterIndex) {
    return await getNextListOrderIndex(userId);
  }

  // Find the position to insert after
  const afterIndex = lists.findIndex(list => list.orderIndex === insertAfterIndex);
  
  if (afterIndex === -1) {
    // insertAfterIndex not found, add to the end
    return await getNextListOrderIndex(userId);
  }

  // If inserting at the beginning (afterIndex equals lists.length - 1, which is the last item in descending order with lowest orderIndex)
  if (afterIndex === lists.length - 1) {
    return lists[afterIndex].orderIndex - 500;
  }

  // Calculate midpoint between two adjacent items
  const prevOrderIndex = lists[afterIndex].orderIndex;
  const nextOrderIndex = lists[afterIndex + 1].orderIndex;
  const midpoint = Math.floor((prevOrderIndex + nextOrderIndex) / 2);

  // Check if gap is too small and compaction is needed
  if (nextOrderIndex - prevOrderIndex < MIN_GAP) {
    logger.info(`Gap too small (${nextOrderIndex - prevOrderIndex}), triggering compaction`);
    await compactListOrderIndexes(userId);
    
    // Recalculate after compaction
    return await calculateListOrderIndex(userId, insertAfterIndex);
  }

  return midpoint;
}

/**
 * Compacts all orderIndex values for a user's lists with standard gaps
 * Used when gaps become too small
 */
export async function compactListOrderIndexes(userId: string): Promise<void> {
  const lists = await db.todoList.findMany({
    where: { userId },
    select: { id: true },
    orderBy: { orderIndex: 'desc' },
  });

  // Update each list with new orderIndex values using standard gaps in a transaction
  await db.$transaction(async (tx) => {
    for (let i = 0; i < lists.length; i++) {
      const newOrderIndex = (lists.length - i) * STANDARD_GAP;
      await tx.todoList.update({
        where: { id: lists[i].id },
        data: { orderIndex: newOrderIndex },
      });
    }
  });

  logger.info(`Compacted ${lists.length} lists for user ${userId}`);
}

/**
 * Calculates the next available positionInList for a new item in a list
 */
export async function getNextItemPosition(listId: string): Promise<number> {
  const maxPosition = await db.todoItem.aggregate({
    where: { listId },
    _max: { positionInList: true },
  });

  // If no items exist, start with 1000
  if (!maxPosition._max.positionInList) {
    return STANDARD_GAP;
  }

  // Add standard gap to the highest existing position
  return maxPosition._max.positionInList + STANDARD_GAP;
}

/**
 * Calculates positionInList for inserting an item at a specific position
 * Handles gap compaction when necessary
 */
export async function calculateItemPosition(
  listId: string,
  insertAfterPosition?: number
): Promise<number> {
  const items = await db.todoItem.findMany({
    where: { listId },
    select: { id: true, positionInList: true },
    orderBy: { positionInList: 'desc' },
  });

  // If no items exist or inserting at the end
  if (items.length === 0 || !insertAfterPosition) {
    return await getNextItemPosition(listId);
  }

  // Find the position to insert after
  const afterIndex = items.findIndex(item => item.positionInList === insertAfterPosition);
  
  if (afterIndex === -1) {
    // insertAfterPosition not found, add to the end
    return await getNextItemPosition(listId);
  }

  // If inserting at the beginning
  if (afterIndex === items.length - 1) {
    return items[afterIndex].positionInList - 500;
  }

  // Calculate midpoint between two adjacent items
  const prevPosition = items[afterIndex].positionInList;
  const nextPosition = items[afterIndex + 1].positionInList;
  const midpoint = Math.floor((prevPosition + nextPosition) / 2);

  // Check if gap is too small and compaction is needed
  if (nextPosition - prevPosition < MIN_GAP) {
    logger.info(`Gap too small (${nextPosition - prevPosition}), triggering item compaction`);
    await compactItemPositions(listId);
    
    // Recalculate after compaction
    return await calculateItemPosition(listId, insertAfterPosition);
  }

  return midpoint;
}

/**
 * Compacts all positionInList values for items in a list with standard gaps
 */
export async function compactItemPositions(listId: string): Promise<void> {
  const items = await db.todoItem.findMany({
    where: { listId },
    select: { id: true },
    orderBy: { positionInList: 'desc' },
  });

  // Update each item with new positionInList values using standard gaps in a transaction
  await db.$transaction(async (tx) => {
    for (let i = 0; i < items.length; i++) {
      const newPosition = (items.length - i) * STANDARD_GAP;
      await tx.todoItem.update({
        where: { id: items[i].id },
        data: { positionInList: newPosition },
      });
    }
  });

  logger.info(`Compacted ${items.length} items for list ${listId}`);
}