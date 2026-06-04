const express = require('express');
const PermissionController = require('../controllers/permission.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validator.middleware');
const { body, param } = require('express-validator');

const router = express.Router();

/**
 * Permission Routes
 * Requirements: 1.1, 1.2, 1.3
 */

/**
 * @route   GET /api/permission/config/:featureId
 * @desc    Get feature configuration
 * @access  Public
 * Requirement: 1.1
 */
router.get(
  '/config/:featureId',
  [
    param('featureId')
      .notEmpty()
      .withMessage('功能标识不能为空')
      .isString()
      .withMessage('功能标识必须是字符串'),
  ],
  validate,
  PermissionController.getFeatureConfig
);

/**
 * @route   GET /api/permission/configs
 * @desc    Get all feature configurations
 * @access  Public
 * Requirement: 1.1
 */
router.get('/configs', PermissionController.getAllFeatureConfigs);

/**
 * @route   POST /api/permission/check
 * @desc    Check permission for a feature
 * @access  Public (supports both authenticated and guest users)
 * Requirement: 1.2, 1.3
 */
router.post(
  '/check',
  optionalAuth,
  [
    body('featureId')
      .notEmpty()
      .withMessage('功能标识不能为空')
      .isString()
      .withMessage('功能标识必须是字符串'),
    body('visitorId')
      .optional()
      .isString()
      .withMessage('访客标识必须是字符串'),
  ],
  validate,
  PermissionController.checkPermission
);

/**
 * @route   POST /api/permission/record
 * @desc    Record feature usage
 * @access  Public (supports both authenticated and guest users)
 * Requirement: 1.3
 */
router.post(
  '/record',
  optionalAuth,
  [
    body('featureId')
      .notEmpty()
      .withMessage('功能标识不能为空')
      .isString()
      .withMessage('功能标识必须是字符串'),
    body('visitorId')
      .optional()
      .isString()
      .withMessage('访客标识必须是字符串'),
  ],
  validate,
  PermissionController.recordUsage
);

/**
 * @route   POST /api/permission/remaining
 * @desc    Get remaining count for a feature
 * @access  Public (supports both authenticated and guest users)
 * Requirement: 1.6
 */
router.post(
  '/remaining',
  optionalAuth,
  [
    body('featureId')
      .notEmpty()
      .withMessage('功能标识不能为空')
      .isString()
      .withMessage('功能标识必须是字符串'),
    body('visitorId')
      .optional()
      .isString()
      .withMessage('访客标识必须是字符串'),
  ],
  validate,
  PermissionController.getRemainingCount
);

/**
 * @route   GET /api/permission/member
 * @desc    Get member info for current user
 * @access  Public (supports both authenticated and guest users)
 * Requirement: 1.2
 */
router.get('/member', optionalAuth, PermissionController.getMemberInfo);

/**
 * @route   PUT /api/permission/config/:featureId
 * @desc    Update feature configuration (Admin only)
 * @access  Private (Admin)
 * Requirement: 1.4, 1.5
 */
router.put(
  '/config/:featureId',
  authenticate,
  [
    param('featureId')
      .notEmpty()
      .withMessage('功能标识不能为空')
      .isString()
      .withMessage('功能标识必须是字符串'),
    body('featureName')
      .optional()
      .isString()
      .withMessage('功能名称必须是字符串'),
    body('category')
      .optional()
      .isString()
      .withMessage('分类必须是字符串'),
    body('requireMember')
      .optional()
      .isBoolean()
      .withMessage('requireMember必须是布尔值'),
    body('freeTrialCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('免费次数必须是非负整数'),
    body('enabled')
      .optional()
      .isBoolean()
      .withMessage('enabled必须是布尔值'),
  ],
  validate,
  PermissionController.updateFeatureConfig
);

/**
 * @route   PUT /api/permission/batch/:category
 * @desc    Batch update feature configurations by category (Admin only)
 * @access  Private (Admin)
 * Requirement: 1.9
 */
router.put(
  '/batch/:category',
  authenticate,
  [
    param('category')
      .notEmpty()
      .withMessage('分类不能为空')
      .isString()
      .withMessage('分类必须是字符串'),
    body('requireMember')
      .optional()
      .isBoolean()
      .withMessage('requireMember必须是布尔值'),
    body('freeTrialCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('免费次数必须是非负整数'),
    body('enabled')
      .optional()
      .isBoolean()
      .withMessage('enabled必须是布尔值'),
  ],
  validate,
  PermissionController.batchUpdateByCategory
);

module.exports = router;
