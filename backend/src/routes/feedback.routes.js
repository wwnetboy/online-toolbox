/**
 * Feedback Management Routes
 * Requirements: 8.1-8.8
 */

const express = require('express');
const FeedbackController = require('../controllers/feedback.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validator.middleware');
const {
  getFeedbacksValidator,
  createFeedbackValidator,
  getFeedbackByIdValidator,
  updateFeedbackStatusValidator,
  resolveFeedbackValidator,
  deleteFeedbackValidator,
  batchResolveFeedbacksValidator,
  batchDeleteFeedbacksValidator,
  batchUpdateStatusValidator,
} = require('../validators/feedback.validator');

const router = express.Router();

/**
 * @route   GET /api/feedback/list
 * @desc    Get feedbacks with pagination and filtering
 * @access  Private
 * Requirements: 8.2, 8.7
 */
router.get('/list', authenticate, getFeedbacksValidator, validate, FeedbackController.getFeedbacks);

/**
 * @route   PUT /api/feedback/batch/resolve
 * @desc    Batch resolve feedbacks
 * @access  Private
 * Requirement: 8.4
 */
router.put('/batch/resolve', authenticate, batchResolveFeedbacksValidator, validate, FeedbackController.batchResolveFeedbacks);

/**
 * @route   PUT /api/feedback/batch/status
 * @desc    Batch update feedback status
 * @access  Private
 * Requirement: 8.4
 */
router.put('/batch/status', authenticate, batchUpdateStatusValidator, validate, FeedbackController.batchUpdateStatus);

/**
 * @route   DELETE /api/feedback/batch
 * @desc    Batch delete feedbacks (soft delete)
 * @access  Private
 * Requirement: 8.6
 */
router.delete('/batch', authenticate, batchDeleteFeedbacksValidator, validate, FeedbackController.batchDeleteFeedbacks);

/**
 * @route   PUT /api/feedback/:id/resolve
 * @desc    Resolve feedback with optional reply
 * @access  Private
 * Requirement: 8.3
 */
router.put('/:id/resolve', authenticate, resolveFeedbackValidator, validate, FeedbackController.resolveFeedback);

/**
 * @route   PUT /api/feedback/:id/status
 * @desc    Update feedback status
 * @access  Private
 * Requirement: 8.3
 */
router.put('/:id/status', authenticate, updateFeedbackStatusValidator, validate, FeedbackController.updateFeedbackStatus);

/**
 * @route   GET /api/feedback/:id
 * @desc    Get feedback by ID
 * @access  Private
 * Requirement: 8.2
 */
router.get('/:id', authenticate, getFeedbackByIdValidator, validate, FeedbackController.getFeedbackById);

/**
 * @route   POST /api/feedback
 * @desc    Create new feedback
 * @access  Public (users can submit feedback without authentication)
 * Requirement: 8.1
 */
router.post('/', createFeedbackValidator, validate, FeedbackController.createFeedback);

/**
 * @route   DELETE /api/feedback/:id
 * @desc    Delete feedback (soft delete)
 * @access  Private
 * Requirement: 8.5
 */
router.delete('/:id', authenticate, deleteFeedbackValidator, validate, FeedbackController.deleteFeedback);

module.exports = router;
