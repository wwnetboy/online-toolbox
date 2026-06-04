const { body } = require('express-validator');

/**
 * Authentication Validators
 * Validates login and token refresh requests
 * Requirements: 1.1, 1.2
 */

/**
 * Register request validation
 */
const registerValidator = [
  body('userName')
    .notEmpty()
    .withMessage('用户名不能为空')
    .isString()
    .withMessage('用户名必须是字符串')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('用户名长度应在2-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  
  body('email')
    .notEmpty()
    .withMessage('邮箱不能为空')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isString()
    .withMessage('密码必须是字符串')
    .isLength({ min: 6, max: 100 })
    .withMessage('密码长度应在6-100个字符之间'),
  
  body('nickName')
    .optional()
    .isString()
    .withMessage('昵称必须是字符串')
    .isLength({ max: 50 })
    .withMessage('昵称长度不能超过50个字符'),
  
  body('phone')
    .optional()
    .matches(/^1[3-9]\d{9}$/)
    .withMessage('手机号格式不正确'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'unknown'])
    .withMessage('性别值必须是 male、female 或 unknown'),
];

/**
 * Login request validation
 * Requirement: 1.1, 1.2
 */
const loginValidator = [
  body('userName')
    .notEmpty()
    .withMessage('用户名不能为空')
    .isString()
    .withMessage('用户名必须是字符串')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('用户名长度应在2-50个字符之间'),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isString()
    .withMessage('密码必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('密码长度不能超过100个字符'),
];

/**
 * Refresh token request validation
 * Requirement: 1.6
 */
const refreshTokenValidator = [
  body('refreshToken')
    .notEmpty()
    .withMessage('刷新令牌不能为空')
    .isString()
    .withMessage('刷新令牌必须是字符串'),
];

/**
 * Logout request validation
 * Requirement: 1.7
 */
const logoutValidator = [
  body('refreshToken')
    .optional()
    .isString()
    .withMessage('刷新令牌必须是字符串'),
];

module.exports = {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  logoutValidator,
};
