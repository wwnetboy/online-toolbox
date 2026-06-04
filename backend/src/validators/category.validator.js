/**
 * Category Validators
 * Validates category management requests
 * Requirement: 7.2
 */

const { body, param, query } = require('express-validator');

/**
 * Create category request validation
 * Requirement: 7.2
 */
const createCategoryValidator = [
  body('identifier')
    .notEmpty()
    .withMessage('分类标识不能为空')
    .isString()
    .withMessage('分类标识必须是字符串')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('分类标识长度应在2-50个字符之间')
    .matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
    .withMessage('分类标识必须以字母开头，只能包含字母、数字、下划线和连字符'),

  body('name')
    .notEmpty()
    .withMessage('分类名称不能为空')
    .isString()
    .withMessage('分类名称必须是字符串')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('分类名称长度应在1-100个字符之间'),

  body('icon')
    .optional()
    .isString()
    .withMessage('图标必须是字符串')
    .trim()
    .isLength({ max: 100 })
    .withMessage('图标长度不能超过100个字符'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('启用状态必须是布尔值'),
];

/**
 * Update category request validation
 * Requirement: 7.3
 */
const updateCategoryValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('分类ID必须是正整数'),

  body('identifier')
    .optional()
    .isString()
    .withMessage('分类标识必须是字符串')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('分类标识长度应在2-50个字符之间')
    .matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
    .withMessage('分类标识必须以字母开头，只能包含字母、数字、下划线和连字符'),

  body('name')
    .optional()
    .isString()
    .withMessage('分类名称必须是字符串')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('分类名称长度应在1-100个字符之间'),

  body('icon')
    .optional()
    .isString()
    .withMessage('图标必须是字符串')
    .trim()
    .isLength({ max: 100 })
    .withMessage('图标长度不能超过100个字符'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('启用状态必须是布尔值'),
];


/**
 * Update category sort request validation
 * Requirement: 7.4
 */
const updateCategorySortValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('排序项列表必须是非空数组'),

  body('items.*.id')
    .isInt({ min: 1 })
    .withMessage('分类ID必须是正整数'),

  body('items.*.sort')
    .isInt({ min: 0 })
    .withMessage('排序值必须是非负整数'),
];

/**
 * Delete category request validation
 * Requirements: 7.5, 7.6
 */
const deleteCategoryValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('分类ID必须是正整数'),
];

/**
 * Get category by ID request validation
 */
const getCategoryByIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('分类ID必须是正整数'),
];

/**
 * Check category identifier request validation
 * Requirement: 7.2
 */
const checkIdentifierValidator = [
  query('identifier')
    .notEmpty()
    .withMessage('分类标识不能为空')
    .isString()
    .withMessage('分类标识必须是字符串')
    .trim(),

  query('excludeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('排除ID必须是正整数'),
];

module.exports = {
  createCategoryValidator,
  updateCategoryValidator,
  updateCategorySortValidator,
  deleteCategoryValidator,
  getCategoryByIdValidator,
  checkIdentifierValidator,
};
