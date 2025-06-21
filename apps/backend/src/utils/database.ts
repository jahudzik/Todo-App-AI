import { PrismaClient } from '@db';
import { logger } from './logger';

// Create a global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Initialize Prisma client with singleton pattern for development hot reloading
export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// In development, store the client globally to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * Test database connection by performing a simple query
 * Throws an error if the connection fails
 */
export async function connectDatabase(): Promise<void> {
  try {
    logger.info('Attempting to connect to database...');
    logger.info('Database URL configured:', process.env.DATABASE_URL ? 'Yes' : 'No');
    
    // Test the database connection with a timeout
    const connectionPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
    });
    
    await Promise.race([connectionPromise, timeoutPromise]);
    logger.info('✅ Database connection test successful');
  } catch (error) {
    logger.error('❌ Failed to connect to database:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gracefully disconnect from the database
 * Should be called when the application is shutting down
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

// Handle process termination gracefully
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

export { prisma as db };