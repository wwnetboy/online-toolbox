/**
 * Category Management Routes
 * Requirements: 7.1-7.8
 */

const express = require('express');
const CategoryController = require('../controllers/category.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validator.middleware');
const {
  createCategoryValidator,
  updateCategoryValidator,
  updateCategorySortValidator,
  deleteCategoryValidator,
  getCategoryByIdValidator,
  checkIdentifierValidator,
} = require('../validators/category.validator');

const router = express.Router();

/**
 * @route   GET /api/category/public/list
 * @desc    Get enabled categories for public access (no auth required)
 * @access  Public
 */
router.get('/public/list', CategoryController.getPublicCategories);

/**
 * @route   GET /api/category/list
 * @desc    Get all categories sorted by sort field
 * @access  Private
 * Requirement: 7.1
 */
router.get('/list', authenticate, CategoryController.getCategories);

/**
 * @route   GET /api/category/check-identifier
 * @desc    Check if category identifier exists
 * @access  Private
 * Requirement: 7.2
 */
router.get('/check-identifier', authenticate, checkIdentifierValidator, validate, CategoryController.checkIdentifier);

/**
 * @route   POST /api/category/reset
 * @desc    Reset categories to default configuration
 * @access  Private
 * Requirement: 7.7
 */
router.post('/reset', authenticate, CategoryController.resetCategories);

/**
 * @route   PUT /api/category/sort
 * @desc    Update category sort order (batch update)
 * @access  Private
 * Requirement: 7.4
 */
router.put('/sort', authenticate, updateCategorySortValidator, validate, CategoryController.updateCategorySort);

/**
 * @route   GET /api/category/:id/is-system
 * @desc    Check if category is a system category
 * @access  Private
 * Requirement: 7.6
 */
router.get('/:id/is-system', authenticate, getCategoryByIdValidator, validate, CategoryController.checkIsSystem);

/**
 * @route   GET /api/category/:id/tools
 * @desc    Check if category has associated tools
 * @access  Private
 * Requirement: 7.5
 */
router.get('/:id/tools', authenticate, getCategoryByIdValidator, validate, CategoryController.checkCategoryTools);

/**
 * @route   GET /api/category/:id
 * @desc    Get category by ID
 * @access  Private
 * Requirement: 7.1
 */
router.get('/:id', authenticate, getCategoryByIdValidator, validate, CategoryController.getCategoryById);

/**
 * @route   POST /api/category
 * @desc    Create new category
 * @access  Private
 * Requirement: 7.2
 */
router.post('/', authenticate, createCategoryValidator, validate, CategoryController.createCategory);

/**
 * @route   PUT /api/category/:id
 * @desc    Update category
 * @access  Private
 * Requirement: 7.3
 */
router.put('/:id', authenticate, updateCategoryValidator, validate, CategoryController.updateCategory);

/**
 * @route   DELETE /api/category/:id
 * @desc    Delete category (soft delete)
 * @access  Private
 * Requirements: 7.5, 7.6
 */
router.delete('/:id', authenticate, deleteCategoryValidator, validate, CategoryController.deleteCategory);

module.exports = router;
