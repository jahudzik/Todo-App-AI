/**
 * Custom hook for detecting online/offline status
 * Provides real-time network connectivity status and handles reconnection events.
 * Used to show connection banners and manage offline behavior.
 */

import { useState, useEffect } from 'react';

/**
 * Hook to track the online/offline status of the browser
 * Listens to browser events and provides current connection state
 * @returns Object containing online status and helper methods
 */
export const useOnlineStatus = () => {
  // Initialize with navigator.onLine status if available, otherwise assume online
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Default to online during SSR
  });

  useEffect(() => {
    // Double-check initial state when component mounts (client-side only)
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    // Handler for when the user goes online
    const handleOnline = () => {
      console.log('Network: Connection restored');
      setIsOnline(true);
    };

    // Handler for when the user goes offline
    const handleOffline = () => {
      console.log('Network: Connection lost');
      setIsOnline(false);
    };

    // Add event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // For MVP, we'll rely on browser events rather than periodic checks
    // This prevents false positives from failed favicon or API requests

    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
  };
};

/**
 * Hook that combines online status with TanStack Query's network status
 * Provides enhanced offline handling for data fetching operations
 * @returns Extended online status with query-specific helpers
 */
export const useNetworkStatus = () => {
  const { isOnline, isOffline } = useOnlineStatus();

  return {
    isOnline,
    isOffline,
    
    /**
     * Whether network requests should be allowed
     * Can be used to conditionally enable/disable mutations
     */
    canMakeRequests: isOnline,
    
    /**
     * Get appropriate error message for network issues
     */
    getNetworkErrorMessage: () => {
      if (isOffline) {
        return 'You are currently offline. Please check your internet connection.';
      }
      return 'Network error. Please try again.';
    },
  };
};