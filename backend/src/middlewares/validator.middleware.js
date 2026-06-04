const { validationResult } = require('express-validator');
const { error, ErrorCodes } = require('../utils/response');

/**
 * Validation result handler middleware
 * Processes express-validator validation results
 * Requirements: 11.3
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return error(res, ErrorCodes.VALIDATION_ERROR, '数据验证失败', {
      errors: formattedErrors,
    });
  }

  next();
};

/**
 * Create validation middleware chain
 * Combines validators with the validate handler
 * @param {Array} validations - Array of express-validator validation chains
 */
const validateWith = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      }));

      return error(res, ErrorCodes.VALIDATION_ERROR, '数据验证失败', {
        errors: formattedErrors,
      });
    }

    next();
  };
};

/**
 * Sanitize input to prevent XSS
 * Escapes HTML special characters
 * @param {string} input - Input string to sanitize
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Common validation rules
 */
const commonRules = {
  // Pagination rules
  page: {
    optional: true,
    isInt: { options: { min: 1 }, errorMessage: '页码必须是大于0的整数' },
    toInt: true,
  },
  pageSize: {
    optional: true,
    isInt: { options: { min: 1, max: 100 }, errorMessage: '每页条数必须在1-100之间' },
    toInt: true,
  },
  
  // ID rules
  id: {
    isInt: { options: { min: 1 }, errorMessage: 'ID必须是大于0的整数' },
    toInt: true,
  },
  
  // String rules
  requiredString: (fieldName, minLength = 1, maxLength = 255) => ({
    notEmpty: { errorMessage: `${fieldName}不能为空` },
    isLength: { 
      options: { min: minLength, max: maxLength }, 
      errorMessage: `${fieldName}长度必须在${minLength}-${maxLength}之间` 
    },
    trim: true,
  }),
  
  optionalString: (fieldName, maxLength = 255) => ({
    optional: { options: { nullable: true } },
    isLength: { 
      options: { max: maxLength }, 
      errorMessage: `${fieldName}长度不能超过${maxLength}` 
    },
    trim: true,
  }),
  
  // Email rule
  email: {
    notEmpty: { errorMessage: '邮箱不能为空' },
    isEmail: { errorMessage: '邮箱格式不正确' },
    normalizeEmail: true,
  },
  
  // Phone rule (Chinese mobile)
  phone: {
    optional: { options: { nullable: true } },
    matches: { 
      options: /^1[3-9]\d{9}$/, 
      errorMessage: '手机号格式不正确' 
    },
  },
  
  // Boolean rule
  boolean: {
    optional: true,
    isBoolean: { errorMessage: '必须是布尔值' },
    toBoolean: true,
  },
};

module.exports = {
  validate,
  validateWith,
  sanitizeInput,
  commonRules,
};
