# Frontend

Next.js frontend application for the Todo App.

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Internationalization**: next-i18next (English/Polish)
- **Rendering**: Client-Side Rendering (CSR)

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

## Project Structure

- `src/pages/` - Next.js pages (using pages router)
- `src/components/` - Reusable React components
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions
- `src/types/` - TypeScript type definitions
- `src/styles/` - Global styles and Tailwind configuration
- `public/locales/` - Translation files for i18n