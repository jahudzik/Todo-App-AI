# Database Package

Shared Prisma database schema and client for the Todo App.

## Tech Stack

- **ORM**: Prisma with PostgreSQL
- **Client**: Generated Prisma client with TypeScript types

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Push schema to database (for development)
pnpm db:push

# Create and run migrations
pnpm db:migrate

# Reset database and run migrations
pnpm db:migrate:reset

# Seed database with demo data
pnpm db:seed

# Open Prisma Studio
pnpm db:studio

# Build TypeScript
pnpm build

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

## Schema

The database contains two main models:

- **TodoList**: Represents a todo list with ordering support
- **TodoItem**: Represents individual tasks within lists

Key features:
- Soft deletion support for undo functionality
- Gap indexing for stable drag-and-drop reordering
- Unique constraints to prevent ordering conflicts
- Cascade deletion from lists to items

## Usage

```typescript
import { prisma } from '@db';

// Get all lists for demo user
const lists = await prisma.todoList.findMany({
  where: { userId: 'demo' },
  include: { items: true },
  orderBy: { orderIndex: 'desc' }
});
```