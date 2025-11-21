/**
 * Base Application Error
 */
export class ApplicationError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends ApplicationError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends ApplicationError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends ApplicationError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends ApplicationError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

/**
 * 422 Unprocessable Entity
 */
export class ValidationError extends ApplicationError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends ApplicationError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends ApplicationError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
  }
}

/**
 * Express error handling middleware
 */
export function errorHandler(logger) {
  return (err, req, res, next) => {
    // Default to 500 if no statusCode is set
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    // Log error
    if (statusCode >= 500) {
      logger.error(message, {
        correlationId: req.headers['x-correlation-id'],
        error: err,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.warn(message, {
        correlationId: req.headers['x-correlation-id'],
        statusCode,
        path: req.path,
        method: req.method,
      });
    }

    // Send error response
    const response = {
      error: message,
      statusCode,
      correlationId: req.headers['x-correlation-id'],
    };

    // Include validation errors if present
    if (err.errors) {
      response.errors = err.errors;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(statusCode).json(response);
  };
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
