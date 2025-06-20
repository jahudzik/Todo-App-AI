# TODO App Code Generation Prompts

## Iteration 1: Project Setup

### Prompt 1: Initialize Monorepo
```text
Create a monorepo using pnpm workspaces with the following structure:
- `apps/frontend` for the Next.js frontend
- `apps/backend` for the Express.js backend
- `packages/db` for shared Prisma database schema

Set up `typescript`, `eslint`, and `prettier` in each workspace. Add a basic `README.md` to each folder. Configure `tsconfig.json` and workspace references for shared types and prisma client.

```

### Prompt 2: Setup Frontend (Next.js + Tailwind)
```text
In the `apps/frontend` folder, set up a Next.js project with TypeScript. Configure Tailwind CSS and remove all demo files. Use the `pages/` directory for routing (do not use the App Router). Create a base layout with a header and placeholder sidebar.

```

### Prompt 3: Setup next-i18next
```text
Set up `next-i18next` in the Next.js project. Configure English and Polish as supported languages. Detect the default language from the browser, but allow manual switching via the settings page. Create translation files:
- `public/locales/en/common.json`
- `public/locales/pl/common.json`

Wrap the app with `appWithTranslation` and configure `next-i18next.config.js`.

```

### Prompt 4: Define Prisma Models
```text
In `packages/db/schema.prisma`, define the following data models using Prisma:

model TodoList {
  id         String     @id @default(cuid())
  name       String
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  orderIndex Int        @default(0)
  userId     String?    @default("demo")
  items      TodoItem[]
  @@unique([userId, orderIndex])
}

model TodoItem {
  id             String   @id @default(cuid())
  listId         String
  title          String
  isCompleted    Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  positionInList Int      @default(0)
  list           TodoList @relation(fields: [listId], references: [id], onDelete: Cascade)
  @@unique([listId, positionInList])
}

Configure migration and generate the Prisma client. Create migration scripts and seed demo data.

```

### Prompt 5: Setup Backend with Express
```text
In the `apps/backend` folder, initialize an Express.js server using TypeScript. Add middlewares: `cors`, `express.json()`, and a basic `GET /ping` endpoint. Load `.env` for environment configuration. Connect Prisma Client and implement `GET /lists` to fetch all lists (with items) for `userId = 'demo'`.

```

## Iteration 2: REST API

### Prompt 6: List API Endpoints
```text
Implement the following endpoints in the backend:
- `GET /lists` - fetch all lists for user 'demo' (with nested items)
- `POST /lists` - create a new list with default name and highest orderIndex
- `PATCH /lists/:id` - update list name
- `DELETE /lists/:id` - soft-delete the list with a timeout to allow undo

```

### Prompt 7: Item API Endpoints
```text
Implement the following endpoints in the backend:
- `GET /items?listId=...` - fetch items for a given listId
- `POST /items` - create a new item with default positionInList
- `PATCH /items/:id` - update title or completion state
- `DELETE /items/:id` - soft-delete item
- `POST /undo-delete/:id` - restore item or list marked for deletion

```

## Iteration 3: Frontend - Lists

### Prompt 8: Display Todo Lists
```text
In the frontend, create a page to fetch and display all todo lists from `GET /lists`. Use TanStack Query for data fetching. Lists should be shown in descending order of `orderIndex`. Use `shadcn/ui` components.

```

### Prompt 9: Create & Edit Todo List
```text
Add functionality to create a new list (`POST /lists`). Add inline editing for list names using controlled components. On blur or Enter, update the name with `PATCH /lists/:id`. Show a toast and revert on empty name or backend failure.

```

### Prompt 10: Delete Todo List with Undo
```text
Implement deletion of a list (`DELETE /lists/:id`). Show a toast with "Undo" option for 5 seconds. If clicked, call `POST /undo-delete/:id`. Delay permanent deletion using timeout logic on backend. Re-fetch lists on delete/undo.

```

### Prompt 11: Navigate to List Detail
```text
Implement navigation to list detail at `/lists/:id`. Use Next.js router. Create a `ListPage` component that fetches the list and its items and renders them.

```

## Iteration 4: Frontend - Items

### Prompt 12: Display and Sort Items
```text
On the list detail page (`/lists/:id`), fetch items for the list. Display incomplete items first, sorted by `positionInList`, followed by completed items (also sorted). Use two sections: "Todo" and "Done".

```

### Prompt 13: Create, Edit, Complete Items
```text
Allow users to create new tasks for the list. Set `positionInList` to the highest + gap. Allow inline editing of titles. Toggle completion instantly with `PATCH /items/:id`. Use optimistic UI with rollback on failure.

```

### Prompt 14: Delete Items with Undo
```text
Allow deleting a task with undo support. Use the same logic as for lists (soft delete with timeout, undo toast, `POST /undo-delete/:id`). Re-fetch tasks after operation.

```

### Prompt 15: Drag and Drop Support
```text
Implement drag-and-drop to reorder tasks in the same section and move between "Todo" and "Done". Update `positionInList` and `isCompleted` on drop. Use a stable indexing algorithm and update state optimistically.

```

## Iteration 5: UX Polish & Settings

### Prompt 16: Optimistic UI and Error Handling
```text
Ensure all update operations (edit, toggle, reorder) use optimistic UI with rollback support. Show toast messages on failure. Prevent updates if input is empty.

```

### Prompt 17: Language Switcher and Translations
```text
Implement a settings page accessible from sidebar. Add a language switcher with support for `en` and `pl`. Update `i18n.language` via `next-i18next`. Confirm UI updates dynamically.

```

### Prompt 18: Sidebar and Routing
```text
Add a sidebar with two options: "Todo" and "Settings". Implement routing to switch between views. On small screens, show hamburger menu.

```

### Prompt 19: Mobile Friendly Layout
```text
Ensure all components are responsive. Use Tailwind responsive classes. Add a welcome screen if there are no lists, with illustration and CTA.

```

### Prompt 20: Component Integration & Final Wiring
```text
Ensure all parts of the app are connected. Lists and items fetch from backend, update state, show toasts, and reflect backend state. Verify no orphan components or disconnected flows remain.

```

