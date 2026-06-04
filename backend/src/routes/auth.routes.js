const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validator.middleware');
const {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  logoutValidator,
} = require('../validators/auth.validator');

const router = express.Router();

/**
 * Authentication Routes
 * Requirements: 1.1, 1.2, 1.6, 1.7
 */

/**
 * @route   POST /api/auth/register
 * @desc    User registration
 * @access  Public
 */
router.post('/register', registerValidator, validate, AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 * Requirement: 1.1
 */
router.post('/login', loginValidator, validate, AuthController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * Requirement: 1.6
 */
router.post('/refresh', refreshTokenValidator, validate, AuthController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Private (optional auth - can logout without valid token)
 * Requirement: 1.7
 */
router.post('/logout', logoutValidator, validate, AuthController.logout);

module.exports = router;
