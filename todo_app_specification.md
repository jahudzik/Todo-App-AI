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
- **Date/Time Formatting**: Use `Intl.DateTimeFormat` with language from i18n settings
  - Relative dates for recent items ("2 hours ago" / "2 godziny temu")
  - Absolute dates for older items (localized format: MM/DD/YYYY for EN, DD/MM/YYYY for PL)
  - Display creation dates in list cards and item metadata
- **State Management**: TanStack Query (React Query) with optimistic UI or refetch
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
  isDeleted    Boolean    @default(false)
  deletedAt    DateTime?
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
  isDeleted       Boolean  @default(false)
  deletedAt       DateTime?

  list            TodoList @relation("ItemsOnList", fields: [listId], references: [id], onDelete: Cascade)

  @@unique([listId, positionInList])
}
```

Notes:
- `TodoList.name` validation: 1-100 characters, non-empty, HTML sanitized
- `TodoItem.title` validation: 1-500 characters, non-empty, HTML sanitized
- Empty names/titles rejected with validation and UI fallback to previous value
- `userId` defaults to `'demo'` in MVP
- Soft delete fields: `isDeleted` (Boolean, default false) and `deletedAt` (DateTime, nullable)
  - **Items only**: Soft delete used for TodoItem with undo functionality
  - **Lists**: Soft delete fields present but not used (immediate cascade delete applied)
- Unique constraints ensure stable sorting: no duplicate `orderIndex` or `positionInList` per user/list (excluding soft-deleted items)
- Default item queries exclude soft-deleted items using `WHERE isDeleted = false`

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
  - **Todo Items**: Soft delete with 5-second undo functionality
    - Backend marks items as deleted (`isDeleted = true`, `deletedAt = now()`)
    - Items excluded from normal queries but can be restored via `POST /undo-delete/:id` (using original item ID)
    - Background cleanup job permanently removes items after timeout expires
    - Show undo toast notification for 5 seconds
    - Undo endpoint returns 410 Gone if 5-second window has expired
    - Frontend handles timeout client-side (disable undo button after 5s)
  - **Todo Lists**: Immediate cascade delete (no undo)
    - Permanently removes list and all its items immediately
    - Uses Prisma's `onDelete: Cascade` for automatic cleanup
    - Show confirmation dialog before deletion
    - No soft delete fields used for lists (kept for future features)
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
  - All items completed: Show completed section with "Clear completed" option
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

### Error Handling

- **Backend**: proper HTTP status codes with descriptive messages
  - 410 Gone: Undo window expired for soft-deleted items
  - 404 Not Found: Item not found or not in deleted state
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
  - Common error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `UNDO_EXPIRED`, `INTERNAL_ERROR`
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

### Testing Plan

- Backend: unit tests (e.g., with Vitest or Jest)
- Frontend: component tests (e.g., React Testing Library)
- E2E tests (optional, e.g., Playwright)
- Manual tests:
  - list/task CRUD
  - status toggle
  - live editing
  - drag-and-drop sorting
  - undo deletion
  - language switching
