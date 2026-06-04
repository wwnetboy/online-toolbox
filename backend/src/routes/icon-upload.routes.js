/**
 * Icon Upload Routes
 * Handles tool icon upload endpoints
 * Requirements: 5.1, 5.4, 5.5
 */

const express = require('express');
const IconUploadController = require('../controllers/icon-upload.controller');
const { IconUploadService } = require('../services/icon-upload.service');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/upload/icon
 * @desc    Upload tool icon (PNG or SVG, max 2MB)
 * @access  Private (requires authentication)
 * Requirements: 5.1, 5.4, 5.5
 */
router.post(
  '/',
  authenticate,
  IconUploadService.getMulterConfig(),
  IconUploadController.handleUploadError,
  IconUploadController.uploadIcon
);

/**
 * @route   DELETE /api/upload/icon/:filename
 * @desc    Delete tool icon
 * @access  Private (requires authentication)
 * Requirements: 5.1, 5.4
 */
router.delete(
  '/:filename',
  authenticate,
  IconUploadController.deleteIcon
);

module.exports = router;
