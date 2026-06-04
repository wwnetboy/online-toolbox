const express = require('express');
const MenuController = require('../controllers/menu.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validator.middleware');
const {
  createMenuValidator,
  updateMenuValidator,
  deleteMenuValidator,
  getMenuByIdValidator,
} = require('../validators/menu.validator');

const router = express.Router();

/**
 * Menu Management Routes
 * Requirements: 5.1-5.6
 */

/**
 * @route   GET /api/menu/user
 * @desc    Get user menus (filtered by role permissions)
 * @access  Private
 * Requirement: 5.1
 */
router.get('/user', authenticate, MenuController.getUserMenus);

/**
 * @route   GET /api/menu/buttons
 * @desc    Get user's permission buttons
 * @access  Private
 */
router.get('/buttons', authenticate, MenuController.getUserButtons);

/**
 * @route   GET /api/menu/list
 * @desc    Get all menus (for admin management)
 * @access  Private
 * Requirement: 5.1
 */
router.get('/list', authenticate, MenuController.getAllMenus);

/**
 * @route   GET /api/menu/:id
 * @desc    Get menu by ID
 * @access  Private
 */
router.get('/:id', authenticate, getMenuByIdValidator, validate, MenuController.getMenuById);

/**
 * @route   POST /api/menu
 * @desc    Create new menu
 * @access  Private
 * Requirement: 5.3
 */
router.post('/', authenticate, createMenuValidator, validate, MenuController.createMenu);

/**
 * @route   PUT /api/menu/:id
 * @desc    Update menu
 * @access  Private
 * Requirement: 5.4
 */
router.put('/:id', authenticate, updateMenuValidator, validate, MenuController.updateMenu);

/**
 * @route   DELETE /api/menu/:id
 * @desc    Delete menu (soft delete)
 * @access  Private
 * Requirement: 5.5
 */
router.delete('/:id', authenticate, deleteMenuValidator, validate, MenuController.deleteMenu);

module.exports = router;
