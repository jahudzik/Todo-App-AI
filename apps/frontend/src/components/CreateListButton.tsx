/**
 * CreateListButton Component
 * 
 * A floating action button or inline button for creating new todo lists.
 * Includes inline form with validation and loading states.
 */

import { useState, memo } from 'react';
import { useTranslation } from 'next-i18next';

interface CreateListButtonProps {
  onCreateList: (name: string) => Promise<void>;
  isCreating?: boolean;
  disabled?: boolean;
}

function CreateListButton({ 
  onCreateList, 
  isCreating = false, 
  disabled = false 
}: CreateListButtonProps) {
  const { t } = useTranslation('common');
  const [showForm, setShowForm] = useState(false);
  const [listName, setListName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!listName.trim() || disabled || isCreating) return;

    try {
      await onCreateList(listName.trim());
      setListName('');
      setShowForm(false);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setListName('');
  };

  if (showForm) {
    return (
      <div className="flex items-center space-x-3">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder={t('lists.create.placeholder')}
            autoFocus
            maxLength={100}
            className="w-48 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={isCreating}
          />
          
          <button
            type="submit"
            disabled={!listName.trim() || isCreating}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${!listName.trim() || isCreating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {isCreating ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
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
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            {t('lists.create.cancel')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      disabled={disabled}
      className={`
        inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
        transition-all duration-200
        ${disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md'
        }
      `}
      title={disabled ? t('offline.tooltip') : 'Create a new todo list'}
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      {t('lists.create.button')}
    </button>
  );
}

// Memoize to prevent unnecessary re-renders when parent component updates
export default memo(CreateListButton, (prevProps, nextProps) => {
  return (
    prevProps.isCreating === nextProps.isCreating &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.onCreateList === nextProps.onCreateList
  );
});