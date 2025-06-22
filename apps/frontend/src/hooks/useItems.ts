/**
 * Custom hooks for managing todo items data fetching and mutations
 * These hooks provide optimistic updates, error handling, and cache management
 * for all item-related operations using TanStack Query.
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
  TodoItem, 
  CreateItemRequest, 
  UpdateItemRequest,
  ReorderRequest,
} from '../types/api';
import { itemsApi, showApiError } from '../utils/api';
import { LISTS_QUERY_KEYS } from './useLists';

// Query keys for consistent cache management
export const ITEMS_QUERY_KEYS = {
  all: ['items'] as const,
  items: () => [...ITEMS_QUERY_KEYS.all, 'item'] as const,
  item: (id: string) => [...ITEMS_QUERY_KEYS.items(), id] as const,
  byList: (listId: string) => [...ITEMS_QUERY_KEYS.items(), 'list', listId] as const,
} as const;

/**
 * Hook to fetch all items for a specific list
 * Provides automatic refetching, caching, and loading states
 * @param listId - ID of the parent list
 * @returns Query result with items data, loading state, and error handling
 */
export const useItemsQuery = (
  listId: string
): UseQueryResult<TodoItem[], Error> => {
  return useQuery({
    queryKey: ITEMS_QUERY_KEYS.byList(listId),
    queryFn: () => itemsApi.getByListId(listId),
    enabled: !!listId, // Only run query if listId is provided
    staleTime: 3 * 60 * 1000, // 3 minutes (shorter than lists for more frequent updates)
    select: (data) => {
      // Sort items: incomplete first, then by position
      return data.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1; // Incomplete items first
        }
        return a.positionInList - b.positionInList;
      });
    },
  });
};

/**
 * Hook to create a new todo item in a specific list
 * Implements optimistic updates for immediate UI feedback
 * @returns Mutation function and state for creating items
 */
export const useCreateItemMutation = (): UseMutationResult<
  TodoItem,
  Error,
  { listId: string; data: CreateItemRequest },
  { previousItems?: TodoItem[] }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }) => itemsApi.create(listId, data),
    
    // Optimistic update: immediately add the new item to the UI
    onMutate: async ({ listId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ITEMS_QUERY_KEYS.byList(listId) });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<TodoItem[]>(ITEMS_QUERY_KEYS.byList(listId));

      // Optimistically update the cache
      if (previousItems) {
        const optimisticItem: TodoItem = {
          id: `temp-${Date.now()}`, // Temporary ID for optimistic update
          listId,
          title: data.title,
          isCompleted: false,
          positionInList: data.positionInList || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedItems = [...previousItems, optimisticItem]
          .sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) {
              return a.isCompleted ? 1 : -1;
            }
            return a.positionInList - b.positionInList;
          });

        queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(listId), updatedItems);
      }

      return { previousItems };
    },

    // On success, update the cache with the real data from server
    onSuccess: (newItem, { listId }) => {
      queryClient.setQueryData<TodoItem[]>(
        ITEMS_QUERY_KEYS.byList(listId),
        (old) => {
          if (!old) return [newItem];
          
          // Replace the optimistic item with the real one
          const withoutOptimistic = old.filter(item => !item.id.startsWith('temp-'));
          return [...withoutOptimistic, newItem]
            .sort((a, b) => {
              if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
              }
              return a.positionInList - b.positionInList;
            });
        }
      );

      // Also invalidate the parent list cache to update item counts
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
      toast.success('Item created successfully');
    },

    // On error, revert the optimistic update
    onError: (error, { listId }, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(listId), context.previousItems);
      }
      showApiError(error);
    },

    // Always refetch items to ensure consistency
    onSettled: (_, __, { listId }) => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEYS.byList(listId) });
    },
  });
};

/**
 * Hook to update an existing todo item
 * Implements optimistic updates with rollback on failure
 * Handles moving items between lists when listId is changed
 * @returns Mutation function and state for updating items
 */
