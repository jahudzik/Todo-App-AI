/**
 * ListCard Component
 * 
 * Displays a single todo list as a card with:
 * - List name and creation date
 * - Item count and preview of first few items
 * - Click to navigate to list detail page
 * - Visual indicators for list status
 */

import { useMemo, memo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { TodoList } from '../types/api';

interface ListCardProps {
  list: TodoList;
  disabled?: boolean;
}

function ListCard({ list, disabled }: ListCardProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');

  // Format creation date based on locale
  const formattedDate = useMemo(() => {
    const date = new Date(list.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    // Show relative time for recent lists (within 24 hours)
    if (diffInHours < 24) {
      const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return rtf.format(-diffInMinutes, 'minute');
      } else {
        return rtf.format(-Math.floor(diffInHours), 'hour');
      }
    }

    // Show absolute date for older lists
    return date.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [list.createdAt, i18n.language]);

  // Calculate item statistics
  const itemStats = useMemo(() => {
    const items = list.items || [];
    const totalItems = items.length;
    const completedItems = items.filter(item => item.isCompleted).length;
    const pendingItems = totalItems - completedItems;

    return {
      total: totalItems,
      completed: completedItems,
      pending: pendingItems,
      completionPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };
  }, [list.items]);

  // Get preview of first few incomplete items
  const previewItems = useMemo(() => {
    if (!list.items) return [];
    
    const incompleteItems = list.items
      .filter(item => !item.isCompleted)
      .sort((a, b) => a.positionInList - b.positionInList)
      .slice(0, 3);
    
    return incompleteItems;
  }, [list.items]);

  const handleCardClick = () => {
    if (disabled) return;
    
    // Navigate to list detail page
    router.push(`/lists/${list.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200
        ${disabled 
          ? 'cursor-not-allowed opacity-60' 
          : 'cursor-pointer hover:shadow-md hover:border-gray-300 hover:-translate-y-1'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {list.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {formattedDate}
          </p>
        </div>
        
        {/* List icon */}
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {itemStats.total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>{t('lists.stats.completed', { completed: itemStats.completed, total: itemStats.total })}</span>
            <span>{itemStats.completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${itemStats.completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Item preview */}
      <div className="space-y-2">
        {itemStats.total === 0 ? (
          <p className="text-sm text-gray-500 italic">{t('lists.stats.noItems')}</p>
        ) : (
          <>
            {previewItems.map((item) => (
              <div key={item.id} className="flex items-center text-sm text-gray-700">
                <div className="w-2 h-2 bg-gray-300 rounded-full mr-2 flex-shrink-0"></div>
                <span className="truncate">{item.title}</span>
              </div>
            ))}
            
            {itemStats.pending > previewItems.length && (
              <div className="text-sm text-gray-500">
                {t('lists.stats.moreItems', { count: itemStats.pending - previewItems.length })}
              </div>
            )}
            
            {itemStats.pending === 0 && itemStats.completed > 0 && (
              <div className="flex items-center text-sm text-green-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {t('lists.stats.allCompleted')}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with item count */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {t('lists.stats.items', { count: itemStats.total })}
          </span>
          {itemStats.pending > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {t('lists.stats.pending', { count: itemStats.pending })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Efficient comparison function for items array
 * Compares array length and item references without deep stringification
 */
const areItemsEqual = (prevItems: any[] = [], nextItems: any[] = []): boolean => {
  // Quick length check
  if (prevItems.length !== nextItems.length) {
    return false;
  }
  
  // Compare each item by reference and key properties
  for (let i = 0; i < prevItems.length; i++) {
    const prevItem = prevItems[i];
    const nextItem = nextItems[i];
    
    // Short-circuit on first difference
    if (
      prevItem?.id !== nextItem?.id ||
      prevItem?.title !== nextItem?.title ||
      prevItem?.isCompleted !== nextItem?.isCompleted ||
      prevItem?.positionInList !== nextItem?.positionInList
    ) {
      return false;
    }
  }
  
  return true;
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render when list data or disabled state changes
export default memo(ListCard, (prevProps, nextProps) => {
  // Custom comparison function for optimal performance
  return (
    prevProps.list.id === nextProps.list.id &&
    prevProps.list.name === nextProps.list.name &&
    prevProps.list.createdAt === nextProps.list.createdAt &&
    prevProps.list.updatedAt === nextProps.list.updatedAt &&
    prevProps.list.orderIndex === nextProps.list.orderIndex &&
    prevProps.disabled === nextProps.disabled &&
    // Efficiently compare items array
    areItemsEqual(prevProps.list.items, nextProps.list.items)
  );
});