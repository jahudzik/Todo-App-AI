/**
 * TodoListsOverview Component
 * 
 * Main component for displaying all todo lists in a grid/list layout.
 * Handles empty states, loading states, offline states, and provides
 * functionality to create new lists with optimistic updates.
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useListsQuery, useCreateListMutation } from '../hooks/useLists';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { calculateNextOrderIndex } from '../utils/orderIndex';
import ListCard from './ListCard';
import EmptyListsState from './EmptyListsState';
import CreateListButton from './CreateListButton';
import { OfflineBanner } from './OfflineBanner';

export default function TodoListsOverview() {
  const { t } = useTranslation('common');
  const { isOnline } = useOnlineStatus();
  
  // Fetch all lists with item counts
  const { 
    data: lists = [], 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useListsQuery({ includeItems: true });

  const createListMutation = useCreateListMutation();
  const [isCreating, setIsCreating] = useState(false);

  // Sort lists by orderIndex in descending order (newest first)
  const sortedLists = useMemo(() => {
    return [...lists].sort((a, b) => b.orderIndex - a.orderIndex);
  }, [lists]);

  // Handle creating a new list (memoized to prevent child re-renders)
  const handleCreateList = useCallback(async (name: string) => {
    if (!name.trim() || !isOnline) return;

    setIsCreating(true);
    try {
      // Calculate order index for new list using utility function
      const newOrderIndex = calculateNextOrderIndex(lists);

      await createListMutation.mutateAsync({
        name: name.trim(),
        orderIndex: newOrderIndex,
      });
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Failed to create list:', error);
    } finally {
      setIsCreating(false);
    }
  }, [lists, isOnline, createListMutation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('lists.title')}
          </h1>
          <div className="w-32 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (isError && !lists.length) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('lists.title')}
          </h1>
        </div>
        
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('error')}
          </h3>
          <p className="text-gray-600 mb-4">
            {error?.message || 'Failed to load your todo lists'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Offline banner */}
      {!isOnline && <OfflineBanner />}
      
      {/* Header with create button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('lists.title')}
          </h1>
          {lists.length > 0 && (
            <p className="text-gray-600 mt-1">
              {t('lists.count', { count: lists.length })}
            </p>
          )}
        </div>
        
        <CreateListButton 
          onCreateList={handleCreateList}
          isCreating={isCreating}
          disabled={!isOnline}
        />
      </div>

      {/* Lists content */}
      {sortedLists.length === 0 ? (
        <EmptyListsState onCreateList={handleCreateList} disabled={!isOnline} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Virtual scrolling ready: Current implementation shows all lists */}
          {/* Future optimization: implement react-window or react-virtualized for 100+ lists */}
          {sortedLists.map((list) => (
            <ListCard 
              key={list.id} 
              list={list}
              disabled={!isOnline}
            />
          ))}
        </div>
      )}
    </div>
  );
}