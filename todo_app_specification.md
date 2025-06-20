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
  userId       String?
  items        TodoItem[] @relation("ItemsOnList", cascadeOnDelete: true)

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

  list            TodoList @relation("ItemsOnList", fields: [listId], references: [id])

  @@unique([listId, positionInList])
}
```

Notes:
- `TodoList.name` must not be empty; empty names are rejected with validation and UI fallback to previous value
- `TodoItem.title` is required and must not be empty
- `userId` defaults to `'demo'` in MVP
- Unique constraints ensure stable sorting: no duplicate `orderIndex` or `positionInList` per user/list

#### Application Behavior

- Users can create multiple lists
- New lists appear at the top (using gap indexing; `orderIndex = max + gap`)
- Clicking a list navigates to `/lists/:id`
- Each list can have zero or more tasks
- Tasks within a list are sorted:
  1. Incomplete tasks first (by `positionInList`)
  2. Completed tasks next (by `positionInList`)
- New tasks get `positionInList = max(positionInList) + gap`
- Editing allowed for list names and task titles
- Deleting allowed for tasks and lists (with cascade delete)
- Deleted tasks/lists show undo toast (5 seconds):
  - Backend delays deletion (soft delete with timeout); restore possible via `POST /undo-delete/:id`
- Task completion toggling saves instantly
- Changes are saved onChange / onBlur / Enter:
  - Empty inputs revert to previous value with a toast notification
  - On backend error, previous value is restored and user can retry
- Drag-and-drop supported for:
  - Reordering tasks and lists (gap indexing applied)
  - Moving tasks between incomplete/completed sections (automatically toggles `isCompleted`)
- Identical task titles within one list are allowed

---

### UI/UX

- Minimalist, modern design (Tailwind + shadcn/ui)
- Sidebar with two options: "Todo" and "Settings"
- Mobile view includes hamburger menu and is designed to follow UX best practices
- Default landing: list of task lists
- If there are no lists, show welcome/empty state illustration with CTA to add first list
- Settings screen allows language switching (en/pl) only
- All views fully mobile-responsive

---

### Future Enhancements (Post-MVP)

- User authentication and list ownership (migrating `userId = 'demo'` to authenticated user accounts)
- Mobile app (tech stack TBD)
- Extended list metadata: types with color coding (no tags/folders)
- No reminders, due dates, or notifications planned
- No shared lists or task checklists/repeatables planned

---

### Error Handling

- **Backend**: proper HTTP status codes with descriptive messages
- **Frontend**: user-facing error messages (toast, inline), rollback on optimistic update failure with retry option

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
