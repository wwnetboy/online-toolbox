const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validator.middleware');
const {
  createUserValidator,
  updateUserValidator,
  deleteUserValidator,
  batchDeleteUsersValidator,
  getUsersValidator,
  updateProfileValidator,
  updatePasswordValidator,
  checkUserNameValidator,
  checkEmailValidator,
} = require('../validators/user.validator');

const router = express.Router();

/**
 * User Management Routes
 * Requirements: 2.1-2.7, 3.1-3.3
 */

/**
 * @route   GET /api/user/info
 * @desc    Get current user info
 * @access  Private
 * Requirement: 3.1
 */
router.get('/info', authenticate, UserController.getCurrentUserInfo);

/**
 * @route   GET /api/user/check-username
 * @desc    Check if username exists
 * @access  Private
 * Requirement: 2.6
 */
router.get('/check-username', authenticate, checkUserNameValidator, validate, UserController.checkUserName);

/**
 * @route   GET /api/user/check-email
 * @desc    Check if email exists
 * @access  Private
 * Requirement: 2.6
 */
router.get('/check-email', authenticate, checkEmailValidator, validate, UserController.checkEmail);

/**
 * @route   GET /api/user/list
 * @desc    Get user list with pagination and filters
 * @access  Private
 * Requirement: 2.1, 2.5
 */
router.get('/list', authenticate, getUsersValidator, validate, UserController.getUsers);

/**
 * @route   GET /api/user/:id
 * @desc    Get user by ID
 * @access  Private
 * Requirement: 2.1
 */
router.get('/:id', authenticate, UserController.getUserById);

/**
 * @route   POST /api/user
 * @desc    Create new user
 * @access  Private
 * Requirement: 2.2, 2.6
 */
router.post('/', authenticate, createUserValidator, validate, UserController.createUser);

/**
 * @route   PUT /api/user/profile
 * @desc    Update current user profile
 * @access  Private
 * Requirement: 3.2
 */
router.put('/profile', authenticate, updateProfileValidator, validate, UserController.updateProfile);

/**
 * @route   PUT /api/user/password
 * @desc    Update current user password
 * @access  Private
 * Requirement: 3.3
 */
router.put('/password', authenticate, updatePasswordValidator, validate, UserController.updatePassword);

/**
 * @route   PUT /api/user/:id
 * @desc    Update user
 * @access  Private
 * Requirement: 2.3
 */
router.put('/:id', authenticate, updateUserValidator, validate, UserController.updateUser);

/**
 * @route   DELETE /api/user/batch
 * @desc    Batch delete users
 * @access  Private
 * Requirement: 2.4
 */
router.delete('/batch', authenticate, batchDeleteUsersValidator, validate, UserController.batchDeleteUsers);

/**
 * @route   DELETE /api/user/:id
 * @desc    Delete user
 * @access  Private
 * Requirement: 2.4
 */
router.delete('/:id', authenticate, deleteUserValidator, validate, UserController.deleteUser);

module.exports = router;
