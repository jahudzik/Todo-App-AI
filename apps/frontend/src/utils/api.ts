/**
 * Centralized API Client for Todo App
 * This module provides a type-safe HTTP client for communicating with the backend API.
 * It includes request/response interceptors, error handling, and environment configuration.
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import {
  TodoList,
  TodoItem,
  CreateListRequest,
  UpdateListRequest,
  CreateItemRequest,
  UpdateItemRequest,
  ApiResponse,
  ApiError,
  GetListsParams,
  GetListParams,
  ReorderRequest,
} from '../types/api';

// Environment configuration with fallback and validation
const getApiBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!baseUrl) {
    // During build time, provide a default value to prevent build failures
    // At runtime, this will be properly set from the environment
    if (typeof window === 'undefined') {
      // Server-side (build time) - use default
      return 'http://localhost:3001';
    }
    
    const errorMessage = 'NEXT_PUBLIC_API_URL environment variable is not set. Please check your .env.local file.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  return baseUrl;
};

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding common headers or authentication
apiClient.interceptors.request.use(
  (config) => {
    // Add user ID header for demo purposes
    config.headers['X-User-ID'] = 'demo';
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors and data extraction
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    // Handle network errors (no response received)
    if (!error.response) {
      // Check if it's specifically an offline/network error
      const isNetworkError = !navigator.onLine || 
        error.code === 'NETWORK_ERROR' || 
        error.message.includes('Network Error') ||
        error.message.includes('fetch');

      const networkError = {
        code: 'NETWORK_ERROR' as const,
        message: isNetworkError 
          ? 'You appear to be offline. Please check your internet connection.'
          : 'Network error. Please check your internet connection.',
      };
      
      console.error('Network error:', error.message);
      return Promise.reject(networkError);
    }

    // Extract error information from response
    const apiError = error.response.data?.error || {
      code: 'INTERNAL_ERROR' as const,
      message: 'An unexpected error occurred',
    };

    console.error('API error:', apiError);
    return Promise.reject(apiError);
  }
);

/**
 * Generic API request wrapper with error handling
 * @param requestFn - Function that makes the API request
 * @returns Promise with the response data
 */
const handleApiRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>
): Promise<T> => {
  try {
    const response = await requestFn();
    return response.data.data;
  } catch (error) {
    // Error is already processed by the response interceptor
    throw error;
  }
};

// Lists API methods
export const listsApi = {
  /**
   * Fetch all todo lists for the current user
   * @param params - Query parameters for filtering/inclusion
   * @returns Promise with array of TodoList objects
   */
  getAll: (params?: GetListsParams): Promise<TodoList[]> => {
    return handleApiRequest(() =>
      apiClient.get('/api/lists', { params })
    );
  },

  /**
   * Fetch a specific todo list by ID
   * @param params - List ID and optional parameters
   * @returns Promise with TodoList object
   */
  getById: (params: GetListParams): Promise<TodoList> => {
    const { id, ...queryParams } = params;
    return handleApiRequest(() =>
      apiClient.get(`/api/lists/${id}`, { params: queryParams })
    );
  },

  /**
   * Create a new todo list
   * @param data - List creation data
   * @returns Promise with created TodoList object
   */
  create: (data: CreateListRequest): Promise<TodoList> => {
    return handleApiRequest(() =>
      apiClient.post('/api/lists', data)
    );
  },

  /**
   * Update an existing todo list
   * @param id - List ID to update
   * @param data - Update data
   * @returns Promise with updated TodoList object
   */
  update: (id: string, data: UpdateListRequest): Promise<TodoList> => {
    return handleApiRequest(() =>
      apiClient.patch(`/api/lists/${id}`, data)
    );
  },

  /**
   * Delete a todo list permanently
   * @param id - List ID to delete
   * @returns Promise that resolves when deletion is complete
   */
  delete: (id: string): Promise<void> => {
    return handleApiRequest(() =>
      apiClient.delete(`/api/lists/${id}`)
    );
  },

  /**
   * Reorder multiple lists
   * @param updates - Array of position updates
   * @returns Promise with updated lists
   */
  reorder: (updates: ReorderRequest): Promise<TodoList[]> => {
    return handleApiRequest(() =>
      apiClient.patch('/api/lists/reorder', updates)
    );
  },
};

// Items API methods
export const itemsApi = {
  /**
   * Fetch all items for a specific list
   * @param listId - ID of the parent list
   * @returns Promise with array of TodoItem objects
   */
  getByListId: (listId: string): Promise<TodoItem[]> => {
    return handleApiRequest(() =>
      apiClient.get(`/api/lists/${listId}/items`)
    );
  },

  /**
   * Create a new todo item in a specific list
   * @param listId - ID of the parent list
   * @param data - Item creation data
   * @returns Promise with created TodoItem object
   */
  create: (listId: string, data: CreateItemRequest): Promise<TodoItem> => {
    return handleApiRequest(() =>
      apiClient.post(`/api/lists/${listId}/items`, data)
    );
  },

  /**
   * Update an existing todo item
   * @param id - Item ID to update
   * @param data - Update data
   * @returns Promise with updated TodoItem object
   */
  update: (id: string, data: UpdateItemRequest): Promise<TodoItem> => {
    return handleApiRequest(() =>
      apiClient.patch(`/api/items/${id}`, data)
    );
  },

  /**
   * Delete a todo item permanently
   * @param id - Item ID to delete
   * @returns Promise that resolves when deletion is complete
   */
  delete: (id: string): Promise<void> => {
    return handleApiRequest(() =>
      apiClient.delete(`/api/items/${id}`)
    );
  },

  /**
   * Reorder multiple items within or across lists
   * @param updates - Array of position updates
   * @returns Promise with updated items
   */
  reorder: (updates: ReorderRequest): Promise<TodoItem[]> => {
    return handleApiRequest(() =>
      apiClient.patch('/api/items/reorder', updates)
    );
  },
};

/**
 * Utility function to show error toast messages
 * @param error - Error object from API
 */
export const showApiError = (error: any) => {
  let message = 'An unexpected error occurred';
  
  // Validate that message is a non-empty string
  const hasValidMessage = error?.message && 
    typeof error.message === 'string' && 
    error.message.trim().length > 0;
  
  if (error?.code === 'VALIDATION_ERROR') {
    message = hasValidMessage ? error.message : 'Please check your input and try again';
  } else if (error?.code === 'NOT_FOUND') {
    message = hasValidMessage ? error.message : 'The requested resource was not found';
  } else if (error?.code === 'NETWORK_ERROR') {
    message = hasValidMessage ? error.message : 'Please check your internet connection';
  } else if (error?.code === 'INTERNAL_ERROR') {
    message = 'Server error. Please try again later';
  }
  
  toast.error(message);
};

// Export the configured axios instance for advanced usage
export { apiClient };