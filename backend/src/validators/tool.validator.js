/**
 * Tool Validators
 * Validates tool management requests
 * Requirement: 6.2
 */

const { body, param, query } = require('express-validator');

/**
 * Custom validator for iconUrl field
 * Allows relative URLs starting with /uploads/ or absolute URLs
 */
const validateIconUrl = (value) => {
  if (value && value.length > 0) {
    const isRelativeUrl = value.startsWith('/uploads/');
    const isAbsoluteUrl = /^https?:\/\/.+/.test(value);
    if (!isRelativeUrl && !isAbsoluteUrl) {
      throw new Error('图标URL格式无效');
    }
  }
  return true;
};

/**
 * Get tools list request validation
 * Requirements: 6.1, 6.6
 */
const getToolsValidator = [
  query('current')
    .optional()
    .isInt({ min: 1 })
    .withMessage('当前页码必须是正整数'),

  query('size')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('每页条数必须是1-1000之间的整数'),

  query('name')
    .optional()
    .isString()
    .withMessage('工具名称必须是字符串')
    .trim(),

  query('category')
    .optional()
    .isInt({ min: 1 })
    .withMessage('分类ID必须是正整数'),

  query('enabled')
    .optional()
    .isBoolean()
    .withMessage('启用状态必须是布尔值'),
];

/**
 * Create tool request validation
 * Requirement: 6.2, 3.4
 */
const createToolValidator = [
  body('name')
    .notEmpty()
    .withMessage('工具名称不能为空')
    .isString()
    .withMessage('工具名称必须是字符串')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('工具名称长度应在1-100个字符之间'),

  body('description')
    .optional()
    .isString()
    .withMessage('描述必须是字符串')
    .trim(),

  body('icon')
    .optional()
    .isString()
    .withMessage('图标必须是字符串')
    .trim()
    .isLength({ max: 100 })
    .withMessage('图标长度不能超过100个字符'),

  body('iconUrl')
    .optional({ nullable: true })
    .isString()
    .withMessage('图标URL必须是字符串')
    .trim()
    .isLength({ max: 255 })
    .withMessage('图标URL长度不能超过255个字符')
    .custom(validateIconUrl),

  body('color')
    .optional()
    .isString()
    .withMessage('颜色必须是字符串')
    .trim()
    .isLength({ max: 20 })
    .withMessage('颜色长度不能超过20个字符'),

  body('categoryId')
    .notEmpty()
    .withMessage('分类ID不能为空')
    .isInt({ min: 1 })
    .withMessage('分类ID必须是正整数'),

  body('route')
    .notEmpty()
    .withMessage('路由不能为空')
    .isString()
    .withMessage('路由必须是字符串')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('路由长度应在1-255个字符之间'),

  body('badge')
    .optional({ nullable: true })
    .isIn(['hot', 'new', null])
    .withMessage('标签必须是 hot、new 或 null'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('启用状态必须是布尔值'),
];


/**
 * Update tool request validation
 * Requirement: 6.3, 3.4
 */
const updateToolValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('工具ID必须是正整数'),

  body('name')
    .optional()
    .isString()
    .withMessage('工具名称必须是字符串')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('工具名称长度应在1-100个字符之间'),

  body('description')
    .optional()
    .isString()
    .withMessage('描述必须是字符串')
    .trim(),

  body('icon')
    .optional()
    .isString()
    .withMessage('图标必须是字符串')
    .trim()
    .isLength({ max: 100 })
    .withMessage('图标长度不能超过100个字符'),

  body('iconUrl')
    .optional({ nullable: true })
    .isString()
    .withMessage('图标URL必须是字符串')
    .trim()
    .isLength({ max: 255 })
    .withMessage('图标URL长度不能超过255个字符')
    .custom(validateIconUrl),

  body('color')
    .optional()
    .isString()
    .withMessage('颜色必须是字符串')
    .trim()
    .isLength({ max: 20 })
    .withMessage('颜色长度不能超过20个字符'),

  body('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('分类ID必须是正整数'),

  body('route')
    .optional()
    .isString()
    .withMessage('路由必须是字符串')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('路由长度应在1-255个字符之间'),

  body('badge')
    .optional({ nullable: true })
    .isIn(['hot', 'new', null])
    .withMessage('标签必须是 hot、new 或 null'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('启用状态必须是布尔值'),

  body('sort')
    .optional()
    .isInt({ min: 0 })
    .withMessage('排序值必须是非负整数'),
];

/**
 * Toggle tool status request validation
 * Requirement: 6.4
 */
const toggleToolStatusValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('工具ID必须是正整数'),
];

/**
 * Delete tool request validation
 * Requirement: 6.5
 */
const deleteToolValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('工具ID必须是正整数'),
];

/**
 * Get tool by ID request validation
 */
const getToolByIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('工具ID必须是正整数'),
];


/**
 * Update tool sort request validation
 */
const updateToolSortValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('排序项列表必须是非空数组'),

  body('items.*.id')
    .isInt({ min: 1 })
    .withMessage('工具ID必须是正整数'),

  body('items.*.sort')
    .isInt({ min: 0 })
    .withMessage('排序值必须是非负整数'),
];

/**
 * Batch delete tools request validation
 */
const batchDeleteToolsValidator = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('工具ID列表必须是非空数组'),

  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('工具ID必须是正整数'),
];

/**
 * Batch toggle status request validation
 */
const batchToggleStatusValidator = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('工具ID列表必须是非空数组'),

  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('工具ID必须是正整数'),

  body('enabled')
    .isBoolean()
    .withMessage('启用状态必须是布尔值'),
];

module.exports = {
  getToolsValidator,
  createToolValidator,
  updateToolValidator,
  toggleToolStatusValidator,
  deleteToolValidator,
  getToolByIdValidator,
  updateToolSortValidator,
  batchDeleteToolsValidator,
  batchToggleStatusValidator,
};
