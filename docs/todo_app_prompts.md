# TODO App Code Generation Prompts

## 📊 Overall Implementation Status

**✅ COMPLETED (6/16 prompts):**
- ✅ Prompt 1: Express.js backend setup with TypeScript
- ✅ Prompt 2: Todo List API endpoints with gap indexing  
- ✅ Prompt 3: Todo Item API endpoints with CRUD operations
- ✅ Prompt 4: TanStack Query setup with API integration
- ✅ Prompt 11: Enhanced error handling and user feedback
- ✅ Prompt 14: Comprehensive testing implementation (backend + data layer)

**🟡 IN PROGRESS (0/16 prompts):**
- None currently

**⏳ PENDING (10/16 prompts):**
- Prompt 5: Todo Lists Management Page
- Prompt 6: List Management Features  
- Prompt 7: List Detail Page and Navigation
- Prompt 8: Todo Items Display and Management
- Prompt 9: Item Actions and Deletion
- Prompt 10: Drag and Drop Functionality
- Prompt 12: Mobile Responsiveness and Accessibility
- Prompt 13: Advanced UI Components and Animations
- Prompt 15: Production Deployment and Monitoring
- Prompt 16: Documentation and Developer Experience

---

## ✅ Completed Setup Phase
The following have been implemented:
- ✅ Monorepo with pnpm workspaces (apps/frontend, apps/backend, packages/db)
- ✅ Next.js frontend with TypeScript and Tailwind CSS
- ✅ Responsive layout with header and sidebar navigation
- ✅ next-i18next configuration with EN/PL languages and manual switching
- ✅ Prisma schema with TodoList and TodoItem models
- ✅ Basic project structure and development tooling
- ✅ Express.js backend with TypeScript and comprehensive API endpoints
- ✅ Complete CRUD operations for lists and items with gap indexing
- ✅ Unit testing infrastructure with 80%+ coverage (195 total tests)
- ✅ TanStack Query data fetching layer with optimistic updates
- ✅ Global error handling with error boundaries and offline support
- ✅ Comprehensive testing for all data fetching hooks and components

## ✅ Iteration 1: Backend API Implementation - COMPLETED

### ✅ Prompt 1: Setup Backend with Express - COMPLETED
```text
In the `apps/backend` folder, initialize an Express.js server using TypeScript. Set up the following:

1. **Basic Server Setup:**
   - Express server with TypeScript
   - Environment configuration with dotenv
   - CORS middleware for frontend communication
   - JSON body parser middleware
   - Error handling middleware

2. **Database Integration:**
   - Connect Prisma Client (@db package)
   - Create database connection utilities
   - Set up environment variables for DATABASE_URL
   - Handle missing DATABASE_URL with clear error message
   - Optional PORT environment variable (default: 3001)

3. **Initial Endpoints:**
   - `GET /ping` - health check endpoint
   - `GET /lists` - fetch all lists for userId='demo' with nested items
   - Basic error handling and logging

4. **Development Setup:**
   - Configure tsx for hot reloading
   - Set up proper TypeScript paths for @db imports
   - Create start scripts for development and production

```

### ✅ Prompt 2: Implement Todo List API Endpoints - COMPLETED
```text
Create complete CRUD operations for todo lists in the backend:

1. **List Management Endpoints:**
   - `GET /lists` - fetch all lists for user 'demo' (with nested items) ordered by orderIndex DESC
   - `POST /lists` - create a new list with default name "New List" and highest orderIndex using gap indexing
   - `PATCH /lists/:id` - update list name (validate non-empty, return 400 if empty)
   - `DELETE /lists/:id` - permanently delete the list and all its items (immediate cascade delete via Prisma)
   - No undo functionality for list deletion (items are also permanently removed)

2. **Gap Indexing Logic:**
   - Implement gap indexing for orderIndex using 1000 as standard gap size
   - New items: `orderIndex = max(orderIndex) + 1000` (or 1000 if no items exist)
   - Insert between items: `orderIndex = Math.floor((prev.orderIndex + next.orderIndex) / 2)`
   - Insert before first: `orderIndex = first.orderIndex - 500`
   - Gap compaction: when calculated gap < 10, reindex all items with 1000 intervals
   - Helper function to calculate next available position for any insertion scenario

3. **Delete Behavior:**
   - **Lists**: Immediate permanent deletion using `prisma.todoList.delete()` - automatically cascades to items
   - **Items**: Immediate permanent deletion using `prisma.todoItem.delete()`
   - All deletions are terminal - no soft delete or undo functionality
   - No background cleanup jobs needed

4. **Error Handling and Validation:**
   - Proper HTTP status codes (200, 201, 400, 404, 500)
   - Standard JSON error response format:
     ```json
     {
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "List name must be between 1 and 100 characters",
         "field": "name"
       }
     }
     ```
   - Input validation:
     - List names: 1-100 characters, trim whitespace, HTML sanitization
     - Return 400 with structured validation error messages
     - Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`

