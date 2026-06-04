/**
 * Application Entry Point
 * Configures Express application with middleware and routes
 * Requirements: All
 */

const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const { sequelize, syncDatabase } = require('./models');
const routes = require('./routes');

// Import middlewares
const { requestLogger } = require('./middlewares/logger.middleware');
const { apiLimiter, authLimiter, uploadLimiter } = require('./middlewares/rate-limit.middleware');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const {
  createCorsMiddleware,
  createBodyParserMiddlewares,
  handlePayloadTooLarge,
  handleCorsError,
  securityHeaders,
  extractClientIp,
} = require('./middlewares/security.middleware');

// Import upload routes for static file configuration
const { configureStaticFiles } = require('./routes/upload.routes');

// Create Express application
const app = express();

/**
 * Trust proxy setting
 * Required for rate limiting and IP detection behind reverse proxy
 */
if (config.security.trustProxy) {
  app.set('trust proxy', 1);
}

/**
 * Middleware Configuration Order:
 * 1. Security headers
 * 2. CORS
 * 3. Client IP extraction
 * 4. Body parsers with size limits
 * 5. Request logging
 * 6. Rate limiting
 * 7. Static files
 * 8. API routes
 * 9. Error handlers
 */

// 1. Security headers middleware
// Adds X-Frame-Options, X-Content-Type-Options, etc.
app.use(securityHeaders);

// 2. CORS middleware
// Requirement: 11.4 - Configure CORS whitelist
const corsMiddleware = createCorsMiddleware();
app.use(corsMiddleware);

// 3. Client IP extraction middleware
// Extracts client IP from headers (handles proxies)
app.use(extractClientIp);

// 4. Body parser middlewares with size limits
// Requirement: 11.7 - Limit request body size
const bodyParsers = createBodyParserMiddlewares(express);
app.use(bodyParsers.json);
app.use(bodyParsers.urlencoded);

// 5. Request logging middleware
// Requirement: 12.2 - Log all HTTP requests
app.use(requestLogger);

// 6. Rate limiting middleware
// Requirement: 11.2 - Implement request rate limiting
// Apply stricter rate limiting to auth endpoints
app.use('/api/auth', authLimiter);
// Apply upload rate limiting to upload endpoints
app.use('/api/upload', uploadLimiter);
// Apply general rate limiting to all API endpoints
app.use('/api', apiLimiter);

// 7. Static files for uploads
// Requirement: 13.7 - Return accessible URL for uploaded files
configureStaticFiles(app);

// 8. API routes
// All routes are prefixed with /api
app.use('/api', routes);

// 9. Static files accessible via /uploads (不带/api前缀，与Nginx配置一致)
const path = require('path');
app.use('/uploads', express.static(path.resolve(require('./config').upload.path)));

// 9. Handle payload too large errors
app.use(handlePayloadTooLarge);

// 10. Handle CORS errors
app.use(handleCorsError);

// 11. 404 handler for undefined routes
app.use(notFoundHandler);

// 12. Global error handler
// Requirements: 12.1, 12.3, 12.4 - Standardized error responses
app.use(errorHandler);


/**
 * Database initialization and server startup
 */
const startServer = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Sync database models (in development, use { alter: true } for auto-migration)
    // In production, use migrations instead
    if (config.server.env === 'development') {
      logger.info('Synchronizing database models...');
      await syncDatabase({ alter: false });
      logger.info('Database models synchronized.');
    }

    // Start HTTP server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${config.server.env}`);
      logger.info(`API Base URL: http://localhost:${PORT}/api`);
      logger.info(`Health Check: http://localhost:${PORT}/api/health`);
      
      // Log CORS configuration
      const corsOrigin = config.cors.origin;
      if (corsOrigin === true) {
        logger.info('CORS: Allowing all origins');
      } else if (Array.isArray(corsOrigin)) {
        logger.info(`CORS: Allowing origins: ${corsOrigin.join(', ')}`);
      } else {
        logger.info(`CORS: Allowing origin: ${corsOrigin}`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connection
    await sequelize.close();
    logger.info('Database connection closed.');
    
    logger.info('Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

// Export app for testing
module.exports = app;
