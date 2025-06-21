# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Todo App MVP built as a monorepo with the following architecture:

- **Frontend**: Next.js + TypeScript + Tailwind CSS + shadcn/ui (Client-Side Rendering only)
- **Backend**: Node.js + Express.js + REST API + Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **State Management**: TanStack Query (React Query) with optimistic UI
- **Internationalization**: next-i18next (English/Polish)
- **Authentication**: Not implemented in MVP (uses `userId = 'demo'`)

## Project Structure

The project is organized as a pnpm monorepo:
- `apps/frontend/` - Next.js application using pages router
- `apps/backend/` - Express.js REST API server
- `packages/db/` - Shared Prisma database schema and client

## Data Model

Two main entities with specific constraints:
- `TodoList` with `orderIndex` for sorting (unique per user)
- `TodoItem` with `positionInList` for sorting within lists (unique per list)
- **Deletion behavior:**
  - Items: Immediate permanent deletion (no confirmation required)
  - Lists: Immediate permanent deletion with confirmation dialog (cascade to all items)
- **Gap indexing:** 1000-unit gaps with midpoint calculation and compaction when gaps < 10
- **Validation:** List names 1-100 chars, item titles 1-500 chars, HTML sanitized

## Key Features

- Multiple todo lists per user with drag-and-drop reordering
- Tasks sorted by completion status, then position
- Inline editing with validation (empty values rejected, character limits enforced)
- Optimistic UI with rollback on API failures
- Permanent deletion (items: no confirmation, lists: confirmation dialog)
- Mobile-responsive design with hamburger menu and long-press drag initiation
- Language switching (EN/PL) in settings with localized date formatting
- Offline handling: cached data display with "Connection lost" banner

## Development Workflow

## Development Commands

```bash
# Install dependencies for all workspaces
pnpm install

# Start all development servers
pnpm dev

# Build all workspaces for production
pnpm build

# Run linting across all workspaces
pnpm lint

# Run type checking across all workspaces
pnpm type-check

# Run unit tests across all workspaces
pnpm test

# Database operations (run from packages/db)
cd packages/db
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:migrate     # Create and run migrations
pnpm db:seed        # Seed with demo data
pnpm db:studio      # Open Prisma Studio
```

## Important Implementation Notes

- **Gap indexing:** Use 1000-unit gaps for `orderIndex` and `positionInList`, with midpoint calculation for insertions
- **Validation:** All text inputs must validate length limits and reject empty values with revert on failure
- **Error handling:** Use standardized JSON error format with specific codes (VALIDATION_ERROR, NOT_FOUND, INTERNAL_ERROR)
- **Deletion:** All deletions are permanent - no soft delete or undo functionality
- **Mobile drag-and-drop:** Long-press (500ms) to initiate, auto-scroll near screen edges
- **API responses:** Proper HTTP status codes (200, 201, 400, 404, 500) with descriptive messages
- **Offline behavior:** Show cached data, block actions, display connection banner
- Drag-and-drop between completed/incomplete sections automatically toggles `isCompleted`
- The UI should be generated via AI prompts and not manually modified after creation
- Mobile-first responsive design is critical for UX

## Git Commit Guidelines

- **NEVER mention Claude, AI tools, or AI assistance in commit messages**
- Keep commit messages professional and focused on the technical changes
- Use conventional commit format when appropriate

## Pull Request Workflow

- **ALWAYS create new feature branches** for pull requests (never commit directly to develop)
- **ALWAYS target develop branch** as the base for pull requests (never target main)
- Feature branch naming: `feature/descriptive-name` or `fix/issue-description`
- Example workflow:
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feature/new-feature-name
  # make changes and commits
  git push -u origin feature/new-feature-name
  gh pr create --base develop --title "..." --body "..."
  ```

## Environment Variables

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend (.env):**
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/todoapp
PORT=3001  # optional, defaults to 3001
```

## Browser Support

- Modern browsers only: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile: iOS Safari 14+, Chrome Mobile 90+
- No Internet Explorer support
- ES2020+ features used without polyfills

## Testing Requirements

- **MANDATORY:** All new business logic must include comprehensive unit tests
- **Test Coverage:** Aim for 80%+ code coverage on new functions and modules
- **Testing Framework:** Jest with TypeScript support for backend, Vitest for frontend
- **Test Types:** Unit tests for utilities/business logic, integration tests for API endpoints
- **Critical Areas:** Gap indexing, validation logic, error handling, database operations
- **Test First:** When implementing complex logic, write tests alongside or before implementation

## Additional notes

- All new features should be implemented along with unit tests verifying new logic.
- Newly added code should be provided with extensive comments targeting developer who doesn't have any experience with JavaScript, Node.js and Next.js.