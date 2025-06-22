/**
 * EmptyListsState Component
 * 
 * Displays a welcoming empty state when no todo lists exist.
 * Includes illustration, friendly messaging, and clear CTA to create first list.
 */

import { useState, memo } from 'react';
import { useTranslation } from 'next-i18next';

interface EmptyListsStateProps {
  onCreateList: (name: string) => Promise<void>;
  disabled?: boolean;
}

function EmptyListsState({ onCreateList, disabled }: EmptyListsStateProps) {
  const { t } = useTranslation('common');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [listName, setListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!listName.trim() || disabled || isCreating) return;

    setIsCreating(true);
    try {
      await onCreateList(listName.trim());
      setListName('');
      setShowCreateForm(false);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setListName('');
  };

  return (
    <div className="text-center py-16">
      {/* Illustration */}
      <div className="mb-8">
        <div className="mx-auto w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center">
          <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" />
          </svg>
        </div>
      </div>

      {/* Welcome message */}
      <div className="max-w-md mx-auto mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {t('lists.emptyState.title')}
        </h2>
        <p className="text-gray-600 leading-relaxed">
          {t('lists.emptyState.description')}
        </p>
      </div>

      {/* Create list form or button */}
      {!showCreateForm ? (
        <div className="space-y-4">
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={disabled}
            className={`
              inline-flex items-center px-6 py-3 text-base font-medium rounded-lg
              transition-all duration-200
              ${disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95'
              }
            `}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('lists.emptyState.createButton')}
          </button>
          
          {disabled && (
            <p className="text-sm text-gray-500">
              {t('offline.tooltip')}
            </p>
          )}
        </div>
      ) : (
        <div className="max-w-sm mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder={t('lists.create.placeholder')}
                autoFocus
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                disabled={isCreating}
              />
              <p className="text-xs text-gray-500 mt-1 text-left">
                {listName.length}/100 characters
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!listName.trim() || isCreating}
                className={`
                  flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                  ${!listName.trim() || isCreating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('lists.create.creating')}
                  </div>
                ) : (
                  t('lists.create.submit')
                )}
              </button>
              
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {t('lists.create.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Additional tips */}
      <div className="mt-12 max-w-lg mx-auto">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          {t('lists.emptyState.tips.title')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600">
          <div className="flex items-start">
            <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <span>{t('lists.emptyState.tips.organize')}</span>
          </div>
          <div className="flex items-start">
            <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            <span>{t('lists.emptyState.tips.dragDrop')}</span>
          </div>
          <div className="flex items-start">
            <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            </div>
            <span>{t('lists.emptyState.tips.progress')}</span>
          </div>
          <div className="flex items-start">
            <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            </div>
            <span>{t('lists.emptyState.tips.offline')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(EmptyListsState, (prevProps, nextProps) => {
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.onCreateList === nextProps.onCreateList
  );
});