/**
 * API Types for Todo App
 * These types represent the data structures used for API communication
 * between the frontend and backend services.
 */

// Base entity types matching the database schema
export interface TodoList {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  orderIndex: number;
  userId: string;
  items?: TodoItem[]; // Optional, populated when needed
}

export interface TodoItem {
  id: string;
  listId: string;
  title: string;
  isCompleted: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  positionInList: number;
}

// Request DTOs (Data Transfer Objects) for API endpoints
export interface CreateListRequest {
  name: string;
  orderIndex?: number; // Optional, will be calculated if not provided
}

export interface UpdateListRequest {
  name?: string;
  orderIndex?: number;
}

export interface CreateItemRequest {
  title: string;
  positionInList?: number; // Optional, will be calculated if not provided
}

export interface UpdateItemRequest {
  title?: string;
  isCompleted?: boolean;
  positionInList?: number;
  listId?: string; // For moving items between lists
}

// Response types for API endpoints
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';
    message: string;
    details?: Record<string, any>;
  };
}

// Specific response types
export interface ListsResponse extends ApiResponse<TodoList[]> {}
export interface ListResponse extends ApiResponse<TodoList> {}
export interface ItemsResponse extends ApiResponse<TodoItem[]> {}
export interface ItemResponse extends ApiResponse<TodoItem> {}

// Query parameters for list endpoints
export interface GetListsParams {
  includeItems?: boolean; // Whether to include items in the response
}

export interface GetListParams {
  id: string;
  includeItems?: boolean;
}

// Utility types for position calculations
export interface PositionUpdate {
  id: string;
  newPosition: number;
}

export interface ReorderRequest {
  updates: PositionUpdate[];
}