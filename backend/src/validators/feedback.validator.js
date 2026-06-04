/**
 * Feedback Validators
 * Validates feedback management requests
 * Requirement: 8.1
 */

const { body, param, query } = require('express-validator');

/**
 * Get feedbacks list request validation
 * Requirements: 8.2, 8.7
 */
const getFeedbacksValidator = [
  query('current')
    .optional()
    .isInt({ min: 1 })
    .withMessage('当前页码必须是正整数'),

  query('size')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须是1-100之间的整数'),

  query('type')
    .optional()
    .isIn(['suggestion', 'bug', 'other'])
    .withMessage('反馈类型必须是 suggestion、bug 或 other'),

  query('status')
    .optional()
    .isIn(['pending', 'processing', 'resolved'])
    .withMessage('状态必须是 pending、processing 或 resolved'),

  query('toolName')
    .optional()
    .isString()
    .withMessage('工具名称必须是字符串')
    .trim(),
];

/**
 * Create feedback request validation
 * Requirement: 8.1
 */
const createFeedbackValidator = [
  body('type')
    .notEmpty()
    .withMessage('反馈类型不能为空')
    .isIn(['suggestion', 'bug', 'other'])
    .withMessage('反馈类型必须是 suggestion、bug 或 other'),

  body('toolId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('工具ID必须是正整数'),

  body('content')
    .notEmpty()
    .withMessage('反馈内容不能为空')
    .isString()
    .withMessage('反馈内容必须是字符串')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('反馈内容长度应在1-2000个字符之间'),

  body('contact')
    .optional({ nullable: true })
    .isString()
    .withMessage('联系方式必须是字符串')
    .trim()
    .isLength({ max: 255 })
    .withMessage('联系方式长度不能超过255个字符'),
];


/**
 * Get feedback by ID request validation
 */
const getFeedbackByIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('反馈ID必须是正整数'),
];

/**
 * Update feedback status request validation
 * Requirement: 8.3
 */
const updateFeedbackStatusValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('反馈ID必须是正整数'),

  body('status')
    .notEmpty()
    .withMessage('状态不能为空')
    .isIn(['pending', 'processing', 'resolved'])
    .withMessage('状态必须是 pending、processing 或 resolved'),
];

/**
 * Resolve feedback request validation
 * Requirement: 8.3
 */
const resolveFeedbackValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('反馈ID必须是正整数'),

  body('reply')
    .optional({ nullable: true })
    .isString()
    .withMessage('回复内容必须是字符串')
    .trim()
    .isLength({ max: 2000 })
    .withMessage('回复内容长度不能超过2000个字符'),
];

/**
 * Delete feedback request validation
 * Requirement: 8.5
 */
const deleteFeedbackValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('反馈ID必须是正整数'),
];

/**
 * Batch resolve feedbacks request validation
 * Requirement: 8.4
 */
const batchResolveFeedbacksValidator = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('反馈ID列表必须是非空数组'),

  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('反馈ID必须是正整数'),

  body('reply')
    .optional({ nullable: true })
    .isString()
    .withMessage('回复内容必须是字符串')
    .trim()
    .isLength({ max: 2000 })
    .withMessage('回复内容长度不能超过2000个字符'),
];

/**
 * Batch delete feedbacks request validation
 * Requirement: 8.6
 */
const batchDeleteFeedbacksValidator = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('反馈ID列表必须是非空数组'),

  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('反馈ID必须是正整数'),
];

/**
 * Batch update status request validation
 * Requirement: 8.4
 */
const batchUpdateStatusValidator = [
  body('ids')
    .isArray({ min: 1 })
    .withMessage('反馈ID列表必须是非空数组'),

  body('ids.*')
    .isInt({ min: 1 })
    .withMessage('反馈ID必须是正整数'),

  body('status')
    .notEmpty()
    .withMessage('状态不能为空')
    .isIn(['pending', 'processing', 'resolved'])
    .withMessage('状态必须是 pending、processing 或 resolved'),
];

module.exports = {
  getFeedbacksValidator,
  createFeedbackValidator,
  getFeedbackByIdValidator,
  updateFeedbackStatusValidator,
  resolveFeedbackValidator,
  deleteFeedbackValidator,
  batchResolveFeedbacksValidator,
  batchDeleteFeedbacksValidator,
  batchUpdateStatusValidator,
};
