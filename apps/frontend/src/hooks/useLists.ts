/**
 * Custom hooks for managing todo lists data fetching and mutations
 * These hooks provide optimistic updates, error handling, and cache management
 * for all list-related operations using TanStack Query.
 */

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  TodoList, 
  CreateListRequest, 
  UpdateListRequest,
  GetListsParams,
  GetListParams,
  ReorderRequest,
} from '../types/api';
import { listsApi, showApiError } from '../utils/api';

// Query keys for consistent cache management
export const LISTS_QUERY_KEYS = {
  all: ['lists'] as const,
  lists: () => [...LISTS_QUERY_KEYS.all, 'list'] as const,
  list: (id: string) => [...LISTS_QUERY_KEYS.lists(), id] as const,
  infinite: () => [...LISTS_QUERY_KEYS.all, 'infinite'] as const,
} as const;

/**
 * Hook to fetch all todo lists for the current user
 * Provides automatic refetching, caching, and loading states
 * @param params - Optional query parameters
 * @returns Query result with lists data, loading state, and error handling
 */
export const useListsQuery = (
  params?: GetListsParams
): UseQueryResult<TodoList[], Error> => {
  return useQuery({
    queryKey: [...LISTS_QUERY_KEYS.lists(), params],
    queryFn: () => listsApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => {
      // Sort lists by orderIndex for consistent display
      return data.sort((a, b) => a.orderIndex - b.orderIndex);
    },
  });
};

/**
 * Hook to fetch a specific todo list by ID
 * Automatically includes items when specified in params
 * @param params - List ID and optional parameters
 * @returns Query result with single list data
 */
export const useListQuery = (
  params: GetListParams
): UseQueryResult<TodoList, Error> => {
  return useQuery({
    queryKey: LISTS_QUERY_KEYS.list(params.id),
    queryFn: () => listsApi.getById(params),
    enabled: !!params.id, // Only run query if ID is provided
  });
};

/**
 * Hook to create a new todo list
 * Implements optimistic updates for immediate UI feedback
 * @returns Mutation function and state for creating lists
 */
export const useCreateListMutation = (): UseMutationResult<
  TodoList,
  Error,
  CreateListRequest,
  { previousLists?: TodoList[] }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: listsApi.create,
    
    // Optimistic update: immediately add the new list to the UI
    onMutate: async (newListData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEYS.lists() });

      // Snapshot the previous value
      const previousLists = queryClient.getQueryData<TodoList[]>(LISTS_QUERY_KEYS.lists());

      // Optimistically update the cache
      if (previousLists) {
        const optimisticList: TodoList = {
          id: `temp-${Date.now()}`, // Temporary ID for optimistic update
          name: newListData.name,
          orderIndex: newListData.orderIndex || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: 'demo',
          items: [],
        };

        const updatedLists = [...previousLists, optimisticList]
          .sort((a, b) => a.orderIndex - b.orderIndex);

        queryClient.setQueryData(LISTS_QUERY_KEYS.lists(), updatedLists);
      }

      return { previousLists };
    },

    // On success, update the cache with the real data from server
    onSuccess: (newList) => {
      queryClient.setQueryData<TodoList[]>(
        LISTS_QUERY_KEYS.lists(),
        (old) => {
          if (!old) return [newList];
          
          // Replace the optimistic item with the real one
          const withoutOptimistic = old.filter(list => !list.id.startsWith('temp-'));
          return [...withoutOptimistic, newList]
            .sort((a, b) => a.orderIndex - b.orderIndex);
        }
      );

      toast.success('List created successfully');
    },

    // On error, revert the optimistic update
    onError: (error, _, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(LISTS_QUERY_KEYS.lists(), context.previousLists);
      }
      showApiError(error);
    },

    // Always refetch lists to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
    },
  });
};

/**
 * Hook to update an existing todo list
 * Implements optimistic updates with rollback on failure
 * @returns Mutation function and state for updating lists
 */
