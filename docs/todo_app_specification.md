### TODO App MVP Specification 

---

### Purpose of the Application

A simple, elegant, and modern web-based todo list application operating in a client-server model with persistent data storage in a database. The app supports creating, editing, and managing multiple task lists per user. Offline access is not required. The MVP will be fully mobile-friendly and support two languages (English and Polish), with easy extensibility for additional languages in the future.

---

### Technical Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- **Rendering**: Client-Side Rendering (CSR only) — no SSR/SSG/ISR planned
- **Backend**: Node.js + REST API + Prisma
- **Database**: PostgreSQL (e.g., Supabase)
- **Hosting**: Vercel (frontend/backend), Supabase (database)
- **Translations**: next-i18next with JSON files; default language detected from browser with option to manually switch in settings
- **Date/Time Formatting**: Use appropriate Intl APIs with language from i18n settings
  - Relative dates for recent items using `Intl.RelativeTimeFormat` ("2 hours ago" / "2 godziny temu")
  - Absolute dates for older items using `Intl.DateTimeFormat` (localized format: MM/DD/YYYY for EN, DD/MM/YYYY for PL)
  - Display creation dates in list cards and item metadata
- **State Management**: TanStack Query (React Query) with optimistic UI updates, automatic rollback, and comprehensive error handling
- **Authentication**: not in MVP; all data belongs to a single shared demo user (`userId = 'demo'`)
- **Design**: AI-generated UI refined via prompt engineering; not modified manually after creation

---

### MVP Features

#### Data Model (Prisma)

```ts
model TodoList {
  id           String     @id @default(cuid())
  name         String
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  orderIndex   Int        @default(0)
  userId       String     @default("demo")
  items        TodoItem[] @relation("ItemsOnList")

  @@unique([userId, orderIndex])
}

model TodoItem {
  id              String   @id @default(cuid())
  listId          String
  title           String
  isCompleted     Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  positionInList  Int      @default(0)

  list            TodoList @relation("ItemsOnList", fields: [listId], references: [id], onDelete: Cascade)

  @@unique([listId, positionInList])
}
```

Notes:
- `TodoList.name` validation: 1-100 characters, non-empty, HTML sanitized
- `TodoItem.title` validation: 1-500 characters, non-empty, HTML sanitized
- Empty names/titles rejected with validation and UI fallback to previous value
- `userId` defaults to `'demo'` in MVP
- All deletions are permanent (no soft delete or undo functionality)
- Unique constraints ensure stable sorting: no duplicate `orderIndex` or `positionInList` per user/list

#### Application Behavior

- Users can create multiple lists
- New lists appear at the top using gap indexing:
  - New list: `orderIndex = max(orderIndex) + 1000` (or 1000 if no lists exist)
  - Insert before existing: `orderIndex = target.orderIndex - 500`
  - Insert between: `orderIndex = (prev.orderIndex + next.orderIndex) / 2` (rounded)
  - Gap compaction triggered when gaps < 10 (reindex all with 1000 intervals)
- Clicking a list navigates to `/lists/:id`
- Each list can have zero or more tasks
- Tasks within a list are sorted:
  1. Incomplete tasks first (by `positionInList`)
  2. Completed tasks next (by `positionInList`)
- New tasks use gap indexing for `positionInList`:
  - New task: `positionInList = max(positionInList) + 1000` within section
  - Reordering: same midpoint/compaction logic as lists
- Editing allowed for list names and task titles
- Deleting behavior:
  - **Todo Items**: Immediate permanent deletion (no confirmation required)
    - Items are permanently removed immediately
    - No undo functionality
  - **Todo Lists**: Immediate permanent deletion with confirmation
    - Show confirmation dialog: "Are you sure? This will permanently delete the list and all its tasks."
    - Permanently removes list and all its items immediately
    - Uses Prisma's `onDelete: Cascade` for automatic cleanup
- Task completion toggling saves instantly
- Changes are saved onChange / onBlur / Enter:
  - Empty inputs revert to previous value with a toast notification
  - On backend error, previous value is restored and user can retry
- Drag-and-drop supported for:
  - Reordering tasks and lists (gap indexing with midpoint calculation or compaction applied)
  - Moving tasks between incomplete/completed sections (automatically toggles `isCompleted`)
  - Gap indexing ensures stable sorting during concurrent operations
  - **Mobile drag-and-drop:**
    - Long-press to initiate drag mode (500ms delay)
    - Auto-scroll when dragging near screen edges (top/bottom 100px)
    - Visual feedback during long-press (haptic feedback if available)
    - Touch-friendly drag handles and drop zones
- Identical task titles within one list are allowed

---

### UI/UX

- Minimalist, modern design (Tailwind + shadcn/ui)
- Sidebar with two options: "Todo" and "Settings"
- Mobile view includes hamburger menu and is designed to follow UX best practices
- Default landing: list of task lists
- **Empty States:**
  - No lists: Welcome/empty state illustration with CTA to add first list
  - Empty list: "No tasks yet. Add your first task above." with subtle illustration
  - All items completed: Show completed section only
  - Network offline: Show cached data with "Connection lost" banner at top
- Settings screen allows language switching (en/pl) only
- All views fully mobile-responsive

---

### Future Enhancements (Post-MVP)

- User authentication and list ownership (migrating `userId = 'demo'` to authenticated user accounts)
- Real-time collaboration with WebSockets and conflict resolution
- Mobile app (tech stack TBD)
- Extended list metadata: types with color coding (no tags/folders)
- No reminders, due dates, or notifications planned
- No shared lists or task checklists/repeatables planned

---

### Data Fetching Architecture