```

### ✅ Prompt 3: Implement Todo Item API Endpoints - COMPLETED
```text
Create complete CRUD operations for todo items within lists:

1. **Item Management Endpoints:**
   - `GET /items?listId=:listId` - fetch items for a specific list, sorted by completion status and positionInList
   - `POST /items` - create new item with title, listId, and calculated positionInList using gap indexing
   - `PATCH /items/:id` - update item title, completion status, or position
   - `DELETE /items/:id` - permanently delete item using `prisma.todoItem.delete()`
   - `POST /items/:id/toggle` - toggle completion status instantly

2. **Advanced Item Operations:**
   - `PATCH /items/:id/move` - update positionInList for drag-and-drop reordering
   - `PATCH /items/:id/move-section` - move between "Todo" and "Done" sections (auto-toggle isCompleted)
   - Batch operations for multiple item updates

3. **Sorting and Positioning:**
   - Implement gap indexing for positionInList within each list using same 1000-gap logic as lists
   - Sort items: incomplete first (by positionInList), then completed (by positionInList)
   - Handle reordering with stable position calculations (midpoint algorithm + compaction)
   - When moving between sections (todo/done), recalculate position within target section
   - Batch position updates for efficient reordering operations

4. **Validation and Business Logic:**
   - Item title validation: 1-500 characters, trim whitespace, HTML sanitization
   - Ensure listId exists before creating items
   - Prevent orphaned items when lists are deleted (cascade handled by Prisma)
   - Return 400 Bad Request using standard error format for validation failures
   - Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`
   - XSS protection for all text inputs

```

## ✅ Iteration 2: Frontend Data Layer - PARTIALLY COMPLETED

### ✅ Prompt 4: Setup TanStack Query and API Integration - COMPLETED
```text
Set up the data fetching layer for the frontend:

1. **TanStack Query Configuration:**
   - Install and configure @tanstack/react-query
   - Set up QueryClient with proper defaults (staleTime, cacheTime, retry logic)
   - Create QueryClientProvider in _app.tsx
   - Add React Query Devtools for development

2. **API Client Setup:**
   - Create centralized API client with axios or fetch
   - Configure base URL from environment variables (NEXT_PUBLIC_API_URL)
   - Add request/response interceptors for error handling
   - Type-safe API methods with TypeScript
   - Handle missing environment variables with clear error messages

3. **Custom Hooks for Data Fetching:**
   - `useListsQuery()` - fetch all lists with optimistic updates
   - `useListQuery(id)` - fetch single list with items
   - `useCreateListMutation()` - create new list with optimistic updates
   - `useUpdateListMutation()` - update list name with validation
   - `useDeleteListMutation()` - permanent deletion

4. **Error Handling and Loading States:**
   - Global error boundary for unhandled errors
   - Toast notifications for user feedback using standardized error messages
   - Parse error responses with `error.code` and `error.message` fields
   - Loading skeletons and spinners
   - **Offline handling:**
     - Network offline detection with "Connection lost" banner at top
     - Show cached TanStack Query data when offline
     - Block user actions with "Please check your connection" message
     - Auto-retry and re-enable actions when connection restored
   - Handle specific error codes (VALIDATION_ERROR, NOT_FOUND, INTERNAL_ERROR)

```