export const useUpdateItemMutation = (): UseMutationResult<
  TodoItem,
  Error,
  { id: string; data: UpdateItemRequest; currentListId: string },
  { 
    previousItems?: TodoItem[]; 
    previousTargetItems?: TodoItem[];
    targetListId?: string;
  }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => itemsApi.update(id, data),

    // Optimistic update
    onMutate: async ({ id, data, currentListId }) => {
      const targetListId = data.listId || currentListId;
      const isMovingBetweenLists = data.listId && data.listId !== currentListId;

      // Cancel relevant queries
      await queryClient.cancelQueries({ queryKey: ITEMS_QUERY_KEYS.byList(currentListId) });
      if (isMovingBetweenLists) {
        await queryClient.cancelQueries({ queryKey: ITEMS_QUERY_KEYS.byList(targetListId) });
      }

      const previousItems = queryClient.getQueryData<TodoItem[]>(ITEMS_QUERY_KEYS.byList(currentListId));
      const previousTargetItems = isMovingBetweenLists 
        ? queryClient.getQueryData<TodoItem[]>(ITEMS_QUERY_KEYS.byList(targetListId))
        : undefined;

      if (isMovingBetweenLists) {
        // Moving item between lists
        if (previousItems) {
          const itemToMove = previousItems.find(item => item.id === id);
          if (itemToMove) {
            // Remove from current list
            const updatedCurrentItems = previousItems.filter(item => item.id !== id);
            queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(currentListId), updatedCurrentItems);

            // Add to target list
            const movedItem = { 
              ...itemToMove, 
              ...data, 
              listId: targetListId,
              updatedAt: new Date().toISOString() 
            };
            
            const updatedTargetItems = [...(previousTargetItems || []), movedItem]
              .sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) {
                  return a.isCompleted ? 1 : -1;
                }
                return a.positionInList - b.positionInList;
              });
            
            queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(targetListId), updatedTargetItems);
          }
        }
      } else {
        // Updating item within the same list
        if (previousItems) {
          const updatedItems = previousItems.map(item => 
            item.id === id 
              ? { ...item, ...data, updatedAt: new Date().toISOString() }
              : item
          ).sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) {
              return a.isCompleted ? 1 : -1;
            }
            return a.positionInList - b.positionInList;
          });
          
          queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(currentListId), updatedItems);
        }
      }

      return { previousItems, previousTargetItems, targetListId };
    },

    onSuccess: (updatedItem, { currentListId, data }) => {
      const targetListId = data.listId || currentListId;
      const isMovingBetweenLists = data.listId && data.listId !== currentListId;

      if (isMovingBetweenLists) {
        // Update both list caches
        queryClient.setQueryData<TodoItem[]>(
          ITEMS_QUERY_KEYS.byList(currentListId),
          (old) => old ? old.filter(item => item.id !== updatedItem.id) : []
        );

        queryClient.setQueryData<TodoItem[]>(
          ITEMS_QUERY_KEYS.byList(targetListId),
          (old) => {
            const withoutUpdated = (old || []).filter(item => item.id !== updatedItem.id);
            return [...withoutUpdated, updatedItem]
              .sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) {
                  return a.isCompleted ? 1 : -1;
                }
                return a.positionInList - b.positionInList;
              });
          }
        );
      } else {
        // Update single list cache
        queryClient.setQueryData<TodoItem[]>(
          ITEMS_QUERY_KEYS.byList(targetListId),
          (old) => {
            if (!old) return [updatedItem];
            return old.map(item => item.id === updatedItem.id ? updatedItem : item)
              .sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) {
                  return a.isCompleted ? 1 : -1;
                }
                return a.positionInList - b.positionInList;
              });
          }
        );
      }

      // Invalidate lists cache to update item counts and completion status
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
      
      if (data.isCompleted !== undefined) {
        toast.success(data.isCompleted ? 'Item completed!' : 'Item marked incomplete');
      } else if (isMovingBetweenLists) {
        toast.success('Item moved successfully');
      } else {
        toast.success('Item updated successfully');
      }
    },

    onError: (error, { currentListId, data: _ }, context) => {
      // Revert optimistic updates
      if (context?.previousItems) {
        queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(currentListId), context.previousItems);
      }
      if (context?.previousTargetItems && context?.targetListId) {
        queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(context.targetListId), context.previousTargetItems);
      }
      showApiError(error);
    },

    onSettled: (_, __, { currentListId, data }) => {
      const targetListId = data.listId || currentListId;
      
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEYS.byList(currentListId) });
      if (data.listId && data.listId !== currentListId) {
        queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEYS.byList(targetListId) });
      }
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
    },
  });
};

/**
 * Hook to delete a todo item permanently
 * Implements optimistic removal (no confirmation required for items)
 * @returns Mutation function and state for deleting items
 */