**TanStack Query Implementation:**
- **QueryClient Configuration**: Centralized setup with 5-minute stale time, 10-minute garbage collection, and intelligent retry logic
- **Custom Hooks**: Type-safe hooks for all CRUD operations with optimistic updates and automatic cache management
- **API Client**: Axios-based client with TypeScript interfaces, request/response interceptors, and standardized error handling
- **Optimistic Updates**: Immediate UI feedback for all mutations with automatic rollback on API failures
- **Cache Strategy**: Smart invalidation and background refetching with query key hierarchies
- **Development Tools**: React Query Devtools enabled in development environment only

**Error Boundary System:**
- **Global Error Boundary**: Catches unhandled React errors with user-friendly fallback UI and retry mechanisms
- **API Error Handling**: Standardized error parsing with toast notifications and graceful degradation
- **Input Validation**: Real-time validation with immediate feedback and revert on empty values
- **Network Error Detection**: Automatic offline detection with visual banners and action blocking

**Offline Support:**
- **Network Status Monitoring**: Real-time connectivity detection using navigator.onLine and periodic fetch verification
- **Offline Banner**: Translated banner (EN/PL) displayed when connection is lost with visual indicators
- **Cached Data Access**: Show cached TanStack Query data when offline with clear offline indicators
- **Action Blocking**: Disable form submissions and mutations with "Please check your connection" messages
- **Auto-Recovery**: Automatic re-enabling of features and retry of failed requests when connection is restored

---

### Error Handling

- **Backend**: proper HTTP status codes with descriptive messages
  - 404 Not Found: Item or list not found
  - **Standard Error Response Format:**
    ```json
    {
      "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message",
        "field": "fieldName" // optional, for validation errors
      }
    }
    ```
  - Common error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`
- **Input Validation**: 
  - List names: 1-100 characters, required
  - Item titles: 1-500 characters, required
  - HTML/XSS sanitization on all text inputs
  - Return 400 Bad Request for validation failures
- **Frontend**: user-facing error messages (toast, inline), rollback on optimistic update failure with retry option
- **Concurrency**: Last-write-wins approach (simple overwrite)
  - No conflict resolution UI needed for single-user environment
  - Optimistic UI updates with rollback on API failure
  - `updatedAt` timestamp updated on every change for audit trail
- **Performance**: Optimized for typical todo list usage
  - No pagination in MVP (load all lists and items)
  - Virtual scrolling available for lists with many items (100+ items)
  - All items within a list loaded at once (typical lists are manageable)
  - Performance monitoring for future scaling decisions

---

### Environment Variables

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend (.env):**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/todoapp
PORT=3001
```

**Notes:**
- `NEXT_PUBLIC_API_URL`: Backend API base URL (required for frontend)
- `DATABASE_URL`: PostgreSQL connection string (required for backend)  
- `PORT`: Backend server port (optional, defaults to 3001)
- No external API keys or secrets required for MVP

---

### Browser Compatibility

**Supported Browsers:**
- Chrome 90+ / Chromium-based browsers
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile: iOS Safari 14+, Chrome Mobile 90+

**Not Supported:**
- Internet Explorer (any version)
- Legacy browsers without ES2020+ support

---

### Offline Behavior

**Network Unavailable:**
- Show cached data from TanStack Query when possible
- Display "Connection lost" banner at top of screen
- Block user actions with "Please check your connection" message
- Disable form submissions and mutations

**Connection Restored:**
- Hide "Connection lost" banner
- Auto-retry failed requests
- Re-enable user actions
- Sync any queued TanStack Query operations

---

### Real-time Updates

**MVP Approach:**
- No WebSockets or real-time synchronization needed for single-user environment
- TanStack Query handles data freshness through background refetching
- Multiple browser tabs work independently (last-write-wins on conflicts)
- Automatic background sync when switching tabs or returning from idle

**Future Enhancement:**
- WebSocket integration for multi-user real-time collaboration
- Conflict resolution UI for concurrent edits
- Live cursors and presence indicators

---

### Testing Requirements

**Coverage Standards:**
- **Minimum 80% code coverage** for all new functions and modules
- **100% coverage required** for critical business logic (gap indexing, validation, error handling)
- **Line coverage, branch coverage, and function coverage** must all meet minimum thresholds

**Testing Framework:**
- **Backend**: Jest with comprehensive unit and integration testing (120+ tests currently)
- **Frontend**: Jest + React Testing Library + Vitest with custom hooks testing (75+ tests currently)
- **Test Environment**: jsdom for frontend, mocked Prisma for backend

**Test Types Required:**
- **Unit Tests**: All controller methods, utilities, business logic functions, custom hooks
- **Integration Tests**: API endpoints with database interactions, React Query hooks with API calls
- **Error Path Testing**: All validation errors, database errors, network failures, edge cases
- **Happy Path Testing**: All success scenarios with comprehensive user flow coverage
- **Component Testing**: React components with user interactions and state changes

**Critical Areas with 100% Coverage:**
- Gap indexing algorithms and position calculations
- Input validation and sanitization logic  
- Error handling and response formatting
- Database operations and transaction logic
- API client error interception and retry logic
- Offline detection and network status management

**Test Structure:**
- **Comprehensive Mocking**: All external dependencies (API calls, database, localStorage)
- **Optimistic Update Testing**: Verify UI updates and rollback scenarios
- **Error Scenario Testing**: Network failures, validation errors, server errors
- **Cache Management Testing**: Query invalidation, background refetching, stale data handling

**Manual Testing Checklist:**
- List/task CRUD operations with optimistic updates
- Status toggling with section movement
- Inline editing with validation and error handling
- Drag-and-drop sorting with gap indexing
- Network offline/online state transitions
- Language switching and localized content
- Error boundary triggering and recovery
- Mobile touch interactions and responsive design
