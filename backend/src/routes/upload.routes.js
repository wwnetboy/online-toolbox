/**
 * File Upload Routes
 * Requirements: 13.7
 */

const express = require('express');
const path = require('path');
const UploadController = require('../controllers/upload.controller');
const { UploadService } = require('../services/upload.service');
const { authenticate } = require('../middlewares/auth.middleware');
const config = require('../config');

const router = express.Router();

/**
 * @route   POST /api/upload
 * @desc    Upload single file
 * @access  Private
 * Requirement: 13.7
 */
router.post(
  '/',
  authenticate,
  UploadService.single('file'),
  UploadController.handleUploadError,
  UploadController.uploadFile
);

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files
 * @access  Private
 * Requirement: 13.7
 */
router.post(
  '/multiple',
  authenticate,
  UploadService.multiple('files', 10),
  UploadController.handleUploadError,
  UploadController.uploadMultipleFiles
);

/**
 * @route   POST /api/upload/avatar
 * @desc    Upload avatar image
 * @access  Private
 * Requirement: 13.7
 */
router.post(
  '/avatar',
  authenticate,
  UploadService.single('avatar'),
  UploadController.handleUploadError,
  UploadController.uploadFile
);

/**
 * @route   POST /api/upload/background
 * @desc    Upload background image
 * @access  Private
 * Requirement: 13.7
 */
router.post(
  '/background',
  authenticate,
  UploadService.single('background'),
  UploadController.handleUploadError,
  UploadController.uploadFile
);

/**
 * @route   GET /api/upload/:filename
 * @desc    Get file info
 * @access  Private
 */
router.get(
  '/:filename',
  authenticate,
  UploadController.getFileInfo
);

/**
 * @route   DELETE /api/upload/:filename
 * @desc    Delete uploaded file
 * @access  Private
 */
router.delete(
  '/:filename',
  authenticate,
  UploadController.deleteFile
);

/**
 * Configure static file serving for uploads
 * This should be used in the main app.js
 * @param {Express} app - Express application instance
 */
const configureStaticFiles = (app) => {
  const uploadPath = path.resolve(config.upload.path);
  app.use('/uploads', express.static(uploadPath));
};

module.exports = {
  router,
  configureStaticFiles,
};
