const { body, param, query } = require('express-validator');

/**
 * User Validators
 * Validates user management requests
 * Requirements: 2.2, 2.6
 */

/**
 * Create user request validation
 * Requirement: 2.2, 2.6
 */
const createUserValidator = [
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

  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isString()
    .withMessage('密码必须是字符串')
    .isLength({ min: 6, max: 100 })
    .withMessage('密码长度应在6-100个字符之间'),

  body('email')
    .notEmpty()
    .withMessage('邮箱不能为空')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),

  body('nickName')
    .optional()
    .isString()
    .withMessage('昵称必须是字符串')
    .trim()
    .isLength({ max: 50 })
    .withMessage('昵称长度不能超过50个字符'),

  body('phone')
    .optional()
    .matches(/^1[3-9]\d{9}$/)
    .withMessage('手机号格式不正确'),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'unknown'])
    .withMessage('性别值无效'),

  body('roleIds')
    .optional()
    .isArray()
    .withMessage('角色ID列表必须是数组'),

  body('roleIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('角色ID必须是正整数'),

  body('avatar')
    .optional()
    .isString()
    .withMessage('头像地址必须是字符串')
    .isLength({ max: 255 })
    .withMessage('头像地址长度不能超过255个字符'),

  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('状态值无效'),
];

/**
 * Update user request validation
 * Requirement: 2.3
 */
const updateUserValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是正整数'),

  body('nickName')
    .optional()
    .isString()
    .withMessage('昵称必须是字符串')
    .trim()
    .isLength({ max: 50 })
    .withMessage('昵称长度不能超过50个字符'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),

  body('phone')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      return /^1[3-9]\d{9}$/.test(value);
    })
    .withMessage('手机号格式不正确'),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'unknown'])
    .withMessage('性别值无效'),

  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('状态值无效'),

  body('roleIds')
    .optional()
    .isArray()
    .withMessage('角色ID列表必须是数组'),

  body('roleIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('角色ID必须是正整数'),

  body('avatar')
    .optional()
    .isString()
    .withMessage('头像地址必须是字符串')
    .isLength({ max: 255 })
    .withMessage('头像地址长度不能超过255个字符'),

  body('address')
    .optional()
    .isString()
    .withMessage('地址必须是字符串')
    .isLength({ max: 255 })
    .withMessage('地址长度不能超过255个字符'),

  body('intro')
    .optional()
    .isString()
    .withMessage('个人介绍必须是字符串'),
];


/**
 * Delete user request validation
 * Requirement: 2.4
 */
const deleteUserValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是正整数'),
];

/**
 * Batch delete users request validation
 * Requirement: 2.4
 */
const batchDeleteUsersValidator = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('请选择要删除的用户'),

  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是正整数'),
];

/**
 * Get user list request validation
 * Requirement: 2.1, 2.5
 */
const getUsersValidator = [
  query('current')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),

  query('size')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须在1-100之间'),

  query('userName')
    .optional()
    .isString()
    .withMessage('用户名必须是字符串')
    .trim(),

  query('userEmail')
    .optional()
    .isString()
    .withMessage('邮箱必须是字符串')
    .trim(),

  query('userPhone')
    .optional()
    .isString()
    .withMessage('手机号必须是字符串')
    .trim(),

  query('userGender')
    .optional()
    .isIn(['male', 'female', 'unknown'])
    .withMessage('性别值无效'),

  query('status')
    .optional()
    .isString()
    .withMessage('状态必须是字符串'),
];

/**
 * Update profile request validation
 * Requirement: 3.2
 */
const updateProfileValidator = [
  body('nickName')
    .optional()
    .isString()
    .withMessage('昵称必须是字符串')
    .trim()
    .isLength({ max: 50 })
    .withMessage('昵称长度不能超过50个字符'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),

  body('phone')
    .optional()
    .custom((value) => {
      // 允许空值、null、undefined
      if (!value || value === '' || value === null) return true;
      // 只在有值时验证格式：11位数字，1开头，第二位3-9
      return /^1[3-9]\d{9}$/.test(value);
    })
    .withMessage('手机号格式不正确（应为11位中国手机号）'),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'unknown'])
    .withMessage('性别值无效'),

  body('avatar')
    .optional()
    .isString()
    .withMessage('头像地址必须是字符串')
    .isLength({ max: 255 })
    .withMessage('头像地址长度不能超过255个字符'),

  body('address')
    .optional()
    .isString()
    .withMessage('地址必须是字符串')
    .isLength({ max: 255 })
    .withMessage('地址长度不能超过255个字符'),

  body('intro')
    .optional()
    .isString()
    .withMessage('个人介绍必须是字符串'),
];

/**
 * Update password request validation
 * Requirement: 3.3
 */
const updatePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空')
    .isString()
    .withMessage('当前密码必须是字符串'),

  body('newPassword')
    .notEmpty()
    .withMessage('新密码不能为空')
    .isString()
    .withMessage('新密码必须是字符串')
    .isLength({ min: 6, max: 100 })
    .withMessage('新密码长度应在6-100个字符之间'),
];

/**
 * Check username request validation
 * Requirement: 2.6
 */
const checkUserNameValidator = [
  query('userName')
    .notEmpty()
    .withMessage('用户名不能为空')
    .isString()
    .withMessage('用户名必须是字符串')
    .trim(),

  query('excludeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('排除ID必须是正整数'),
];

/**
 * Check email request validation
 * Requirement: 2.6
 */
const checkEmailValidator = [
  query('email')
    .notEmpty()
    .withMessage('邮箱不能为空')
    .isEmail()
    .withMessage('邮箱格式不正确'),

  query('excludeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('排除ID必须是正整数'),
];

module.exports = {
  createUserValidator,
  updateUserValidator,
  deleteUserValidator,
  batchDeleteUsersValidator,
  getUsersValidator,
  updateProfileValidator,
  updatePasswordValidator,
  checkUserNameValidator,
  checkEmailValidator,
};
