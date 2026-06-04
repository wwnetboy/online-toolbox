/**
 * Route Aggregation
 * Combines all route modules into a single router
 * Requirements: All API routes
 */

const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');
const menuRoutes = require('./menu.routes');
const categoryRoutes = require('./category.routes');
const toolRoutes = require('./tool.routes');
const feedbackRoutes = require('./feedback.routes');
const statsRoutes = require('./stats.routes');
const settingsRoutes = require('./settings.routes');
const { router: uploadRoutes } = require('./upload.routes');
const iconUploadRoutes = require('./icon-upload.routes');
const permissionRoutes = require('./permission.routes');
const pdfConvertRoutes = require('./pdf-convert.routes');
const pdfCropRoutes = require('./pdf-crop.routes');
const ocrRoutes = require('./ocr.routes');

const router = express.Router();

/**
 * API Routes Configuration
 * All routes are prefixed with /api in app.js
 */

// Authentication routes - /api/auth
// Requirements: 1.1, 1.2, 1.6, 1.7
router.use('/auth', authRoutes);

// User management routes - /api/user
// Requirements: 2.1-2.7, 3.1-3.3
router.use('/user', userRoutes);

// Role management routes - /api/role
// Requirements: 4.1-4.7
router.use('/role', roleRoutes);

// Menu management routes - /api/menu
// Requirements: 5.1-5.6
router.use('/menu', menuRoutes);

// Category management routes - /api/category
// Requirements: 7.1-7.8
router.use('/category', categoryRoutes);

// Tool management routes - /api/tool
// Requirements: 6.1-6.8
router.use('/tool', toolRoutes);

// Feedback management routes - /api/feedback
// Requirements: 8.1-8.8
router.use('/feedback', feedbackRoutes);

// Statistics routes - /api/stats
// Requirements: 9.1-9.7
router.use('/stats', statsRoutes);

// Site settings routes - /api/settings
router.use('/settings', settingsRoutes);

// File upload routes - /api/upload
// Requirements: 13.1-13.7
router.use('/upload', uploadRoutes);

// Icon upload routes - /api/upload/icon
// Requirements: 5.1, 5.4, 5.5
router.use('/upload/icon', iconUploadRoutes);

// Permission routes - /api/permission
// Requirements: 1.1, 1.2, 1.3, 1.6
router.use('/permission', permissionRoutes);

// PDF conversion routes - /api/pdf/convert
// Requirements: 5, 6, 7, 10, 11, 12
router.use('/pdf/convert', pdfConvertRoutes);

// PDF crop routes - /api/pdf/crop
// Requirements: 4.1, 4.2, 4.5
router.use('/pdf/crop', pdfCropRoutes);

// PDF decrypt routes - /api/pdf/decrypt
router.use('/pdf/decrypt', require('./pdf-decrypt.routes'));

// OCR routes - /api/pdf/ocr
// Requirements: 3.1, 3.2, 3.4
router.use('/pdf/ocr', ocrRoutes);

// Video conversion routes - /api/video/convert
router.use('/video/convert', require('./video-convert.routes'));

// Video extraction routes - /api/video/extract
router.use('/video/extract', require('./video-extractor.routes'));

/**
 * Health check endpoint
 * @route GET /api/health
 * @desc Check if API is running
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    code: 200,
    message: 'API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

/**
 * API version endpoint
 * @route GET /api/version
 * @desc Get API version information
 * @access Public
 */
router.get('/version', (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: {
      version: '1.0.0',
      name: 'Toolbox Backend API',
      description: 'Backend API service for Toolbox management system',
    },
  });
});

module.exports = router;
