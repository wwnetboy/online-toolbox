require('dotenv').config();

/**
 * Parse CORS origins from environment variable
 * Supports comma-separated list of origins
 * @param {string} originsStr - Comma-separated origins string
 * @returns {string|string[]|boolean} Parsed origins
 */
function parseCorsOrigins(originsStr) {
  if (!originsStr) return 'http://localhost:5173';
  
  // Handle wildcard
  if (originsStr === '*') return true;
  
  // Handle comma-separated list
  const origins = originsStr.split(',').map(o => o.trim()).filter(Boolean);
  
  // Return single origin as string, multiple as array
  return origins.length === 1 ? origins[0] : origins;
}

module.exports = {
  // Server configuration
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3100,
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'toolbox',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // File upload configuration
  upload: {
    path: process.env.UPLOAD_PATH || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  },

  // CORS configuration
  // Requirement: 11.4 - Configure CORS whitelist to restrict allowed request origins
  cors: {
    // Parse origins from environment variable (supports comma-separated list)
    origin: parseCorsOrigins(process.env.CORS_ORIGIN),
    // Allowed HTTP methods
    methods: (process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE').split(','),
    // Allow credentials (cookies, authorization headers)
    credentials: process.env.CORS_CREDENTIALS !== 'false',
    // Allowed headers
    allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With').split(','),
    // Exposed headers
    exposedHeaders: (process.env.CORS_EXPOSED_HEADERS || 'Content-Range,X-Content-Range').split(','),
    // Preflight cache duration (in seconds)
    maxAge: parseInt(process.env.CORS_MAX_AGE, 10) || 86400, // 24 hours
  },

  // Request body limits configuration
  // Requirement: 11.7 - Limit request body size to prevent large file attacks
  bodyLimit: {
    // JSON body limit
    json: process.env.BODY_LIMIT_JSON || '1mb',
    // URL-encoded body limit
    urlencoded: process.env.BODY_LIMIT_URLENCODED || '1mb',
    // Raw body limit
    raw: process.env.BODY_LIMIT_RAW || '5mb',
    // Text body limit
    text: process.env.BODY_LIMIT_TEXT || '1mb',
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },

  // Security configuration
  security: {
    // Enable/disable security headers
    helmet: process.env.SECURITY_HELMET !== 'false',
    // Trust proxy (for rate limiting behind reverse proxy)
    trustProxy: process.env.TRUST_PROXY === 'true',
  },

  // External tool paths (use PATH lookup by default)
  tool: {
    python: process.env.TOOL_PYTHON_PATH || 'python',
    ffmpeg: process.env.TOOL_FFMPEG_PATH || 'ffmpeg',
  },
};
