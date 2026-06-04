/**
 * PDF Conversion Routes
 * Handles PDF conversion API endpoints
 * Requirements: 5, 6, 7, 10, 11, 12
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const PdfConvertController = require('../controllers/pdf-convert.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const config = require('../config');

const router = express.Router();

/**
 * Configure multer for PDF/Office file uploads
 * Supports larger files for document conversion
 */
const CONVERSION_UPLOAD_DIR = process.env.CONVERSION_UPLOAD_PATH || 'uploads/conversion-input';

// Ensure upload directory exists
const ensureUploadDir = () => {
  const uploadPath = path.resolve(CONVERSION_UPLOAD_DIR);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

/**
 * Allowed file types for conversion
 */
const ALLOWED_CONVERSION_TYPES = {
  // Office documents
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/mspowerpoint': ['.ppt'],
  'application/powerpoint': ['.ppt'],
  'application/x-mspowerpoint': ['.ppt'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  // PDF
  'application/pdf': ['.pdf'],
  // HTML
  'text/html': ['.html', '.htm'],
};

const ALLOWED_CONVERSION_EXTS = new Set(
  Object.values(ALLOWED_CONVERSION_TYPES).flat().map(ext => ext.toLowerCase())
);

/**
 * Generate unique filename for uploaded files
 */
const generateUniqueFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomBytes}${ext}`;
};

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = ensureUploadDir();
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  },
});

/**
 * File filter for conversion uploads
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtsText = Array.from(ALLOWED_CONVERSION_EXTS).sort().join(', ');

  const allowedByExt = ALLOWED_CONVERSION_EXTS.has(ext);
  const allowedByMime = Boolean(ALLOWED_CONVERSION_TYPES[file.mimetype]);

  if (allowedByExt || allowedByMime) {
    cb(null, true);
    return;
  }

  cb(new Error(`不支持的文件类型。支持的格式: ${allowedExtsText}`), false);
};

/**
 * Multer upload instance for conversion
 * Max file size: 50MB for document conversion
 */
const conversionUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.CONVERSION_MAX_FILE_SIZE, 10) || 50 * 1024 * 1024, // 50MB
  },
});

/**
 * @route   GET /api/pdf/convert/types
 * @desc    Get supported conversion types
 * @access  Public
 */
router.get('/types', PdfConvertController.getSupportedTypes);

/**
 * @route   GET /api/pdf/convert/status
 * @desc    Check system status (LibreOffice availability)
 * @access  Public
 */
router.get('/status', PdfConvertController.checkSystemStatus);

/**
 * @route   GET /api/pdf/convert/tasks
 * @desc    Get user's conversion tasks
 * @access  Private/Public (with visitor ID)
 */
router.get('/tasks', optionalAuth, PdfConvertController.getUserTasks);

/**
 * @route   POST /api/pdf/convert
 * @desc    Submit a conversion task
 * @access  Private/Public (with visitor ID)
 * Requirements: 5, 6, 7, 10, 11, 12
 */
router.post(
  '/',
  optionalAuth,
  conversionUpload.single('file'),
  PdfConvertController.handleUploadError,
  PdfConvertController.submitConversion
);

/**
 * @route   GET /api/pdf/convert/:taskId
 * @desc    Get task status
 * @access  Public
 * Requirements: 5, 6, 7, 10, 11, 12
 */
router.get('/:taskId', PdfConvertController.getTaskStatus);

/**
 * @route   GET /api/pdf/convert/:taskId/download
 * @desc    Download conversion result
 * @access  Public
 * Requirements: 5, 6, 7, 10, 11, 12
 */
router.get('/:taskId/download', PdfConvertController.downloadResult);

/**
 * @route   DELETE /api/pdf/convert/:taskId
 * @desc    Delete a conversion task
 * @access  Private/Public (with visitor ID)
 */
router.delete('/:taskId', optionalAuth, PdfConvertController.deleteTask);

module.exports = router;
