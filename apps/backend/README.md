# Backend

Express.js backend API for the Todo App.

## Tech Stack

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Runtime**: Node.js
- **Development**: tsx for hot reloading

## Environment Setup

Before running the backend, configure environment variables:

```bash
# Copy the example environment file (from project root)
cp ../../.env.example ../../.env

# Edit .env with your configuration:
# - DATABASE_URL: PostgreSQL connection string
#   Example: "postgresql://username:password@localhost:5432/todo_app_db"
# - PORT: Backend server port (default: 3001)
# - NODE_ENV: Environment mode (development/production)
```

Required environment variables:
- **DATABASE_URL**: PostgreSQL database connection string
- **PORT**: Port number for the Express server (defaults to 3001)
- **NODE_ENV**: Environment mode for logging and optimization

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