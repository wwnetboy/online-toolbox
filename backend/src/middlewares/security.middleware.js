/**
 * Security Middleware
 * Configures CORS whitelist and request body size limits
 * Requirements: 11.4, 11.7
 */

const cors = require('cors');
const config = require('../config');

/**
 * Create CORS middleware with whitelist configuration
 * Requirement: 11.4 - Configure CORS whitelist to restrict allowed request origins
 * @returns {Function} CORS middleware
 */
function createCorsMiddleware() {
  const corsOptions = {
    // Origin configuration - can be string, array, or function
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      if (config.server.env === 'development') {
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }

      const allowedOrigins = config.cors.origin;

      // If origin is true (wildcard), allow all
      if (allowedOrigins === true) {
        return callback(null, true);
      }

      // If origin is a string, check exact match
      if (typeof allowedOrigins === 'string') {
        if (origin === allowedOrigins) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      }

      // If origin is an array, check if origin is in the list
      if (Array.isArray(allowedOrigins)) {
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      }

      // Default: deny
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },

    // Allowed HTTP methods
    methods: config.cors.methods,

    // Allow credentials (cookies, authorization headers)
    credentials: config.cors.credentials,

    // Allowed request headers
    allowedHeaders: config.cors.allowedHeaders,

    // Headers exposed to the client
    exposedHeaders: config.cors.exposedHeaders,

    // Preflight request cache duration
    maxAge: config.cors.maxAge,

    // Pass the CORS preflight response to the next handler
    preflightContinue: false,

    // Provides a status code to use for successful OPTIONS requests
    optionsSuccessStatus: 204,
  };

  return cors(corsOptions);
}

/**
 * Create body parser middleware with size limits
 * Requirement: 11.7 - Limit request body size to prevent large file attacks
 * @param {Object} express - Express module
 * @returns {Object} Object containing body parser middlewares
 */
function createBodyParserMiddlewares(express) {
  return {
    // JSON body parser with size limit
    json: express.json({
      limit: config.bodyLimit.json,
      strict: true, // Only accept arrays and objects
    }),

    // URL-encoded body parser with size limit
    urlencoded: express.urlencoded({
      limit: config.bodyLimit.urlencoded,
      extended: true,
      parameterLimit: 1000, // Limit number of parameters
    }),

    // Raw body parser with size limit (for webhooks, etc.)
    raw: express.raw({
      limit: config.bodyLimit.raw,
      type: 'application/octet-stream',
    }),

    // Text body parser with size limit
    text: express.text({
      limit: config.bodyLimit.text,
      type: 'text/plain',
    }),
  };
}

/**
 * Handle payload too large errors
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function handlePayloadTooLarge(err, req, res, next) {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      code: 413,
      message: '请求体过大，请减小请求数据量',
      data: null,
    });
  }
  next(err);
}

/**
 * Handle CORS errors
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function handleCorsError(err, req, res, next) {
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      code: 403,
      message: '跨域请求被拒绝',
      data: null,
    });
  }
  next(err);
}

/**
 * Security headers middleware
 * Adds basic security headers to responses
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * Get client IP address (handles proxies)
 * @param {Object} req - Express request
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  // Check for forwarded IP (when behind proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Get the first IP in the list (client IP)
    return forwarded.split(',')[0].trim();
  }
  
  // Check for real IP header (nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }
  
  // Fall back to connection remote address
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         'unknown';
}

/**
 * IP extraction middleware
 * Adds clientIp property to request object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function extractClientIp(req, res, next) {
  req.clientIp = getClientIp(req);
  next();
}

module.exports = {
  createCorsMiddleware,
  createBodyParserMiddlewares,
  handlePayloadTooLarge,
  handleCorsError,
  securityHeaders,
  getClientIp,
  extractClientIp,
};
