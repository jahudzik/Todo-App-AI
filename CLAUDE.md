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

- **CRITICAL: NEVER commit directly to develop or main branches**
- **ALWAYS create new feature branches** for pull requests (never commit directly to develop)
- **ALWAYS target develop branch** as the base for pull requests (never target main)
- **MANDATORY workflow for ALL changes:**
  1. Start from up-to-date develop: `git checkout develop && git pull origin develop`
  2. Create feature branch: `git checkout -b feature/descriptive-name`
  3. Make changes and commits on the feature branch
  4. Push feature branch: `git push -u origin feature/branch-name`
  5. Create PR: `gh pr create --base develop`
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

## Pre-PR Quality Checks

**MANDATORY: Before creating any PR, ALL of the following checks MUST pass:**

1. **Unit Tests**: `pnpm test` - All tests must pass
2. **Type Checking**: `pnpm type-check` - No TypeScript errors
3. **Linting**: `pnpm lint` - Clean ESLint results
4. **Build**: `pnpm build` - Successful production build

**If ANY check fails:**
- Fix the issues immediately
- Re-run all checks to ensure they pass
- Only then create the PR

**Auto-fix workflow:**
```bash
# Run all checks in sequence
pnpm test && pnpm type-check && pnpm lint && pnpm build

# If any fail, fix and retry until all pass
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

- **MANDATORY:** All new business logic must include comprehensive unit tests with 80%+ coverage
- **Test Coverage Standards:**
  - **Minimum 80% code coverage** for all new functions and modules
  - **100% coverage required** for critical business logic (gap indexing, validation, error handling)
  - **Line coverage, branch coverage, and function coverage** must all meet minimum thresholds
  - Use coverage reports to identify untested code paths and edge cases
- **Testing Framework:** Jest with TypeScript support for backend, Vitest for frontend
- **Test Types Required:**
  - **Unit tests:** All controller methods, utilities, business logic functions
  - **Integration tests:** API endpoints with database interactions
  - **Error path testing:** All validation errors, database errors, edge cases
  - **Boundary testing:** Input limits, edge values, constraint violations
- **Critical Areas Requiring 100% Coverage:**
  - Gap indexing algorithms and position calculations
  - Input validation and sanitization logic
  - Error handling and response formatting
  - Database operations and transaction logic
  - Authentication and authorization flows (when implemented)
- **Test Structure Requirements:**
  - **Comprehensive mocking** of all external dependencies
  - **Happy path testing** for all success scenarios
  - **Error path testing** for all failure scenarios
  - **Edge case testing** for boundary conditions
  - **Business logic verification** beyond just function calls
  - **Response format validation** for API endpoints
- **Test First Development:** When implementing complex logic, write tests alongside or before implementation
- **Coverage Verification:** Run coverage reports regularly and address any gaps below 80%

## API Testing and Documentation

**CRITICAL: The `api-tests.http` file must be maintained and validated after ALL API changes**

### api-tests.http Maintenance Requirements

1. **After any API endpoint changes (create, modify, delete endpoints):**
   - Update `api-tests.http` with comprehensive test cases for all new/modified endpoints
   - Include positive test cases (success scenarios)
   - Include negative test cases (validation errors, 404s, 400s, etc.)
   - Include edge cases and boundary testing
   - Test all HTTP methods (GET, POST, PATCH, DELETE)
   - Test all query parameters and request body variations

2. **Test case structure for each endpoint:**
   - Basic success case with valid data
   - Validation errors (empty fields, too long inputs, invalid formats)
   - Authentication/authorization errors (when applicable)
   - Not found errors (non-existent IDs)
   - Conflict errors (unique constraint violations)
   - Edge cases specific to the endpoint functionality

3. **Required test coverage:**
   - All CRUD operations for each resource
   - All endpoint variations (different query params, path params)
   - HTML sanitization testing (XSS prevention)
   - Input validation boundary testing
   - Error response format validation
   - Rate limiting tests (when applicable)

4. **File organization:**
   - Group related endpoints together with clear section headers
   - Include descriptive comments for each test case
   - Mark placeholder values clearly (e.g., "REPLACE_WITH_ACTUAL_ID")
   - Maintain consistent formatting and naming conventions

5. **Validation workflow:**
   - After updating `api-tests.http`, manually test key endpoints to ensure they work
   - Verify error responses match the documented error codes and formats
   - Check that all new endpoints are properly documented in the test file

**This ensures the API testing file remains a reliable reference for:**
- API documentation and usage examples
- Manual testing during development
- Integration testing scenarios
- Debugging and troubleshooting API issues

## Additional notes

- All new features should be implemented along with unit tests verifying new logic.
- Newly added code should be provided with extensive comments targeting developer who doesn't have any experience with JavaScript, Node.js and Next.js.