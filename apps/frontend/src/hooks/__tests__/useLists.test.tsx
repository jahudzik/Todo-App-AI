/**
 * Unit tests for useLists hooks
 * Tests both happy paths and error scenarios for list data fetching and mutations
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import {
  useListsQuery,
  useListQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useReorderListsMutation,
  LISTS_QUERY_KEYS,
} from '../useLists';
import { listsApi } from '../../utils/api';
import { TodoList } from '../../types/api';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('../../utils/api');

const mockToast = toast as jest.Mocked<typeof toast>;
const mockListsApi = listsApi as jest.Mocked<typeof listsApi>;

// Test data
const mockLists: TodoList[] = [
  {
    id: 'list1',
    name: 'Work Tasks',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    orderIndex: 1000,
    userId: 'demo',
  },
  {
    id: 'list2',
    name: 'Personal Tasks',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    orderIndex: 2000,
    userId: 'demo',
  },
];

// Create test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  
  Wrapper.displayName = 'TestQueryWrapper';
  
  return Wrapper;
}

describe('useListsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Paths', () => {
    test('should fetch lists successfully', async () => {
      mockListsApi.getAll.mockResolvedValue(mockLists);

      const { result } = renderHook(() => useListsQuery(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLists);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockListsApi.getAll).toHaveBeenCalledWith(undefined);
    });

    test('should pass query parameters to API', async () => {
      mockListsApi.getAll.mockResolvedValue(mockLists);
      const params = { includeItems: true };

      const { result } = renderHook(() => useListsQuery(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockListsApi.getAll).toHaveBeenCalledWith(params);
      expect(result.current.data).toEqual(mockLists);
    });

    test('should sort lists by orderIndex', async () => {
      const unsortedLists = [...mockLists].reverse(); // Reverse order
      mockListsApi.getAll.mockResolvedValue(unsortedLists);

      const { result } = renderHook(() => useListsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should be sorted by orderIndex (1000, 2000)
      expect(result.current.data?.[0].orderIndex).toBe(1000);
      expect(result.current.data?.[1].orderIndex).toBe(2000);
      expect(result.current.data?.[0].name).toBe('Work Tasks');
      expect(result.current.data?.[1].name).toBe('Personal Tasks');
    });

    test('should handle empty lists array', async () => {
      mockListsApi.getAll.mockResolvedValue([]);

      const { result } = renderHook(() => useListsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Cases', () => {
    test('should handle API errors', async () => {
      const error = new Error('Network error');
      mockListsApi.getAll.mockRejectedValue(error);

      const { result } = renderHook(() => useListsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
      expect(result.current.data).toBeUndefined();
    });
  });
});

describe('useListQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Paths', () => {
    test('should fetch single list successfully', async () => {
      const mockList = mockLists[0];
      mockListsApi.getById.mockResolvedValue(mockList);

      const { result } = renderHook(() => useListQuery({ id: 'list1' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockList);
      expect(result.current.isLoading).toBe(false);
      expect(mockListsApi.getById).toHaveBeenCalledWith({ id: 'list1' });
    });

    test('should pass additional parameters', async () => {
      const mockList = mockLists[0];
      mockListsApi.getById.mockResolvedValue(mockList);

      const { result } = renderHook(
        () => useListQuery({ id: 'list1', includeItems: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockListsApi.getById).toHaveBeenCalledWith({ 
        id: 'list1', 
        includeItems: true 
      });
    });

    test('should not run query when ID is empty', () => {
      const { result } = renderHook(() => useListQuery({ id: '' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockListsApi.getById).not.toHaveBeenCalled();
    });
  });
});

describe('useCreateListMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Paths', () => {
    test('should create list successfully', async () => {
      const newListData = { name: 'New List', orderIndex: 3000 };
      const createdList: TodoList = {
        id: 'list3',
        ...newListData,
        createdAt: '2023-01-03T00:00:00Z',
        updatedAt: '2023-01-03T00:00:00Z',
        userId: 'demo',
      };

      mockListsApi.create.mockResolvedValue(createdList);

      const { result } = renderHook(() => useCreateListMutation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isIdle).toBe(true);

      const result_data = await result.current.mutateAsync(newListData);

      expect(result_data).toEqual(createdList);
      expect(mockListsApi.create).toHaveBeenCalledWith(newListData);
      expect(mockToast.success).toHaveBeenCalledWith('List created successfully');
    });

    test('should handle creation with minimal data', async () => {
      const newListData = { name: 'Simple List' };
      const createdList: TodoList = {
        id: 'list4',
        name: 'Simple List',
        orderIndex: 0,
        createdAt: '2023-01-04T00:00:00Z',
        updatedAt: '2023-01-04T00:00:00Z',
        userId: 'demo',
      };

      mockListsApi.create.mockResolvedValue(createdList);

      const { result } = renderHook(() => useCreateListMutation(), {
        wrapper: createWrapper(),
      });

      const result_data = await result.current.mutateAsync(newListData);

      expect(result_data).toEqual(createdList);
      expect(mockListsApi.create).toHaveBeenCalledWith(newListData);
    });
  });

  describe('Error Cases', () => {
    test('should handle creation errors', async () => {
      const error = { code: 'VALIDATION_ERROR', message: 'Name is required' };
      mockListsApi.create.mockRejectedValue(error);

      const { result } = renderHook(() => useCreateListMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({ name: '' })
      ).rejects.toEqual(error);
    });
  });
});

describe('useUpdateListMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Paths', () => {
    test('should update list successfully', async () => {
      const updateData = { name: 'Updated Work Tasks' };
      const updatedList: TodoList = {
        ...mockLists[0],
        ...updateData,
        updatedAt: '2023-01-03T00:00:00Z',
      };

      mockListsApi.update.mockResolvedValue(updatedList);

      const { result } = renderHook(() => useUpdateListMutation(), {
        wrapper: createWrapper(),
      });

      const result_data = await result.current.mutateAsync({
        id: 'list1',
        data: updateData,
      });

      expect(result_data).toEqual(updatedList);
      expect(mockListsApi.update).toHaveBeenCalledWith('list1', updateData);
      expect(mockToast.success).toHaveBeenCalledWith('List updated successfully');
    });

    test('should update list order index', async () => {
      const updateData = { orderIndex: 1500 };
      const updatedList: TodoList = {
        ...mockLists[0],
        ...updateData,
        updatedAt: '2023-01-03T00:00:00Z',
      };

      mockListsApi.update.mockResolvedValue(updatedList);

      const { result } = renderHook(() => useUpdateListMutation(), {
        wrapper: createWrapper(),
      });

      const result_data = await result.current.mutateAsync({
        id: 'list1',
        data: updateData,
      });

      expect(result_data.orderIndex).toBe(1500);
      expect(mockListsApi.update).toHaveBeenCalledWith('list1', updateData);
    });
  });
});

describe('useDeleteListMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Paths', () => {
    test('should delete list successfully', async () => {
      mockListsApi.delete.mockResolvedValue();

      const { result } = renderHook(() => useDeleteListMutation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isIdle).toBe(true);

      await result.current.mutateAsync('list1');

      expect(mockListsApi.delete).toHaveBeenCalledWith('list1');
      expect(mockToast.success).toHaveBeenCalledWith('List deleted successfully');
    });

    test('should handle multiple deletions', async () => {
      mockListsApi.delete.mockResolvedValue();

      const { result } = renderHook(() => useDeleteListMutation(), {
        wrapper: createWrapper(),
      });

      // Delete first list
      await result.current.mutateAsync('list1');

      // Delete second list  
      await result.current.mutateAsync('list2');

      expect(mockListsApi.delete).toHaveBeenCalledTimes(2);
      expect(mockListsApi.delete).toHaveBeenCalledWith('list1');
      expect(mockListsApi.delete).toHaveBeenCalledWith('list2');
    });
  });
});

describe('useReorderListsMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Paths', () => {
    test('should reorder lists successfully', async () => {
      const reorderData = {
        updates: [
          { id: 'list1', newPosition: 2500 },
          { id: 'list2', newPosition: 500 },
        ],
      };

      const reorderedLists = [
        { ...mockLists[1], orderIndex: 500 },
        { ...mockLists[0], orderIndex: 2500 },
      ];

      mockListsApi.reorder.mockResolvedValue(reorderedLists);

      const { result } = renderHook(() => useReorderListsMutation(), {
        wrapper: createWrapper(),
      });

      const result_data = await result.current.mutateAsync(reorderData);

      expect(result_data).toEqual(reorderedLists);
      expect(mockListsApi.reorder).toHaveBeenCalledWith(reorderData);
    });

    test('should handle single list reorder', async () => {
      const reorderData = {
        updates: [{ id: 'list1', newPosition: 1500 }],
      };

      const reorderedLists = [
        { ...mockLists[0], orderIndex: 1500 },
      ];

      mockListsApi.reorder.mockResolvedValue(reorderedLists);

      const { result } = renderHook(() => useReorderListsMutation(), {
        wrapper: createWrapper(),
      });

      const result_data = await result.current.mutateAsync(reorderData);

      expect(result_data).toEqual(reorderedLists);
      expect(mockListsApi.reorder).toHaveBeenCalledWith(reorderData);
    });
  });
});

describe('LISTS_QUERY_KEYS', () => {
  test('should generate correct query keys', () => {
    expect(LISTS_QUERY_KEYS.all).toEqual(['lists']);
    expect(LISTS_QUERY_KEYS.lists()).toEqual(['lists', 'list']);
    expect(LISTS_QUERY_KEYS.list('123')).toEqual(['lists', 'list', '123']);
    expect(LISTS_QUERY_KEYS.infinite()).toEqual(['lists', 'infinite']);
  });

  test('should generate unique keys for different list IDs', () => {
    const key1 = LISTS_QUERY_KEYS.list('list1');
    const key2 = LISTS_QUERY_KEYS.list('list2');
    
    expect(key1).not.toEqual(key2);
    expect(key1[2]).toBe('list1');
    expect(key2[2]).toBe('list2');
  });
});