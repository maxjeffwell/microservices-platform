import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, service, correlationId, ...metadata }) => {
  let msg = `${timestamp} [${service || 'platform'}] ${level}: ${message}`;

  if (correlationId) {
    msg += ` [correlationId: ${correlationId}]`;
  }

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

/**
 * Create a logger instance for a service
 * @param {string} serviceName - Name of the service
 * @param {string} logLevel - Log level (default: info)
 * @returns {winston.Logger}
 */
export function createLogger(serviceName, logLevel = process.env.LOG_LEVEL || 'info') {
  const logger = winston.createLogger({
    level: logLevel,
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    defaultMeta: { service: serviceName },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: combine(
          colorize(),
          logFormat
        ),
      }),
    ],
  });

  // Add file transport in production
  if (process.env.NODE_ENV === 'production') {
    logger.add(
      new winston.transports.File({
        filename: `logs/${serviceName}-error.log`,
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );

    logger.add(
      new winston.transports.File({
        filename: `logs/${serviceName}-combined.log`,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  return logger;
}

/**
 * Express middleware to add logger to request object
 * @param {winston.Logger} logger
 * @returns {Function}
 */
export function loggerMiddleware(logger) {
  return (req, res, next) => {
    req.logger = logger;

    // Log incoming request
    logger.info(`${req.method} ${req.path}`, {
      correlationId: req.headers['x-correlation-id'],
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    next();
  };
}

/**
 * Express middleware to log response
 * @param {winston.Logger} logger
 * @returns {Function}
 */
export function responseLoggerMiddleware(logger) {
  return (req, res, next) => {
    const startTime = Date.now();

    // Capture the original end function
    const originalEnd = res.end;

    res.end = function(...args) {
      const duration = Date.now() - startTime;

      logger.info(`${req.method} ${req.path} ${res.statusCode}`, {
        correlationId: req.headers['x-correlation-id'],
        duration: `${duration}ms`,
        statusCode: res.statusCode,
      });

      // Call the original end function
      originalEnd.apply(res, args);
    };

    next();
  };
}

// Create and export default logger instance
const logger = createLogger('platform');
export default logger;
