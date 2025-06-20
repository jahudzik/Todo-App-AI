# Backend

Express.js backend API for the Todo App.

## Tech Stack

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Runtime**: Node.js
- **Development**: tsx for hot reloading

## Development

```bash
# Install dependencies
pnpm install

# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

## Project Structure

- `src/routes/` - API route definitions
- `src/controllers/` - Route handlers and business logic
- `src/middleware/` - Express middleware functions
- `src/utils/` - Utility functions
- `src/types/` - TypeScript type definitions

## API Endpoints

- `GET /ping` - Health check endpoint
- `GET /lists` - Get all todo lists
- `POST /lists` - Create new todo list
- `PATCH /lists/:id` - Update todo list
- `DELETE /lists/:id` - Delete todo list
- `GET /items?listId=...` - Get items for a list
- `POST /items` - Create new todo item
- `PATCH /items/:id` - Update todo item
- `DELETE /items/:id` - Delete todo item
- `POST /undo-delete/:id` - Restore deleted item/list