export const useUpdateListMutation = (): UseMutationResult<
  TodoList,
  Error,
  { id: string; data: UpdateListRequest },
  { previousLists?: TodoList[]; previousList?: TodoList }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => listsApi.update(id, data),

    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEYS.list(id) });

      const previousLists = queryClient.getQueryData<TodoList[]>(LISTS_QUERY_KEYS.lists());
      const previousList = queryClient.getQueryData<TodoList>(LISTS_QUERY_KEYS.list(id));

      // Update lists cache
      if (previousLists) {
        const updatedLists = previousLists.map(list => 
          list.id === id 
            ? { ...list, ...data, updatedAt: new Date().toISOString() }
            : list
        ).sort((a, b) => a.orderIndex - b.orderIndex);
        
        queryClient.setQueryData(LISTS_QUERY_KEYS.lists(), updatedLists);
      }

      // Update single list cache
      if (previousList) {
        const updatedList = { ...previousList, ...data, updatedAt: new Date().toISOString() };
        queryClient.setQueryData(LISTS_QUERY_KEYS.list(id), updatedList);
      }

      return { previousLists, previousList };
    },

    onSuccess: (updatedList) => {
      // Update both caches with the real server data
      queryClient.setQueryData<TodoList[]>(
        LISTS_QUERY_KEYS.lists(),
        (old) => {
          if (!old) return [updatedList];
          return old.map(list => list.id === updatedList.id ? updatedList : list)
            .sort((a, b) => a.orderIndex - b.orderIndex);
        }
      );

      queryClient.setQueryData(LISTS_QUERY_KEYS.list(updatedList.id), updatedList);
      toast.success('List updated successfully');
    },

    onError: (error, { id }, context) => {
      // Revert optimistic updates
      if (context?.previousLists) {
        queryClient.setQueryData(LISTS_QUERY_KEYS.lists(), context.previousLists);
      }
      if (context?.previousList) {
        queryClient.setQueryData(LISTS_QUERY_KEYS.list(id), context.previousList);
      }
      showApiError(error);
    },

    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.list(id) });
    },
  });
};

/**
 * Hook to delete a todo list permanently
 * Implements optimistic removal with confirmation
 * @returns Mutation function and state for deleting lists
 */
export const useDeleteListMutation = (): UseMutationResult<
  void,
  Error,
  string,
  { previousLists?: TodoList[]; previousList?: TodoList }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: listsApi.delete,

    // Optimistic update: immediately remove from UI
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEYS.list(listId) });

      const previousLists = queryClient.getQueryData<TodoList[]>(LISTS_QUERY_KEYS.lists());
      const previousList = queryClient.getQueryData<TodoList>(LISTS_QUERY_KEYS.list(listId));

      // Remove from lists cache
      if (previousLists) {
        const updatedLists = previousLists.filter(list => list.id !== listId);
        queryClient.setQueryData(LISTS_QUERY_KEYS.lists(), updatedLists);
      }

      // Remove from single list cache
      queryClient.removeQueries({ queryKey: LISTS_QUERY_KEYS.list(listId) });

      return { previousLists, previousList };
    },

    onSuccess: () => {
      toast.success('List deleted successfully');
    },

    onError: (error, listId, context) => {
      // Revert optimistic updates
      if (context?.previousLists) {
        queryClient.setQueryData(LISTS_QUERY_KEYS.lists(), context.previousLists);
      }
      if (context?.previousList) {
        queryClient.setQueryData(LISTS_QUERY_KEYS.list(listId), context.previousList);
      }
      showApiError(error);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
    },
  });
};

/**
 * Hook to reorder multiple lists
 * Updates the orderIndex of multiple lists in a single operation
 * @returns Mutation function and state for reordering lists
 */
export const useReorderListsMutation = (): UseMutationResult<
  TodoList[],
  Error,
  ReorderRequest,
  { previousLists?: TodoList[] }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: listsApi.reorder,

    onMutate: async (reorderData) => {
      await queryClient.cancelQueries({ queryKey: LISTS_QUERY_KEYS.lists() });

      const previousLists = queryClient.getQueryData<TodoList[]>(LISTS_QUERY_KEYS.lists());

      // Optimistic update: reorder lists immediately
      if (previousLists) {
        const updatedLists = previousLists.map(list => {
          const update = reorderData.updates.find(u => u.id === list.id);
          return update 
            ? { ...list, orderIndex: update.newPosition, updatedAt: new Date().toISOString() }
            : list;
        }).sort((a, b) => a.orderIndex - b.orderIndex);

        queryClient.setQueryData(LISTS_QUERY_KEYS.lists(), updatedLists);
      }

      return { previousLists };
    },

    onSuccess: (updatedLists) => {
      const sortedLists = updatedLists.sort((a, b) => a.orderIndex - b.orderIndex);
      queryClient.setQueryData(LISTS_QUERY_KEYS.lists(), sortedLists);
    },

    onError: (error, _, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(LISTS_QUERY_KEYS.lists(), context.previousLists);
      }
      showApiError(error);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
    },
  });
};