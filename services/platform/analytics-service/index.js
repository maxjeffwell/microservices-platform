import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import analyticsRoutes from './routes/analytics.js';
import metabaseRoutes from './routes/metabase.js';
import { initInfluxDB, closeInfluxDB } from './config/influxdb.js';
import { initProducer, initConsumer, closeKafka } from './config/kafka.js';
import { startConsumer } from './services/kafkaConsumer.js';
import { errorHandler } from '@platform/errors';
import { correlationIdMiddleware, rateLimiter, healthCheck } from '@platform/middleware';
import logger from '@platform/logger';

const app = express();
const PORT = process.env.PORT || 3005;

/**
 * Middleware
 */
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(correlationIdMiddleware);

/**
 * Rate limiting
 */
app.use(
  rateLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  })
);

/**
 * Health check endpoint
 */
app.get('/health', healthCheck);

/**
 * API Routes
 */
app.use('/analytics', analyticsRoutes);
app.use('/metabase', metabaseRoutes);

/**
 * Error handling
 */
app.use(errorHandler);

/**
 * Initialize connections
 */
async function initialize() {
  try {
    // Initialize InfluxDB
    logger.info('Initializing InfluxDB connection...');
    initInfluxDB();

    // Initialize Kafka producer
    logger.info('Initializing Kafka producer...');
    await initProducer();

    // Initialize Kafka consumer
    logger.info('Initializing Kafka consumer...');
    await initConsumer();

    // Start consuming events from Kafka
    logger.info('Starting Kafka event consumer...');
    await startConsumer();

    logger.info('All connections initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize connections', { error: error.message });
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down gracefully...');

  try {
    // Close Kafka connections
    await closeKafka();

    // Close InfluxDB connection
    await closeInfluxDB();

    logger.info('All connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * Start server
 */
async function startServer() {
  try {
    // Initialize all connections first
    await initialize();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Analytics Service running on port ${PORT}`, {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: PORT,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();

export default app;
