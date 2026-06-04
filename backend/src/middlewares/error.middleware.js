const { error, ErrorCodes, ErrorMessages } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(code, message, data = null) {
    super(message);
    this.code = code;
    this.data = data;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found handler middleware
 * Handles 404 errors for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  return error(res, ErrorCodes.NOT_FOUND, `路由 ${req.method} ${req.originalUrl} 不存在`);
};

/**
 * Global error handler middleware
 * Handles all errors and returns standardized response
 * Requirements: 12.1, 12.4
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user ? req.user.userId : null,
  });

  // Handle operational errors (known errors)
  if (err.isOperational) {
    return error(res, err.code, err.message, err.data);
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const validationErrors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
    return error(res, ErrorCodes.VALIDATION_ERROR, '数据验证失败', { errors: validationErrors });
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'unknown';
    return error(res, ErrorCodes.CONFLICT, `${field} 已存在`);
  }

  // Handle Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return error(res, ErrorCodes.BAD_REQUEST, '关联数据不存在或存在依赖关系');
  }

  // Handle Sequelize database errors (hide details)
  if (err.name === 'SequelizeDatabaseError') {
    return error(res, ErrorCodes.INTERNAL_ERROR, '服务器内部错误');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(res, ErrorCodes.UNAUTHORIZED, '令牌无效');
  }

  if (err.name === 'TokenExpiredError') {
    return error(res, ErrorCodes.UNAUTHORIZED, '令牌已过期，请重新登录');
  }

  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, ErrorCodes.BAD_REQUEST, '文件大小超过限制');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return error(res, ErrorCodes.BAD_REQUEST, '不支持的文件字段');
  }

  // Handle syntax errors in JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return error(res, ErrorCodes.BAD_REQUEST, '请求体 JSON 格式错误');
  }

  // Default: Internal server error (hide details for security)
  return error(res, ErrorCodes.INTERNAL_ERROR, '服务器内部错误');
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async function to wrap
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
