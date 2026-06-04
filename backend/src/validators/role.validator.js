const { body, param, query } = require('express-validator');

/**
 * Role Validators
 * Validates role management requests
 * Requirement: 4.2
 */

/**
 * Create role request validation
 * Requirement: 4.2
 */
const createRoleValidator = [
  body('roleName')
    .notEmpty()
    .withMessage('角色名称不能为空')
    .isString()
    .withMessage('角色名称必须是字符串')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('角色名称长度应在2-50个字符之间'),

  body('roleCode')
    .notEmpty()
    .withMessage('角色编码不能为空')
    .isString()
    .withMessage('角色编码必须是字符串')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('角色编码长度应在2-50个字符之间')
    .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .withMessage('角色编码必须以字母开头，只能包含字母、数字和下划线'),

  body('description')
    .optional()
    .isString()
    .withMessage('描述必须是字符串')
    .trim()
    .isLength({ max: 255 })
    .withMessage('描述长度不能超过255个字符'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('启用状态必须是布尔值'),

  body('menuIds')
    .optional()
    .isArray()
    .withMessage('菜单ID列表必须是数组'),

  body('menuIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('菜单ID必须是正整数'),
];

/**
 * Update role request validation
 * Requirement: 4.3
 */
const updateRoleValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('角色ID必须是正整数'),

  body('roleName')
    .optional()
    .isString()
    .withMessage('角色名称必须是字符串')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('角色名称长度应在2-50个字符之间'),

  body('roleCode')
    .optional()
    .isString()
    .withMessage('角色编码必须是字符串')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('角色编码长度应在2-50个字符之间')
    .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .withMessage('角色编码必须以字母开头，只能包含字母、数字和下划线'),

  body('description')
    .optional()
    .isString()
    .withMessage('描述必须是字符串')
    .trim()
    .isLength({ max: 255 })
    .withMessage('描述长度不能超过255个字符'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('启用状态必须是布尔值'),
];


/**
 * Update role permissions request validation
 * Requirement: 4.4
 */
const updateRolePermissionsValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('角色ID必须是正整数'),

  body('menuIds')
    .isArray()
    .withMessage('菜单ID列表必须是数组'),

  body('menuIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('菜单ID必须是正整数'),
];

/**
 * Delete role request validation
 * Requirement: 4.6
 */
const deleteRoleValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('角色ID必须是正整数'),
];

/**
 * Get role list request validation
 * Requirement: 4.1
 */
const getRolesValidator = [
  query('current')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),

  query('size')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须在1-100之间'),

  query('roleName')
    .optional()
    .isString()
    .withMessage('角色名称必须是字符串')
    .trim(),

  query('roleCode')
    .optional()
    .isString()
    .withMessage('角色编码必须是字符串')
    .trim(),

  query('enabled')
    .optional()
    .isIn(['true', 'false', true, false])
    .withMessage('启用状态值无效'),
];

/**
 * Check role code request validation
 * Requirement: 4.2
 */
const checkRoleCodeValidator = [
  query('roleCode')
    .notEmpty()
    .withMessage('角色编码不能为空')
    .isString()
    .withMessage('角色编码必须是字符串')
    .trim(),

  query('excludeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('排除ID必须是正整数'),
];

/**
 * Get role by ID request validation
 */
const getRoleByIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('角色ID必须是正整数'),
];

module.exports = {
  createRoleValidator,
  updateRoleValidator,
  updateRolePermissionsValidator,
  deleteRoleValidator,
  getRolesValidator,
  checkRoleCodeValidator,
  getRoleByIdValidator,
};