### Prompt 5: Create Todo Lists Management Page
```text
Implement the main todo lists overview page:

1. **Lists Display Component:**
   - Fetch and display all lists using TanStack Query
   - Show lists in descending order of orderIndex (newest first)
   - Use shadcn/ui components for consistent styling
   - Responsive grid/list layout for mobile and desktop

2. **Empty State Handling:**
   - Show welcome screen when no lists exist
   - Include illustration and clear CTA to create first list
   - Friendly messaging to guide new users
   - Handle network offline state with cached data and connection banner

3. **List Card Component:**
   - Display list name, creation date (localized format), and item count
   - Show preview of first few items
   - Click to navigate to list detail page
   - Visual indicators for list status
   - Use relative dates for recent lists ("2 hours ago"), absolute for older ones

4. **Create New List Functionality:**
   - "Add New List" button with icon
   - Optimistic UI updates (show new list immediately)
   - Handle loading states and error feedback
   - Focus on title input after creation

5. **Performance Optimization:**
   - Implement virtual scrolling for large lists (100+ items)
   - Memoize components to prevent unnecessary re-renders
   - Efficient re-fetching strategies
   - Load all lists without pagination in MVP
   - Monitor performance for future scaling needs

```

### Prompt 6: Implement List Management Features
```text
Add comprehensive list management functionality:

1. **Inline Editing for List Names:**
   - Click list title to enter edit mode
   - Auto-save on blur, Enter key, or after delay
   - Show loading indicator during save
   - Revert to previous value on empty input or error
   - Escape key to cancel editing

2. **List Deletion (Permanent):**
   - Delete button with confirmation dialog (required)
   - Permanent deletion - no undo functionality
   - Remove from UI immediately after successful deletion
   - Show confirmation: "Are you sure? This will permanently delete the list and all its tasks."
   - Proper error handling if deletion fails

3. **List Reordering (Drag and Drop):**
   - Implement drag-and-drop using @dnd-kit or similar
   - Visual feedback during drag (placeholder, ghost)
   - Update orderIndex using gap indexing
   - Optimistic updates with rollback on failure
   - **Mobile touch interactions:**
     - Long-press (500ms) to initiate drag mode
     - Auto-scroll when dragging within 100px of screen edges
     - Haptic feedback on drag initiation (if available)
     - Touch-friendly drop zones and visual indicators

4. **List Actions Menu:**
   - Dropdown menu for each list (rename, duplicate, delete)
   - Keyboard shortcuts for power users
   - Bulk operations for multiple lists

```

### Prompt 7: Create List Detail Page and Navigation
```text
Implement the individual list detail page:

1. **Dynamic Routing Setup:**
   - Create `/lists/[id].tsx` dynamic route
   - Implement proper SSG/ISR for SEO if needed
   - Handle invalid list IDs with 404 pages
   - Breadcrumb navigation back to lists overview

2. **List Header Component:**
   - Editable list title with inline editing
   - List metadata (creation date with localized formatting, item count, completion stats)
   - List actions (rename, delete, share settings for future)
   - Navigation back to lists overview
   - Use Intl.DateTimeFormat for proper locale-specific date display

3. **Items Display Structure:**
   - Two distinct sections: "Todo" (incomplete) and "Done" (completed)
   - Items sorted by positionInList within each section
   - Section headers with item counts
   - Collapsible completed section

4. **Loading and Error States:**
   - Skeleton loading for list and items
   - Error boundary for list not found
   - Empty list state: "No tasks yet. Add your first task above."
   - All completed state: Show completed section only
   - Retry mechanisms for failed data fetching
   - Graceful degradation for slow connections

```

## Iteration 3: Todo Items Management

### Prompt 8: Implement Todo Items Display and Management
```text
Create comprehensive todo item management within lists:

1. **Item Display Components:**
   - TodoItem component with checkbox, title, and actions
   - Responsive design for mobile and desktop
   - Visual distinction between completed and incomplete items
   - Hover states and interactive feedback

2. **Item Creation:**
   - "Add new task" input at top of todo section
   - Enter key to create, auto-focus for quick entry
   - Calculate positionInList using gap indexing (highest + 1000)
   - Optimistic UI updates with error rollback
   - Character limit and validation feedback

3. **Item Status Management:**
   - Instant checkbox toggle for completion status
   - Smooth animations when moving between sections
   - Optimistic updates with network sync
   - Visual feedback for loading states
   - Undo/redo functionality for accidental toggles

4. **Inline Editing for Item Titles:**
   - Double-click or dedicated edit button to enter edit mode
   - Auto-save on blur, Enter, or after short delay
   - Escape to cancel, validation for empty titles
   - Real-time character count and limits
   - Debounced API calls to reduce server load

```

