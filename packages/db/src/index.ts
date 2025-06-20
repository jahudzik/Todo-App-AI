import { PrismaClient } from '../generated/client';

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create a singleton Prisma client instance
// In development, use global variable to prevent multiple instances due to hot reloading
// In production, create new instance each time
export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Export Prisma types for use in other packages
export * from '../generated/client';