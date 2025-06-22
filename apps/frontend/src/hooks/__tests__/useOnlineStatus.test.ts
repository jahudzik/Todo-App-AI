/**
 * Unit tests for useOnlineStatus hook
 * Tests both happy paths and edge cases for network connectivity detection
 */

import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus, useNetworkStatus } from '../useOnlineStatus';

// Mock global fetch
global.fetch = jest.fn();

describe('useOnlineStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    
    // Mock window event listeners
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  describe('Happy Paths', () => {
    test('should initialize as online by default', () => {
      const { result } = renderHook(() => useOnlineStatus());
      
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    test('should set up event listeners for online/offline events', () => {
      renderHook(() => useOnlineStatus());
      
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    test('should handle going online correctly', () => {
      let onlineHandler: () => void = jest.fn();
      
      // Capture the online event handler
      (window.addEventListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'online') {
          onlineHandler = handler;
        }
      });

      const { result } = renderHook(() => useOnlineStatus());
      
      // Initially online
      expect(result.current.isOnline).toBe(true);
      
      // Trigger online event (should maintain online state)
      act(() => {
        onlineHandler();
      });
      
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    test('should handle going offline correctly', () => {
      let offlineHandler: () => void = jest.fn();
      
      // Capture the offline event handler
      (window.addEventListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'offline') {
          offlineHandler = handler;
        }
      });

      const { result } = renderHook(() => useOnlineStatus());
      
      // Initially online
      expect(result.current.isOnline).toBe(true);
      
      // Trigger offline event
      act(() => {
        offlineHandler();
      });
      
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    test('should toggle between online and offline states', () => {
      let onlineHandler: () => void = jest.fn();
      let offlineHandler: () => void = jest.fn();
      
      // Capture both event handlers
      (window.addEventListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'online') {
          onlineHandler = handler;
        } else if (event === 'offline') {
          offlineHandler = handler;
        }
      });

      const { result } = renderHook(() => useOnlineStatus());
      
      // Start online
      expect(result.current.isOnline).toBe(true);
      
      // Go offline
      act(() => {
        offlineHandler();
      });
      expect(result.current.isOffline).toBe(true);
      
      // Go back online
      act(() => {
        onlineHandler();
      });
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    test('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOnlineStatus());
      
      unmount();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Edge Cases', () => {
    test('should properly initialize online status', () => {
      const { result } = renderHook(() => useOnlineStatus());
      
      // Should start as true (default)
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });
  });
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  describe('Happy Paths', () => {
    test('should return correct online status and helpers', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current).toEqual({
        isOnline: true,
        isOffline: false,
        canMakeRequests: true,
        getNetworkErrorMessage: expect.any(Function),
      });
    });

    test('should return appropriate error message when online', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.getNetworkErrorMessage()).toBe(
        'Network error. Please try again.'
      );
    });

    test('should allow requests when online', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.canMakeRequests).toBe(true);
    });
  });

  describe('Offline Scenarios', () => {
    test('should return correct offline status and helpers', () => {
      let offlineHandler: () => void = jest.fn();
      
      (window.addEventListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'offline') {
          offlineHandler = handler;
        }
      });

      const { result } = renderHook(() => useNetworkStatus());
      
      // Go offline
      act(() => {
        offlineHandler();
      });
      
      expect(result.current).toEqual({
        isOnline: false,
        isOffline: true,
        canMakeRequests: false,
        getNetworkErrorMessage: expect.any(Function),
      });
    });

    test('should return offline error message when offline', () => {
      let offlineHandler: () => void = jest.fn();
      
      (window.addEventListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'offline') {
          offlineHandler = handler;
        }
      });

      const { result } = renderHook(() => useNetworkStatus());
      
      // Go offline
      act(() => {
        offlineHandler();
      });
      
      expect(result.current.getNetworkErrorMessage()).toBe(
        'You are currently offline. Please check your internet connection.'
      );
    });

    test('should not allow requests when offline', () => {
      let offlineHandler: () => void = jest.fn();
      
      (window.addEventListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'offline') {
          offlineHandler = handler;
        }
      });

      const { result } = renderHook(() => useNetworkStatus());
      
      // Go offline
      act(() => {
        offlineHandler();
      });
      
      expect(result.current.canMakeRequests).toBe(false);
    });
  });
});