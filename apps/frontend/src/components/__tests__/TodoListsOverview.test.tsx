/**
 * Unit tests for TodoListsOverview component
 * Tests the main lists overview page functionality including empty states,
 * list display, creation, and offline handling.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import TodoListsOverview from '../TodoListsOverview';
import { useListsQuery, useCreateListMutation } from '../../hooks/useLists';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { TodoList } from '../../types/api';

// Mock the dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('../../hooks/useLists');
jest.mock('../../hooks/useOnlineStatus');
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      // Simple mock translation function with pluralization support
      const translations: Record<string, string> = {
        'lists.title': 'Todo Lists',
        'lists.count': '{{count}} list',
        'lists.count_plural': '{{count}} lists',
        'lists.emptyState.title': 'Welcome to your Todo Lists!',
        'lists.emptyState.description': 'Get organized by creating your first todo list.',
        'lists.emptyState.createButton': 'Create Your First List',
        'lists.create.button': 'New List',
        'error': 'Something went wrong',
        'retry': 'Try again',
        'loading': 'Loading...',
      };
      
      // Handle pluralization
      if (key === 'lists.count' && options?.count) {
        const pluralKey = options.count === 1 ? 'lists.count' : 'lists.count_plural';
        return translations[pluralKey]?.replace(/\{\{(\w+)\}\}/g, (_, k) => options[k]);
      }
      
      return options ? translations[key]?.replace(/\{\{(\w+)\}\}/g, (_, k) => options[k]) : translations[key] || key;
    },
    i18n: { language: 'en' }
  })
}));

// Mock the components that we're not testing directly
jest.mock('../ListCard', () => {
  return function MockListCard({ list }: { list: TodoList }) {
    return <div data-testid={`list-card-${list.id}`}>{list.name}</div>;
  };
});

jest.mock('../EmptyListsState', () => {
  return function MockEmptyListsState({ onCreateList }: { onCreateList: (name: string) => Promise<void> }) {
    return (
      <div data-testid="empty-state">
        <button onClick={() => onCreateList('Test List')}>Create First List</button>
      </div>
    );
  };
});

jest.mock('../CreateListButton', () => {
  return function MockCreateListButton({ onCreateList }: { onCreateList: (name: string) => Promise<void> }) {
    return (
      <button onClick={() => onCreateList('New List')} data-testid="create-button">
        New List
      </button>
    );
  };
});

jest.mock('../OfflineBanner', () => ({
  OfflineBanner: function MockOfflineBanner() {
    return <div data-testid="offline-banner">You are offline</div>;
  }
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseListsQuery = useListsQuery as jest.MockedFunction<typeof useListsQuery>;
const mockUseCreateListMutation = useCreateListMutation as jest.MockedFunction<typeof useCreateListMutation>;
const mockUseOnlineStatus = useOnlineStatus as jest.MockedFunction<typeof useOnlineStatus>;

// Test data
const mockLists: TodoList[] = [
  {
    id: 'list1',
    name: 'Work Tasks',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    orderIndex: 2000,
    userId: 'demo',
    items: []
  },
  {
    id: 'list2',
    name: 'Personal Tasks',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    orderIndex: 1000,
    userId: 'demo',
    items: []
  },
];

// Helper function to create test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  
  Wrapper.displayName = 'TestQueryWrapper';
  
  return Wrapper;
}

describe('TodoListsOverview', () => {
  const mockMutateAsync = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      query: {},
      asPath: '/',
    } as any);

    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
    });

    mockUseCreateListMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  describe('Loading State', () => {
    test('should show loading skeleton when data is loading', () => {
      mockUseListsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(<TodoListsOverview />, { wrapper: createWrapper() });

      expect(screen.getByText('Todo Lists')).toBeInTheDocument();
      // Check for loading skeletons
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    test('should show empty state when no lists exist', () => {
      mockUseListsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(<TodoListsOverview />, { wrapper: createWrapper() });

      expect(screen.getByText('Todo Lists')).toBeInTheDocument();
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('Create First List')).toBeInTheDocument();
    });
  });

  describe('Lists Display', () => {
    test('should display lists when data is available', () => {
      mockUseListsQuery.mockReturnValue({
        data: mockLists,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(<TodoListsOverview />, { wrapper: createWrapper() });

      expect(screen.getByText('Todo Lists')).toBeInTheDocument();
      expect(screen.getByText('2 lists')).toBeInTheDocument();
      
      // Lists should be sorted by orderIndex descending (newest first)
      expect(screen.getByTestId('list-card-list1')).toBeInTheDocument(); // orderIndex: 2000
      expect(screen.getByTestId('list-card-list2')).toBeInTheDocument(); // orderIndex: 1000
      
      expect(screen.getByTestId('create-button')).toBeInTheDocument();
    });

    test('should show correct list count text', () => {
      // Test single list
      mockUseListsQuery.mockReturnValue({
        data: [mockLists[0]],
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { rerender } = render(<TodoListsOverview />, { wrapper: createWrapper() });
      expect(screen.getByText('1 list')).toBeInTheDocument();

      // Test multiple lists
      mockUseListsQuery.mockReturnValue({
        data: mockLists,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      rerender(<TodoListsOverview />);
      expect(screen.getByText('2 lists')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('should show error state when query fails', () => {
      const error = new Error('Network error');
      mockUseListsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error,
        refetch: mockRefetch,
      } as any);

      render(<TodoListsOverview />, { wrapper: createWrapper() });

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  describe('Offline Handling', () => {
    test('should show offline banner when offline', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
      });

      mockUseListsQuery.mockReturnValue({
        data: mockLists,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(<TodoListsOverview />, { wrapper: createWrapper() });

      expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    });

    test('should not show offline banner when online', () => {
      mockUseOnlineStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
      });

      mockUseListsQuery.mockReturnValue({
        data: mockLists,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(<TodoListsOverview />, { wrapper: createWrapper() });

      expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
    });
  });

  describe('List Creation', () => {
    test('should handle list creation successfully', async () => {
      mockUseListsQuery.mockReturnValue({
        data: mockLists,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      mockMutateAsync.mockResolvedValue({
        id: 'new-list',
        name: 'New List',
        orderIndex: 3000,
      });

      render(<TodoListsOverview />, { wrapper: createWrapper() });

      const createButton = screen.getByTestId('create-button');
      createButton.click();

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'New List',
          orderIndex: 3000, // Should be max(2000, 1000) + 1000
        });
      });
    });

    test('should handle empty list creation from empty state', async () => {
      mockUseListsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      mockMutateAsync.mockResolvedValue({
        id: 'first-list',
        name: 'Test List',
        orderIndex: 1000,
      });

      render(<TodoListsOverview />, { wrapper: createWrapper() });

      const createButton = screen.getByText('Create First List');
      createButton.click();

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Test List',
          orderIndex: 1000, // Should be max() + 1000 = 0 + 1000
        });
      });
    });
  });
});