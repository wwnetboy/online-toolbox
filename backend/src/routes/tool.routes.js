/**
 * Tool Management Routes
 * Requirements: 6.1-6.8
 */

const express = require('express');
const ToolController = require('../controllers/tool.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validator.middleware');
const {
  getToolsValidator,
  createToolValidator,
  updateToolValidator,
  toggleToolStatusValidator,
  deleteToolValidator,
  getToolByIdValidator,
  updateToolSortValidator,
  batchDeleteToolsValidator,
  batchToggleStatusValidator,
} = require('../validators/tool.validator');

const router = express.Router();

/**
 * @route   GET /api/tool/public/list
 * @desc    Get enabled tools for public access (no auth required)
 * @access  Public
 */
router.get('/public/list', ToolController.getPublicTools);

/**
 * @route   GET /api/tool/list
 * @desc    Get tools with pagination and filtering
 * @access  Private
 * Requirements: 6.1, 6.6
 */
router.get('/list', authenticate, getToolsValidator, validate, ToolController.getTools);

/**
 * @route   POST /api/tool/reset
 * @desc    Reset tools to default configuration
 * @access  Private
 * Requirement: 6.7
 */
router.post('/reset', authenticate, ToolController.resetTools);

/**
 * @route   PUT /api/tool/sort
 * @desc    Update tool sort order (batch update)
 * @access  Private
 * Requirement: 6.3
 */
router.put('/sort', authenticate, updateToolSortValidator, validate, ToolController.updateToolSort);

/**
 * @route   DELETE /api/tool/batch
 * @desc    Batch delete tools (soft delete)
 * @access  Private
 * Requirement: 6.5
 */
router.delete('/batch', authenticate, batchDeleteToolsValidator, validate, ToolController.batchDeleteTools);

/**
 * @route   PUT /api/tool/batch/status
 * @desc    Batch toggle tool status
 * @access  Private
 * Requirement: 6.4
 */
router.put('/batch/status', authenticate, batchToggleStatusValidator, validate, ToolController.batchToggleStatus);

/**
 * @route   PUT /api/tool/:id/toggle
 * @desc    Toggle tool enabled status
 * @access  Private
 * Requirement: 6.4
 */
router.put('/:id/toggle', authenticate, toggleToolStatusValidator, validate, ToolController.toggleToolStatus);

/**
 * @route   GET /api/tool/:id
 * @desc    Get tool by ID
 * @access  Private
 * Requirement: 6.1
 */
router.get('/:id', authenticate, getToolByIdValidator, validate, ToolController.getToolById);

/**
 * @route   POST /api/tool
 * @desc    Create new tool
 * @access  Private
 * Requirement: 6.2
 */
router.post('/', authenticate, createToolValidator, validate, ToolController.createTool);

/**
 * @route   PUT /api/tool/:id
 * @desc    Update tool
 * @access  Private
 * Requirement: 6.3
 */
router.put('/:id', authenticate, updateToolValidator, validate, ToolController.updateTool);

/**
 * @route   DELETE /api/tool/:id
 * @desc    Delete tool (soft delete)
 * @access  Private
 * Requirement: 6.5
 */
router.delete('/:id', authenticate, deleteToolValidator, validate, ToolController.deleteTool);

module.exports = router;
