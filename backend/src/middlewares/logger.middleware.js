const logger = require('../utils/logger');

/**
 * Request logging middleware
 * Records request method, path, status code, and response time
 * Requirements: 12.2
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log after response
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Log request details
    const logData = {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId || null,
    };

    // Choose log level based on status code
    if (res.statusCode >= 500) {
      logger.error('Request completed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed', logData);
    } else {
      logger.info('Request completed', logData);
    }

    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Simple request logger (logs at start of request)
 * Useful for debugging
 */
const simpleLogger = (req, res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.originalUrl || req.url,
    query: req.query,
    ip: req.ip || req.connection?.remoteAddress,
  });
  next();
};

module.exports = {
  requestLogger,
  simpleLogger,
};
