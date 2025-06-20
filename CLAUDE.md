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
- Soft deletion with undo functionality (5-second timeout)
- Gap indexing used for stable sorting when reordering

## Key Features

- Multiple todo lists per user with drag-and-drop reordering
- Tasks sorted by completion status, then position
- Inline editing with validation (empty values rejected)
- Optimistic UI with rollback on API failures
- Undo deletion with toast notifications
- Mobile-responsive design with hamburger menu
- Language switching (EN/PL) in settings

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

# Database operations (run from packages/db)
cd packages/db
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:migrate     # Create and run migrations
pnpm db:seed        # Seed with demo data
pnpm db:studio      # Open Prisma Studio
```

## Important Implementation Notes

- Use gap indexing for `orderIndex` and `positionInList` to avoid conflicts during reordering
- All text inputs must validate against empty values and revert on failure
- API errors should show user-friendly toast messages and restore previous state
- Drag-and-drop between completed/incomplete sections automatically toggles `isCompleted`
- The UI should be generated via AI prompts and not manually modified after creation
- Mobile-first responsive design is critical for UX

## Git Commit Guidelines

- Do not mention Claude or AI tools in commit messages
- Keep commit messages professional and focused on the technical changes

## Additional notes

- All new features should be implemented along with unit tests verifying new logic.
- Newly added code should be provided with extensive comments targeting developer who doesn't have any experience with JavaScript, Node.js and Next.js.