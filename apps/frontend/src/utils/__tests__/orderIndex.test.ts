/**
 * Unit tests for orderIndex utility functions
 * Tests gap indexing calculations and validation for maintaining sorted order
 */

import { 
  calculateNextOrderIndex, 
  calculateInsertOrderIndex,
  STANDARD_GAP_SIZE,
  DEFAULT_ORDER_INDEX,
  BEFORE_FIRST_GAP,
  COMPACTION_NEEDED
} from '../orderIndex';
import { TodoList } from '../../types/api';

describe('orderIndex utilities', () => {
  const createMockList = (id: string, orderIndex: number): TodoList => ({
    id,
    name: `List ${id}`,
    orderIndex,
    userId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: []
  });

  describe('calculateNextOrderIndex', () => {
    test('should return DEFAULT_ORDER_INDEX for empty array', () => {
      expect(calculateNextOrderIndex([])).toBe(DEFAULT_ORDER_INDEX);
    });

    test('should return DEFAULT_ORDER_INDEX for null/undefined input', () => {
      expect(calculateNextOrderIndex(null as any)).toBe(DEFAULT_ORDER_INDEX);
      expect(calculateNextOrderIndex(undefined as any)).toBe(DEFAULT_ORDER_INDEX);
    });

    test('should calculate next orderIndex with standard gap', () => {
      const lists = [
        createMockList('1', 2000),
        createMockList('2', 1000),
      ];
      
      expect(calculateNextOrderIndex(lists)).toBe(2000 + STANDARD_GAP_SIZE);
    });

    test('should handle lists with mixed orderIndex values', () => {
      const lists = [
        createMockList('1', 1500),
        createMockList('2', 3000), // highest
        createMockList('3', 500),
      ];
      
      expect(calculateNextOrderIndex(lists)).toBe(3000 + STANDARD_GAP_SIZE);
    });

    test('should handle lists with undefined orderIndex', () => {
      const lists = [
        { ...createMockList('1', 2000), orderIndex: undefined as any },
        createMockList('2', 1000),
      ];
      
      expect(calculateNextOrderIndex(lists)).toBe(1000 + STANDARD_GAP_SIZE);
    });
  });

  describe('calculateInsertOrderIndex', () => {
    test('should return DEFAULT_ORDER_INDEX for empty array', () => {
      expect(calculateInsertOrderIndex([], 0)).toBe(DEFAULT_ORDER_INDEX);
    });

    test('should throw error for unsorted lists', () => {
      const unsortedLists = [
        createMockList('1', 1000), // should be higher than next
        createMockList('2', 2000),
      ];
      
      expect(() => calculateInsertOrderIndex(unsortedLists, 1)).toThrow(
        'Lists array must be sorted by orderIndex in descending order'
      );
    });

    test('should calculate orderIndex for insertion at beginning', () => {
      const lists = [
        createMockList('1', 2000),
        createMockList('2', 1000),
      ];
      
      const result = calculateInsertOrderIndex(lists, 0);
      expect(result).toBe(2000 + BEFORE_FIRST_GAP);
    });

    test('should calculate orderIndex for insertion at end', () => {
      const lists = [
        createMockList('1', 2000),
        createMockList('2', 1000),
      ];
      
      const result = calculateInsertOrderIndex(lists, 2);
      expect(result).toBe(2000 + STANDARD_GAP_SIZE);
    });

    test('should calculate orderIndex for insertion between items', () => {
      const lists = [
        createMockList('1', 3000),
        createMockList('2', 1000),
      ];
      
      const result = calculateInsertOrderIndex(lists, 1);
      expect(result).toBe(Math.floor((3000 + 1000) / 2)); // 2000
    });

    test('should return COMPACTION_NEEDED when gap is too small', () => {
      const lists = [
        createMockList('1', 1005),
        createMockList('2', 1000), // gap of 5, less than MIN_GAP_SIZE (10)
      ];
      
      const result = calculateInsertOrderIndex(lists, 1);
      expect(result).toBe(COMPACTION_NEEDED);
    });

    test('should handle negative insert index', () => {
      const lists = [
        createMockList('1', 2000),
        createMockList('2', 1000),
      ];
      
      const result = calculateInsertOrderIndex(lists, -1);
      expect(result).toBe(2000 + BEFORE_FIRST_GAP);
    });

    test('should handle insert index beyond array length', () => {
      const lists = [
        createMockList('1', 2000),
        createMockList('2', 1000),
      ];
      
      const result = calculateInsertOrderIndex(lists, 10);
      expect(result).toBe(2000 + STANDARD_GAP_SIZE);
    });

    test('should validate properly sorted lists', () => {
      const properlySortedLists = [
        createMockList('1', 3000),
        createMockList('2', 2000),
        createMockList('3', 1000),
      ];
      
      expect(() => calculateInsertOrderIndex(properlySortedLists, 1)).not.toThrow();
    });

    test('should handle equal orderIndex values (edge case)', () => {
      const listsWithEqualValues = [
        createMockList('1', 2000),
        createMockList('2', 2000), // equal values should still be valid
        createMockList('3', 1000),
      ];
      
      expect(() => calculateInsertOrderIndex(listsWithEqualValues, 1)).not.toThrow();
    });
  });
});