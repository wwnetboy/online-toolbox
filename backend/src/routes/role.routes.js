const express = require('express');
const RoleController = require('../controllers/role.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validator.middleware');
const {
  createRoleValidator,
  updateRoleValidator,
  updateRolePermissionsValidator,
  deleteRoleValidator,
  getRolesValidator,
  checkRoleCodeValidator,
  getRoleByIdValidator,
} = require('../validators/role.validator');

const router = express.Router();

/**
 * Role Management Routes
 * Requirements: 4.1-4.7
 */

/**
 * @route   GET /api/role/all
 * @desc    Get all roles (without pagination)
 * @access  Private
 */
router.get('/all', authenticate, RoleController.getAllRoles);

/**
 * @route   GET /api/role/check-code
 * @desc    Check if role code exists
 * @access  Private
 * Requirement: 4.2
 */
router.get('/check-code', authenticate, checkRoleCodeValidator, validate, RoleController.checkRoleCode);

/**
 * @route   GET /api/role/list
 * @desc    Get role list with pagination and filters
 * @access  Private
 * Requirement: 4.1
 */
router.get('/list', authenticate, getRolesValidator, validate, RoleController.getRoles);

/**
 * @route   GET /api/role/:id/users
 * @desc    Check if role has associated users
 * @access  Private
 * Requirement: 4.6
 */
router.get('/:id/users', authenticate, getRoleByIdValidator, validate, RoleController.checkRoleUsers);

/**
 * @route   GET /api/role/:id
 * @desc    Get role by ID
 * @access  Private
 * Requirement: 4.1
 */
router.get('/:id', authenticate, getRoleByIdValidator, validate, RoleController.getRoleById);


/**
 * @route   POST /api/role
 * @desc    Create new role
 * @access  Private
 * Requirement: 4.2
 */
router.post('/', authenticate, createRoleValidator, validate, RoleController.createRole);

/**
 * @route   PUT /api/role/:id/permissions
 * @desc    Update role permissions (menu assignments)
 * @access  Private
 * Requirement: 4.4
 */
router.put('/:id/permissions', authenticate, updateRolePermissionsValidator, validate, RoleController.updateRolePermissions);

/**
 * @route   PUT /api/role/:id
 * @desc    Update role
 * @access  Private
 * Requirement: 4.3
 */
router.put('/:id', authenticate, updateRoleValidator, validate, RoleController.updateRole);

/**
 * @route   DELETE /api/role/:id
 * @desc    Delete role (soft delete)
 * @access  Private
 * Requirement: 4.6
 */
router.delete('/:id', authenticate, deleteRoleValidator, validate, RoleController.deleteRole);

module.exports = router;
