/**
 * Offline Banner Component
 * Displays a banner at the top of the page when the user is offline
 * Provides visual feedback about connection status and blocks user actions
 */

import React from 'react';
import { useTranslation } from 'next-i18next';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineBannerProps {
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ className = '' }) => {
  const { isOffline } = useOnlineStatus();
  const { t } = useTranslation('common');

  if (!isOffline) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className="bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-center space-x-2">
          {/* Offline icon */}
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" 
            />
          </svg>
          
          {/* Message */}
          <span className="text-sm font-medium">
            {t('offline.banner.title')}
          </span>
          
          {/* Pulsing dot indicator */}
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
        
        {/* Additional info */}
        <div className="mt-1 text-center">
          <p className="text-xs text-red-100">
            {t('offline.banner.description')}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Overlay component that blocks interaction when offline
 * Can be used to disable forms, buttons, or entire sections
 */
interface OfflineOverlayProps {
  children: React.ReactNode;
  className?: string;
  showMessage?: boolean;
  message?: string;
}

export const OfflineOverlay: React.FC<OfflineOverlayProps> = ({
  children,
  className = '',
  showMessage = true,
  message,
}) => {
  const { isOffline } = useOnlineStatus();
  const { t } = useTranslation('common');

  return (
    <div className={`relative ${className}`}>
      {children}
      
      {/* Overlay when offline */}
      {isOffline && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
          {showMessage && (
            <div className="bg-white px-4 py-3 rounded-md shadow-lg">
              <div className="flex items-center space-x-2">
                <svg 
                  className="w-5 h-5 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
                <span className="text-sm font-medium text-gray-900">
                  {message || t('offline.overlay.message')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Hook to disable interactions when offline
 * Returns props that can be spread on interactive elements
 */
export const useOfflineDisabled = () => {
  const { isOffline } = useOnlineStatus();
  const { t } = useTranslation('common');
  
  return {
    disabled: isOffline,
    'aria-disabled': isOffline,
    title: isOffline ? t('offline.tooltip') : undefined,
    className: isOffline ? 'opacity-50 cursor-not-allowed' : undefined,
  };
};