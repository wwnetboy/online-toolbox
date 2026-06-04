const rateLimit = require('express-rate-limit');
const config = require('../config');
const { ErrorCodes } = require('../utils/response');

// 开发环境下放宽速率限制
const isDev = process.env.NODE_ENV !== 'production';

/**
 * General API rate limiter
 * Limits requests to 100 per minute per IP (dev: 1000)
 * Requirements: 11.2
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute
  max: isDev ? 1000 : config.rateLimit.maxRequests, // 开发环境放宽到 1000
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    code: ErrorCodes.TOO_MANY_REQUESTS,
    message: '请求过于频繁，请稍后再试',
    data: null,
  },
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 * Limits to 10 requests per minute to prevent brute force attacks (dev: 100)
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 10, // 开发环境放宽到 100
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: ErrorCodes.TOO_MANY_REQUESTS,
    message: '登录尝试过于频繁，请稍后再试',
    data: null,
  },
  keyGenerator: (req) => {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },
});

/**
 * Rate limiter for file upload endpoints
 * Limits to 20 uploads per minute
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 uploads per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: ErrorCodes.TOO_MANY_REQUESTS,
    message: '上传请求过于频繁，请稍后再试',
    data: null,
  },
  keyGenerator: (req) => {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
};
