/**
 * Error code constants
 * Based on design document error code definitions
 */
const ErrorCodes = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
};

/**
 * Error messages mapping
 */
const ErrorMessages = {
  [ErrorCodes.SUCCESS]: '操作成功',
  [ErrorCodes.BAD_REQUEST]: '请求参数错误',
  [ErrorCodes.UNAUTHORIZED]: '未授权，请先登录',
  [ErrorCodes.FORBIDDEN]: '禁止访问，权限不足',
  [ErrorCodes.NOT_FOUND]: '资源不存在',
  [ErrorCodes.CONFLICT]: '资源冲突',
  [ErrorCodes.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCodes.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',
  [ErrorCodes.INTERNAL_ERROR]: '服务器内部错误',
};

/**
 * Success response helper
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const success = (res, data = null, message = '操作成功', statusCode = 200) => {
  return res.status(statusCode).json({
    code: ErrorCodes.SUCCESS,
    msg: message,
    data,
  });
};

/**
 * Error response helper
 * @param {Object} res - Express response object
 * @param {number} code - Error code
 * @param {string} message - Error message
 * @param {*} data - Additional error data (e.g., validation errors)
 */
const error = (res, code = ErrorCodes.INTERNAL_ERROR, message = null, data = null) => {
  const errorMessage = message || ErrorMessages[code] || '未知错误';
  const httpStatus = code >= 100 && code < 600 ? code : 500;
  
  return res.status(httpStatus).json({
    code,
    msg: errorMessage,
    data,
  });
};

/**
 * Paginated response helper
 * @param {Object} res - Express response object
 * @param {Array} records - Data records
 * @param {number} current - Current page number
 * @param {number} size - Page size
 * @param {number} total - Total record count
 * @param {string} message - Success message
 */
const paginated = (res, records, current, size, total, message = '查询成功') => {
  return res.status(200).json({
    code: ErrorCodes.SUCCESS,
    msg: message,
    data: {
      records,
      current,
      size,
      total,
    },
  });
};

module.exports = {
  ErrorCodes,
  ErrorMessages,
  success,
  error,
  paginated,
};
