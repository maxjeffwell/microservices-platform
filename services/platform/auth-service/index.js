import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger, loggerMiddleware, responseLoggerMiddleware } from '@platform/logger';
import { errorHandler } from '@platform/errors';
import { correlationIdMiddleware, rateLimiter, healthCheck } from '@platform/middleware';
import { initializeSchema, testConnection } from './config/database.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;
const logger = createLogger('auth-service');

// Security middleware
app.use(helmet());

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging and correlation ID
app.use(correlationIdMiddleware);
app.use(loggerMiddleware(logger));
app.use(responseLoggerMiddleware(logger));

// Health check endpoint
app.get('/health', healthCheck('auth-service', '1.0.0'));

// Rate limiting
app.use(rateLimiter());

// Routes
app.use('/auth', authRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'auth-service',
    version: '1.1.0',
    status: 'running',
    endpoints: {
      health: '/health',
      // Authentication
      signup: 'POST /auth/signup',
      signin: 'POST /auth/signin',
      refresh: 'POST /auth/refresh',
      verify: 'POST /auth/verify',
      signout: 'POST /auth/signout',
      signoutAll: 'POST /auth/signout-all',
      // Password Reset
      forgotPassword: 'POST /auth/forgot-password',
      resetPassword: 'POST /auth/reset-password',
      validateResetToken: 'POST /auth/validate-reset-token',
      // Email Verification
      verifyEmail: 'POST /auth/verify-email',
      resendVerification: 'POST /auth/resend-verification',
      verificationStatus: 'POST /auth/verification-status',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler (must be last)
app.use(errorHandler(logger));

/**
 * Start server
 */
async function startServer() {
  try {
    logger.info('Starting Auth Service...');

    // Test database connection
    logger.info('Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Initialize database schema
    logger.info('Initializing database schema...');
    await initializeSchema();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`Auth Service listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Cleanup expired tokens every hour
    setInterval(async () => {
      try {
        const { default: RefreshToken } = await import('./models/RefreshToken.js');
        const { default: PasswordReset } = await import('./models/PasswordReset.js');

        await RefreshToken.deleteExpired();
        await PasswordReset.deleteExpired();
      } catch (error) {
        logger.error('Error cleaning up expired tokens', { error: error.message });
      }
    }, 60 * 60 * 1000); // 1 hour

  } catch (error) {
    logger.error('Failed to start Auth Service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
function setupGracefulShutdown() {
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Setup graceful shutdown
setupGracefulShutdown();

// Start the server
startServer();

export default app;
