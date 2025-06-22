/**
 * Utility functions for handling orderIndex calculations
 * Used for maintaining sorted order of lists and items with gap indexing
 */

import { TodoList } from '../types/api';

/**
 * Calculate the next available orderIndex for a new list
 * Uses reduce to safely find the maximum orderIndex without spreading large arrays
 * @param lists - Array of existing todo lists
 * @returns The next available orderIndex (max + 1000, or 1000 if no lists exist)
 */
export const calculateNextOrderIndex = (lists: TodoList[]): number => {
  if (!lists || lists.length === 0) {
    return 1000;
  }

  // Use reduce to find maximum orderIndex efficiently
  const maxOrderIndex = lists.reduce((max, list) => {
    return Math.max(max, list.orderIndex || 0);
  }, 0);

  return maxOrderIndex + 1000;
};

/**
 * Calculate orderIndex for inserting a list at a specific position
 * @param lists - Array of existing todo lists (sorted)
 * @param insertIndex - Index where the new list should be inserted
 * @returns The calculated orderIndex for the new position
 */
export const calculateInsertOrderIndex = (lists: TodoList[], insertIndex: number): number => {
  if (!lists || lists.length === 0) {
    return 1000;
  }

  // Insert at the beginning
  if (insertIndex <= 0) {
    const firstOrderIndex = lists[0]?.orderIndex || 1000;
    return firstOrderIndex - 500;
  }

  // Insert at the end
  if (insertIndex >= lists.length) {
    return calculateNextOrderIndex(lists);
  }

  // Insert between two existing lists
  const prevOrderIndex = lists[insertIndex - 1]?.orderIndex || 0;
  const nextOrderIndex = lists[insertIndex]?.orderIndex || (prevOrderIndex + 2000);
  
  const calculatedIndex = Math.floor((prevOrderIndex + nextOrderIndex) / 2);
  
  // If gap is too small (< 10), return a signal that compaction is needed
  if (nextOrderIndex - prevOrderIndex < 10) {
    throw new Error('Gap too small, compaction needed');
  }
  
  return calculatedIndex;
};