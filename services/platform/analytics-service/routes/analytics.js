import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import * as eventService from '../services/eventService.js';
import * as metricService from '../services/metricService.js';
import { ValidationError } from '@platform/errors';
import logger from '@platform/logger';

const router = express.Router();

/**
 * Helper function to handle validation errors
 */
const handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
};

/**
 * POST /analytics/events
 * Track a single event
 */
router.post(
  '/events',
  [
    body('appId').notEmpty().withMessage('appId is required'),
    body('userId').notEmpty().withMessage('userId is required'),
    body('eventType').notEmpty().withMessage('eventType is required'),
    body('eventName').notEmpty().withMessage('eventName is required'),
    body('properties').optional().isObject().withMessage('properties must be an object'),
    body('async').optional().isBoolean().withMessage('async must be a boolean'),
  ],
  async (req, res, next) => {
    try {
      handleValidationErrors(req);

      const { async = false, ...eventData } = req.body;

      // Add request metadata
      eventData.userAgent = req.get('user-agent');
      eventData.ipAddress = req.ip;

      const result = await eventService.trackEvent(eventData, async);

      logger.info('Event tracked', {
        correlationId: req.correlationId,
        eventName: eventData.eventName,
        async,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /analytics/events/batch
 * Track multiple events in batch
 */
router.post(
  '/events/batch',
  [
    body().isArray().withMessage('Request body must be an array'),
    body('*.appId').notEmpty().withMessage('appId is required for all events'),
    body('*.userId').notEmpty().withMessage('userId is required for all events'),
    body('*.eventType').notEmpty().withMessage('eventType is required for all events'),
    body('*.eventName').notEmpty().withMessage('eventName is required for all events'),
  ],
  async (req, res, next) => {
    try {
      handleValidationErrors(req);

      const eventsData = req.body.map((event) => ({
        ...event,
        userAgent: req.get('user-agent'),
        ipAddress: req.ip,
      }));

      const result = await eventService.trackEventsBatch(eventsData);

      logger.info('Batch events tracked', {
        correlationId: req.correlationId,
        count: eventsData.length,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/users/:userId/events
 * Get events for a specific user
 */
router.get(
  '/users/:userId/events',
  [
    param('userId').notEmpty().withMessage('userId is required'),
    query('appId').optional().notEmpty(),
    query('eventType').optional().notEmpty(),
    query('eventName').optional().notEmpty(),
    query('startTime').optional().notEmpty(),
    query('endTime').optional().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit must be between 1 and 1000'),
  ],
  async (req, res, next) => {
    try {
      handleValidationErrors(req);

      const { userId } = req.params;
      const filters = {
        appId: req.query.appId,
        eventType: req.query.eventType,
        eventName: req.query.eventName,
        startTime: req.query.startTime,
        endTime: req.query.endTime,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 100,
      };

      const events = await eventService.getUserEvents(userId, filters);

      logger.info('User events retrieved', {
        correlationId: req.correlationId,
        userId,
        count: events.length,
      });

      res.status(200).json({
        userId,
        count: events.length,
        events,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /analytics/metrics
 * Record a single metric
 */
router.post(
  '/metrics',
  [
    body('appId').notEmpty().withMessage('appId is required'),
    body('metricName').notEmpty().withMessage('metricName is required'),
    body('metricType').notEmpty().withMessage('metricType is required'),
    body('value').isNumeric().withMessage('value must be a number'),
    body('unit').optional().notEmpty(),
    body('tags').optional().isObject().withMessage('tags must be an object'),
  ],
  async (req, res, next) => {
    try {
      handleValidationErrors(req);

      const metricData = req.body;
      const result = await metricService.recordMetric(metricData);

      logger.info('Metric recorded', {
        correlationId: req.correlationId,
        metricName: metricData.metricName,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /analytics/metrics/batch
 * Record multiple metrics in batch
 */
router.post(
  '/metrics/batch',
  [
    body().isArray().withMessage('Request body must be an array'),
    body('*.appId').notEmpty().withMessage('appId is required for all metrics'),
    body('*.metricName').notEmpty().withMessage('metricName is required for all metrics'),
    body('*.metricType').notEmpty().withMessage('metricType is required for all metrics'),
    body('*.value').isNumeric().withMessage('value must be a number for all metrics'),
  ],
  async (req, res, next) => {
    try {
      handleValidationErrors(req);

      const metricsData = req.body;
      const result = await metricService.recordMetricsBatch(metricsData);

      logger.info('Batch metrics recorded', {
        correlationId: req.correlationId,
        count: metricsData.length,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/metrics
 * Query metrics with filters
 */
router.get(
  '/metrics',
  [
    query('appId').optional().notEmpty(),
    query('metricName').optional().notEmpty(),
    query('metricType').optional().notEmpty(),
    query('startTime').optional().notEmpty(),
    query('endTime').optional().notEmpty(),
    query('aggregation').optional().isIn(['mean', 'sum', 'count', 'min', 'max', 'median']),
    query('window').optional().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('limit must be between 1 and 10000'),
  ],
  async (req, res, next) => {
    try {
      handleValidationErrors(req);

      const filters = {
        appId: req.query.appId,
        metricName: req.query.metricName,
        metricType: req.query.metricType,
        startTime: req.query.startTime,
        endTime: req.query.endTime,
        aggregation: req.query.aggregation,
        window: req.query.window,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 1000,
      };

      const metrics = await metricService.queryMetrics(filters);

      logger.info('Metrics queried', {
        correlationId: req.correlationId,
        count: metrics.length,
      });

      res.status(200).json({
        count: metrics.length,
        filters,
        metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /analytics/dashboards/:appId
 * Get dashboard data for an application
 */
router.get(
  '/dashboards/:appId',
  [
    param('appId').notEmpty().withMessage('appId is required'),
    query('startTime').optional().notEmpty(),
    query('endTime').optional().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      handleValidationErrors(req);

      const { appId } = req.params;
      const options = {
        startTime: req.query.startTime,
        endTime: req.query.endTime,
      };

      const dashboard = await metricService.getAppDashboard(appId, options);

      logger.info('Dashboard data retrieved', {
        correlationId: req.correlationId,
        appId,
      });

      res.status(200).json(dashboard);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
