const { body, param, query } = require('express-validator');

/**
 * Menu Validators
 * Validates menu management requests
 * Requirement: 5.3
 */

/**
 * Create menu request validation
 * Requirement: 5.3
 */
const createMenuValidator = [
  body('path')
    .notEmpty()
    .withMessage('路径不能为空')
    .isString()
    .withMessage('路径必须是字符串')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('路径长度应在1-255个字符之间'),

  body('name')
    .notEmpty()
    .withMessage('名称不能为空')
    .isString()
    .withMessage('名称必须是字符串')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('名称长度应在1-100个字符之间'),

  body('parentId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('父级菜单ID必须是正整数'),

  body('component')
    .optional({ nullable: true })
    .isString()
    .withMessage('组件路径必须是字符串')
    .trim()
    .isLength({ max: 255 })
    .withMessage('组件路径长度不能超过255个字符'),

  body('redirect')
    .optional({ nullable: true })
    .isString()
    .withMessage('重定向路径必须是字符串')
    .trim()
    .isLength({ max: 255 })
    .withMessage('重定向路径长度不能超过255个字符'),

  body('icon')
    .optional({ nullable: true })
    .isString()
    .withMessage('图标必须是字符串')
    .trim()
    .isLength({ max: 100 })
    .withMessage('图标长度不能超过100个字符'),

  body('sort')
    .optional()
    .isInt({ min: 0 })
    .withMessage('排序值必须是非负整数'),

  body('hidden')
    .optional()
    .isBoolean()
    .withMessage('隐藏状态必须是布尔值'),

  body('meta')
    .optional({ nullable: true })
    .isObject()
    .withMessage('元数据必须是对象'),
];


/**
 * Update menu request validation
 * Requirement: 5.4
 */
const updateMenuValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('菜单ID必须是正整数'),

  body('path')
    .optional()
    .isString()
    .withMessage('路径必须是字符串')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('路径长度应在1-255个字符之间'),

  body('name')
    .optional()
    .isString()
    .withMessage('名称必须是字符串')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('名称长度应在1-100个字符之间'),

  body('parentId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null) return true;
      if (Number.isInteger(value) && value >= 1) return true;
      throw new Error('父级菜单ID必须是正整数或null');
    }),

  body('component')
    .optional({ nullable: true })
    .isString()
    .withMessage('组件路径必须是字符串')
    .trim()
    .isLength({ max: 255 })
    .withMessage('组件路径长度不能超过255个字符'),

  body('redirect')
    .optional({ nullable: true })
    .isString()
    .withMessage('重定向路径必须是字符串')
    .trim()
    .isLength({ max: 255 })
    .withMessage('重定向路径长度不能超过255个字符'),

  body('icon')
    .optional({ nullable: true })
    .isString()
    .withMessage('图标必须是字符串')
    .trim()
    .isLength({ max: 100 })
    .withMessage('图标长度不能超过100个字符'),

  body('sort')
    .optional()
    .isInt({ min: 0 })
    .withMessage('排序值必须是非负整数'),

  body('hidden')
    .optional()
    .isBoolean()
    .withMessage('隐藏状态必须是布尔值'),

  body('meta')
    .optional({ nullable: true })
    .isObject()
    .withMessage('元数据必须是对象'),
];

/**
 * Delete menu request validation
 * Requirement: 5.5
 */
const deleteMenuValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('菜单ID必须是正整数'),
];

/**
 * Get menu by ID request validation
 */
const getMenuByIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('菜单ID必须是正整数'),
];

module.exports = {
  createMenuValidator,
  updateMenuValidator,
  deleteMenuValidator,
  getMenuByIdValidator,
};
