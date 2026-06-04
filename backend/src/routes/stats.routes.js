/**
 * Statistics Routes
 * Requirements: 9.1-9.7
 */

const express = require('express');
const StatsController = require('../controllers/stats.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validator.middleware');
const { query, body, param } = require('express-validator');

const router = express.Router();

// Validators
const getStatsValidator = [
  query('timeRange')
    .optional()
    .isIn(['today', 'week', 'month', 'year'])
    .withMessage('时间范围必须是 today, week, month, year 之一'),
];

const recordVisitValidator = [
  body('visitorId')
    .notEmpty()
    .withMessage('访客ID不能为空')
    .isString()
    .withMessage('访客ID必须是字符串')
    .isLength({ max: 64 })
    .withMessage('访客ID长度不能超过64个字符'),
  body('pagePath')
    .notEmpty()
    .withMessage('页面路径不能为空')
    .isString()
    .withMessage('页面路径必须是字符串')
    .isLength({ max: 255 })
    .withMessage('页面路径长度不能超过255个字符'),
];

const recordClickValidator = [
  body('visitorId')
    .notEmpty()
    .withMessage('访客ID不能为空')
    .isString()
    .withMessage('访客ID必须是字符串')
    .isLength({ max: 64 })
    .withMessage('访客ID长度不能超过64个字符'),
  body('elementId')
    .optional()
    .isString()
    .withMessage('元素ID必须是字符串')
    .isLength({ max: 100 })
    .withMessage('元素ID长度不能超过100个字符'),
  body('pagePath')
    .notEmpty()
    .withMessage('页面路径不能为空')
    .isString()
    .withMessage('页面路径必须是字符串')
    .isLength({ max: 255 })
    .withMessage('页面路径长度不能超过255个字符'),
];

const getVisitsValidator = [
  query('current')
    .optional()
    .isInt({ min: 1 })
    .withMessage('当前页码必须是正整数'),
  query('size')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须是1-100之间的整数'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式不正确'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式不正确'),
  query('pagePath')
    .optional()
    .isString()
    .withMessage('页面路径必须是字符串'),
];

const getClicksValidator = [
  query('current')
    .optional()
    .isInt({ min: 1 })
    .withMessage('当前页码必须是正整数'),
  query('size')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须是1-100之间的整数'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式不正确'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式不正确'),
  query('elementId')
    .optional()
    .isString()
    .withMessage('元素ID必须是字符串'),
];

/**
 * @route   GET /api/stats
 * @desc    Get aggregated statistics
 * @access  Private
 * Requirements: 9.1, 9.2, 9.6, 9.7
 */
router.get('/', authenticate, getStatsValidator, validate, StatsController.getStats);

/**
 * @route   GET /api/stats/online-visitors
 * @desc    Get online visitors count
 * @access  Private
 * Requirement: 9.3
 */
router.get('/online-visitors', authenticate, StatsController.getOnlineVisitors);

/**
 * @route   GET /api/stats/visits
 * @desc    Get visit records with pagination
 * @access  Private
 * Requirement: 9.4
 */
router.get('/visits', authenticate, getVisitsValidator, validate, StatsController.getVisits);

/**
 * @route   GET /api/stats/clicks
 * @desc    Get click records with pagination
 * @access  Private
 * Requirement: 9.5
 */
router.get('/clicks', authenticate, getClicksValidator, validate, StatsController.getClicks);

/**
 * @route   POST /api/stats/visit
 * @desc    Record a page visit
 * @access  Public (tracking endpoint)
 * Requirement: 9.4
 */
router.post('/visit', recordVisitValidator, validate, StatsController.recordVisit);

/**
 * @route   POST /api/stats/click
 * @desc    Record a click event
 * @access  Public (tracking endpoint)
 * Requirement: 9.5
 */
router.post('/click', recordClickValidator, validate, StatsController.recordClick);

/**
 * @route   GET /api/stats/total-usage
 * @desc    Get total usage count
 * @access  Public
 */
router.get('/total-usage', StatsController.getTotalUsage);

/**
 * @route   GET /api/stats/visit-trend
 * @desc    Get monthly visit trend for current year
 * @access  Private
 */
router.get('/visit-trend', authenticate, StatsController.getVisitTrend);

/**
 * @route   GET /api/stats/user-overview
 * @desc    Get user overview stats
 * @access  Private
 */
router.get('/user-overview', authenticate, StatsController.getUserOverview);

module.exports = router;
