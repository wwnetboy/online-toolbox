const jwt = require('jsonwebtoken');
const config = require('../config');
const { error, ErrorCodes } = require('../utils/response');

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 * Requirements: 1.4, 11.1, 11.5
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return error(res, ErrorCodes.UNAUTHORIZED, '未提供认证令牌');
    }

    // Check Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return error(res, ErrorCodes.UNAUTHORIZED, '令牌格式无效');
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      userName: decoded.userName,
      roles: decoded.roles || [],
    };

    next();
  } catch (err) {
    // Handle specific JWT errors
    if (err.name === 'TokenExpiredError') {
      return error(res, ErrorCodes.UNAUTHORIZED, '令牌已过期，请重新登录');
    }
    
    if (err.name === 'JsonWebTokenError') {
      return error(res, ErrorCodes.UNAUTHORIZED, '令牌无效');
    }

    if (err.name === 'NotBeforeError') {
      return error(res, ErrorCodes.UNAUTHORIZED, '令牌尚未生效');
    }

    // Generic error
    return error(res, ErrorCodes.UNAUTHORIZED, '认证失败');
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't block if missing
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    
    req.user = {
      userId: decoded.userId,
      userName: decoded.userName,
      roles: decoded.roles || [],
    };

    next();
  } catch (err) {
    // Silently continue without user info
    next();
  }
};

/**
 * Role-based authorization middleware
 * Checks if user has required roles
 * @param {string[]} allowedRoles - Array of allowed role codes
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, ErrorCodes.UNAUTHORIZED, '未授权，请先登录');
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return error(res, ErrorCodes.FORBIDDEN, '权限不足，无法访问该资源');
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
};