### Prompt 9: Implement Item Actions and Deletion
```text
Add comprehensive item management actions:

1. **Item Deletion (Permanent):**
   - Delete button without confirmation required
   - Immediate permanent deletion
   - Optimistic removal from UI
   - Proper error handling if deletion fails

2. **Item Actions Menu:**
   - Right-click context menu or dedicated actions button
   - Options: Edit, Duplicate, Move to another list, Delete
   - Keyboard shortcuts for power users (Del, Ctrl+D, etc.)
   - Batch selection for multiple items

3. **Item Search and Filtering:**
   - Search input to filter items by title
   - Filter options: All, Active, Completed
   - Keyboard shortcuts for common filters
   - Clear search and filter states

4. **Item Metadata and Details:**
   - Creation and completion timestamps with localized formatting
   - Use relative dates for recent items, absolute for older ones
   - Intl.DateTimeFormat for proper locale support (EN/PL)
   - Optional notes or descriptions (future feature preparation)
   - Tags or categories (future feature preparation)
   - Item statistics and history

```

### Prompt 10: Implement Drag and Drop Functionality
```text
Add advanced drag-and-drop capabilities for item management:

1. **Drag and Drop Setup:**
   - Install and configure @dnd-kit library
   - Create draggable item components with proper accessibility
   - Implement drop zones for both "Todo" and "Done" sections
   - Visual feedback during drag operations (ghost, placeholder)

2. **Reordering Within Sections:**
   - Drag items to reorder within "Todo" or "Done" sections
   - Update positionInList using gap indexing algorithm
   - Smooth animations for item movements
   - Handle edge cases (dragging to first/last position)

3. **Moving Between Sections:**
   - Drag incomplete items to "Done" section (auto-complete)
   - Drag completed items to "Todo" section (auto-uncomplete)
   - Visual cues for valid drop zones
   - Confirmation for important state changes

4. **Advanced Drag Features:**
   - Multi-item selection and drag
   - Drag to delete (with confirmation)
   - Drag items between different lists (future feature)
   - **Touch/mobile support:**
     - Long-press (500ms) to initiate drag
     - Auto-scroll when dragging near screen edges (100px threshold)
     - Haptic feedback and visual cues for mobile users
   - Keyboard accessibility for drag operations

5. **Performance and UX:**
   - Optimistic updates with server sync
   - Rollback on API failures
   - Debounced position updates
   - Smooth animations and transitions

```

## Iteration 4: UI/UX Polish and Enhancement

### ✅ Prompt 11: Enhanced Error Handling and User Feedback - COMPLETED
```text
Implement comprehensive error handling and user feedback systems:

1. **Global Error Handling:**
   - Error boundary components for unhandled React errors
   - Global error interceptors for API calls
   - Automatic retry mechanisms with exponential backoff
   - Graceful degradation for offline scenarios

2. **User Feedback Systems:**
   - Toast notification system for success/error messages
   - Loading skeletons for all data fetching operations
   - Progress indicators for long-running operations
   - Form validation with real-time feedback

3. **Optimistic UI Implementation:**
   - Immediate UI updates for all user actions
   - Rollback mechanisms when API calls fail
   - Last-write-wins concurrency (no conflict resolution needed for single user)
   - Visual indicators for pending operations
   - Update `updatedAt` timestamps for audit trail

4. **Input Validation and Sanitization:**
   - Client-side validation before API calls:
     - List names: 1-100 characters with real-time feedback
     - Item titles: 1-500 characters with character counter
   - Empty input prevention with user feedback
   - HTML sanitization to prevent XSS attacks
   - Show validation errors inline with helpful messages

```

