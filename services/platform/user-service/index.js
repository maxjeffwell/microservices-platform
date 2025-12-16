import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@platform/logger';
import { errorHandler } from '@platform/errors';
import { correlationIdMiddleware, healthCheck, requestLogger } from '@platform/middleware';
import { testConnection, initializeSchema } from './config/database.js';
import setupRoutes from './routes/index.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3002;
const logger = createLogger('user-service');

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request middleware
app.use(correlationIdMiddleware);
app.use(requestLogger);

// Health check endpoint
app.use('/health', healthCheck);

// API routes
setupRoutes(app);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handler
let server;
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

// Start server
async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await testConnection();

    // Initialize database schema
    logger.info('Initializing database schema...');
    await initializeSchema();

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`User service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