export const useDeleteItemMutation = (): UseMutationResult<
  void,
  Error,
  { id: string; listId: string },
  { previousItems?: TodoItem[] }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => itemsApi.delete(id),

    // Optimistic update: immediately remove from UI
    onMutate: async ({ id, listId }) => {
      await queryClient.cancelQueries({ queryKey: ITEMS_QUERY_KEYS.byList(listId) });

      const previousItems = queryClient.getQueryData<TodoItem[]>(ITEMS_QUERY_KEYS.byList(listId));

      // Remove from items cache
      if (previousItems) {
        const updatedItems = previousItems.filter(item => item.id !== id);
        queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(listId), updatedItems);
      }

      return { previousItems };
    },

    onSuccess: () => {
      // Invalidate lists cache to update item counts
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
      toast.success('Item deleted successfully');
    },

    onError: (error, { listId }, context) => {
      // Revert optimistic updates
      if (context?.previousItems) {
        queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(listId), context.previousItems);
      }
      showApiError(error);
    },

    onSettled: (_, __, { listId }) => {
      queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEYS.byList(listId) });
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
    },
  });
};

/**
 * Hook to reorder multiple items within or across lists
 * Updates the positionInList of multiple items in a single operation
 * @returns Mutation function and state for reordering items
 */
export const useReorderItemsMutation = (): UseMutationResult<
  TodoItem[],
  Error,
  { updates: ReorderRequest; affectedListIds: string[] },
  { previousItemsCache: Record<string, TodoItem[]> }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ updates }) => itemsApi.reorder(updates),

    onMutate: async ({ updates, affectedListIds }) => {
      // Cancel queries for all affected lists
      await Promise.all(
        affectedListIds.map(listId => 
          queryClient.cancelQueries({ queryKey: ITEMS_QUERY_KEYS.byList(listId) })
        )
      );

      // Store previous state for all affected lists
      const previousItemsCache: Record<string, TodoItem[]> = {};
      
      for (const listId of affectedListIds) {
        const items = queryClient.getQueryData<TodoItem[]>(ITEMS_QUERY_KEYS.byList(listId));
        if (items) {
          previousItemsCache[listId] = items;
        }
      }

      // Apply optimistic updates to all affected lists
      for (const listId of affectedListIds) {
        const items = previousItemsCache[listId];
        if (items) {
          const updatedItems = items.map(item => {
            const update = updates.updates.find(u => u.id === item.id);
            return update 
              ? { 
                  ...item, 
                  positionInList: update.newPosition, 
                  updatedAt: new Date().toISOString() 
                }
              : item;
          }).sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) {
              return a.isCompleted ? 1 : -1;
            }
            return a.positionInList - b.positionInList;
          });

          queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(listId), updatedItems);
        }
      }

      return { previousItemsCache };
    },

    onSuccess: (updatedItems, { affectedListIds }) => {
      // Group updated items by list ID
      const itemsByList = updatedItems.reduce((acc, item) => {
        if (!acc[item.listId]) {
          acc[item.listId] = [];
        }
        acc[item.listId].push(item);
        return acc;
      }, {} as Record<string, TodoItem[]>);

      // Update cache for each affected list
      for (const listId of affectedListIds) {
        const listItems = itemsByList[listId] || [];
        
        queryClient.setQueryData<TodoItem[]>(
          ITEMS_QUERY_KEYS.byList(listId),
          (old) => {
            if (!old) return listItems;
            
            // Merge updated items with existing items
            const updatedIds = new Set(listItems.map(item => item.id));
            const nonUpdatedItems = old.filter(item => !updatedIds.has(item.id));
            
            return [...nonUpdatedItems, ...listItems]
              .sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) {
                  return a.isCompleted ? 1 : -1;
                }
                return a.positionInList - b.positionInList;
              });
          }
        );
      }

      toast.success('Items reordered successfully');
    },

    onError: (error, { affectedListIds }, context) => {
      // Revert optimistic updates for all affected lists
      if (context?.previousItemsCache) {
        for (const listId of affectedListIds) {
          const previousItems = context.previousItemsCache[listId];
          if (previousItems) {
            queryClient.setQueryData(ITEMS_QUERY_KEYS.byList(listId), previousItems);
          }
        }
      }
      showApiError(error);
    },

    onSettled: (_, __, { affectedListIds }) => {
      // Invalidate queries for all affected lists
      for (const listId of affectedListIds) {
        queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEYS.byList(listId) });
      }
      queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEYS.lists() });
    },
  });
};