### Prompt 12: Mobile Responsiveness and Accessibility
```text
Enhance mobile experience and accessibility compliance:

1. **Mobile-First Responsive Design:**
   - Optimize all components for mobile devices
   - Touch-friendly interaction areas (44px minimum)
   - Swipe gestures for common actions
   - Mobile-specific navigation patterns

2. **Accessibility Implementation:**
   - ARIA labels and descriptions for all interactive elements
   - Keyboard navigation support throughout the app
   - Screen reader compatibility
   - High contrast mode support
   - Focus management for dynamic content

3. **Performance Optimization:**
   - Code splitting for faster initial load
   - Image optimization and lazy loading
   - Bundle size optimization
   - Virtual scrolling for lists with 100+ items
   - No pagination needed in MVP (load all data)
   - Target modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
   - Use ES2020+ features without polyfills
   - Progressive Web App features (optional)

4. **Touch and Gesture Support:**
   - Swipe to delete items
   - Pull to refresh functionality
   - Long press (500ms) for drag initiation and context menus
   - Auto-scroll during drag near screen edges
   - Pinch to zoom for accessibility
   - Haptic feedback for touch interactions

```

### Prompt 13: Advanced UI Components and Animations
```text
Implement advanced UI components with smooth animations:

1. **Animation System:**
   - Smooth transitions for all state changes
   - Loading animations and micro-interactions
   - Page transitions using Framer Motion or similar
   - Stagger animations for list items

2. **Advanced Components:**
   - Confirmation modals with proper focus management
   - Dropdown menus with keyboard navigation
   - Progress bars for bulk operations
   - Advanced search with filters and sorting

3. **Theme and Styling:**
   - Consistent design system with Tailwind
   - Dark mode support (future feature preparation)
   - Custom color schemes and branding
   - Print styles for todo lists

4. **Data Visualization:**
   - Progress charts for list completion
   - Statistics dashboard for productivity insights
   - Visual indicators for overdue items (future feature)
   - Export functionality for lists and items

```

## Iteration 5: Testing and Production Readiness

### Prompt 14: Comprehensive Testing Implementation
```text
Implement thorough testing across the application:

1. **Backend Testing:**
   - Unit tests for all API endpoints using Jest/Vitest
   - Integration tests for database operations
   - API contract testing with Prisma
   - Error handling and edge case testing

2. **Frontend Testing:**
   - Component testing with React Testing Library
   - Hook testing for custom TanStack Query hooks
   - Integration testing for complete user flows
   - Visual regression testing with Chromatic/Percy

3. **End-to-End Testing:**
   - E2E tests using Playwright covering critical user journeys
   - Cross-browser compatibility testing
   - Mobile device testing
   - Performance testing and optimization

4. **Testing Infrastructure:**
   - CI/CD pipeline with automated testing
   - Test data factories and fixtures
   - Mock API server for frontend testing
   - Database seeding for consistent test environments

```

### Prompt 15: Production Deployment and Monitoring
```text
Prepare the application for production deployment:

1. **Database Setup and Migrations:**
   - Production database configuration
   - Migration scripts and deployment strategy
   - Data backup and recovery procedures
   - Database performance optimization

2. **Environment Configuration:**
   - Production environment variables setup:
     - Frontend: NEXT_PUBLIC_API_URL
     - Backend: DATABASE_URL, PORT (optional)
   - Security headers and CORS configuration
   - SSL/TLS configuration
   - Rate limiting and API protection

3. **Deployment Strategy:**
   - Docker containerization for both frontend and backend
   - Vercel deployment for frontend with proper build configuration
   - Backend deployment (Railway, Render, or similar)
   - Database hosting with Supabase or similar

4. **Monitoring and Analytics:**
   - Error tracking with Sentry or similar
   - Performance monitoring and alerts
   - User analytics and usage tracking
   - Health check endpoints and uptime monitoring

```

### Prompt 16: Documentation and Developer Experience
```text
Create comprehensive documentation and improve developer experience:

1. **Code Documentation:**
   - JSDoc comments for all functions and components
   - README files for each workspace
   - API documentation with examples
   - Architecture decision records (ADRs)

2. **Developer Tools:**
   - ESLint and Prettier configuration refinement
   - Pre-commit hooks with Husky
   - Development scripts and utilities
   - Local development environment setup guide

3. **User Documentation:**
   - User guide for the todo application
   - Feature documentation with screenshots
   - Troubleshooting guide
   - Accessibility guide for users

4. **Deployment Documentation:**
   - Step-by-step deployment guide
   - Environment setup instructions
   - Backup and recovery procedures
   - Scaling and maintenance guidelines

```

