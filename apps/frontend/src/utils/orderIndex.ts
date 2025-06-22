/**
 * Utility functions for handling orderIndex calculations
 * Used for maintaining sorted order of lists and items with gap indexing
 */

import { TodoList } from '../types/api';

// Gap indexing constants
/** Standard gap size between consecutive items - provides room for insertions */
export const STANDARD_GAP_SIZE = 1000;

/** Default orderIndex for first item when no items exist */
export const DEFAULT_ORDER_INDEX = 1000;

/** Gap size for inserting before the first item */
export const BEFORE_FIRST_GAP = 500;

/** Fallback gap size when calculating insertion between items */
export const FALLBACK_GAP_SIZE = 2000;

/** Minimum gap size before compaction is needed */
export const MIN_GAP_SIZE = 10;

/** Special value returned when compaction is needed instead of throwing an error */
export const COMPACTION_NEEDED = null;

/**
 * Calculate the next available orderIndex for a new list
 * Uses reduce to safely find the maximum orderIndex without spreading large arrays
 * @param lists - Array of existing todo lists
 * @returns The next available orderIndex (max + STANDARD_GAP_SIZE, or DEFAULT_ORDER_INDEX if no lists exist)
 */
export const calculateNextOrderIndex = (lists: TodoList[]): number => {
  if (!lists || lists.length === 0) {
    return DEFAULT_ORDER_INDEX;
  }

  // Use reduce to find maximum orderIndex efficiently
  const maxOrderIndex = lists.reduce((max, list) => {
    return Math.max(max, list.orderIndex || 0);
  }, 0);

  return maxOrderIndex + STANDARD_GAP_SIZE;
};

/**
 * Validates that a lists array is sorted by orderIndex in descending order
 * @param lists - Array of todo lists to validate
 * @returns true if the array is properly sorted, false otherwise
 */
const validateListsSorted = (lists: TodoList[]): boolean => {
  for (let i = 0; i < lists.length - 1; i++) {
    const currentOrder = lists[i]?.orderIndex || 0;
    const nextOrder = lists[i + 1]?.orderIndex || 0;
    
    // Lists should be sorted in descending order (highest orderIndex first)
    if (currentOrder < nextOrder) {
      return false;
    }
  }
  return true;
};

/**
 * Calculate orderIndex for inserting a list at a specific position
 * @param lists - Array of existing todo lists (must be sorted by orderIndex in descending order)
 * @param insertIndex - Index where the new list should be inserted
 * @returns The calculated orderIndex for the new position, or COMPACTION_NEEDED if compaction is required
 * @throws Error if the input lists array is not properly sorted
 */
export const calculateInsertOrderIndex = (lists: TodoList[], insertIndex: number): number | null => {
  if (!lists || lists.length === 0) {
    return DEFAULT_ORDER_INDEX;
  }

  // Validate that the lists array is properly sorted
  if (!validateListsSorted(lists)) {
    throw new Error('Lists array must be sorted by orderIndex in descending order');
  }

  // Insert at the beginning (highest orderIndex position)
  if (insertIndex <= 0) {
    const firstOrderIndex = lists[0]?.orderIndex || DEFAULT_ORDER_INDEX;
    return firstOrderIndex + BEFORE_FIRST_GAP;
  }

  // Insert at the end (lowest orderIndex position)
  if (insertIndex >= lists.length) {
    return calculateNextOrderIndex(lists);
  }

  // Insert between two existing lists
  const prevOrderIndex = lists[insertIndex - 1]?.orderIndex || 0;
  const nextOrderIndex = lists[insertIndex]?.orderIndex || (prevOrderIndex - FALLBACK_GAP_SIZE);
  
  const calculatedIndex = Math.floor((prevOrderIndex + nextOrderIndex) / 2);
  
  // If gap is too small, return special value to signal compaction is needed
  if (Math.abs(prevOrderIndex - nextOrderIndex) < MIN_GAP_SIZE) {
    return COMPACTION_NEEDED;
  }
  
  return calculatedIndex;
};