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
  // Initialize with current navigator.onLine status
  // Note: navigator.onLine can be unreliable but it's the best we have
  const [isOnline, setIsOnline] = useState(true); // Default to online

  useEffect(() => {
    // Set initial state based on navigator.onLine when component mounts
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

    // Optional: Add additional checks using fetch or ping
    // This can help detect cases where navigator.onLine is true but there's no actual connectivity
    
    // Periodic connectivity check (every 30 seconds when online)
    const checkConnectivity = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }

      try {
        // Try to fetch a small resource to verify actual connectivity
        // Using a HEAD request to minimize data usage
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch('/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        // Fetch failed, likely offline or network error
        console.log('Network: Connectivity check failed', error);
        setIsOnline(false);
      }
    };

    // Start periodic checks
    const intervalId = setInterval(checkConnectivity, 30000); // Check every 30 seconds

    // Initial connectivity check
    checkConnectivity();

    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
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