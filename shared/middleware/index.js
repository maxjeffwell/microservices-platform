import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { validationResult } from 'express-validator';
import { UnauthorizedError } from '@platform/errors';

/**
 * Middleware to add correlation ID to each request
 * Uses existing x-correlation-id header or generates a new one
 */
export function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}

/**
 * Middleware to verify JWT token
 * @param {string} jwtSecret - JWT secret key
 * @returns {Function}
 */
export function authenticateToken(jwtSecret = process.env.JWT_SECRET) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return next(new UnauthorizedError('Access token required'));
    }

    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        return next(new UnauthorizedError('Invalid or expired token'));
      }

      req.user = user;
      next();
    });
  };
}

/**
 * Middleware to verify JWT token (optional - doesn't fail if no token)
 * @param {string} jwtSecret - JWT secret key
 * @returns {Function}
 */
export function optionalAuth(jwtSecret = process.env.JWT_SECRET) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    jwt.verify(token, jwtSecret, (err, user) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
  };
}

/**
 * Rate limiting middleware
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum number of requests per window
 * @returns {Function}
 */
export function rateLimiter(windowMs = 15 * 60 * 1000, max = 100) {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
}

/**
 * Middleware to check if user has required role
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function}
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Middleware to validate request against schema
 * Uses express-validator
 */
export { validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }

  next();
}

/**
 * Middleware for CORS configuration
 */
export function configureCORS(allowedOrigins = []) {
  return (req, res, next) => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-correlation-id');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  };
}

/**
 * Middleware to parse pagination parameters
 */
export function paginationMiddleware(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  req.pagination = {
    page,
    limit,
    offset,
  };

  next();
}

/**
 * Health check endpoint middleware
 */
export function healthCheck(serviceName, version = '1.0.0') {
  return (req, res) => {
    res.json({
      status: 'healthy',
      service: serviceName,
      version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  };
}
