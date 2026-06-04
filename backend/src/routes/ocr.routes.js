/**
 * OCR Routes
 * Handles OCR API endpoints
 * Requirements: 3.1, 3.2, 3.4
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const OcrController = require('../controllers/ocr.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * Configure multer for PDF file uploads for OCR
 */
const OCR_UPLOAD_DIR = process.env.OCR_UPLOAD_PATH || 'uploads/ocr-input';

// Ensure upload directory exists
const ensureUploadDir = () => {
  const uploadPath = path.resolve(OCR_UPLOAD_DIR);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

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
 * File filter for OCR uploads - only PDF files
 */
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('仅支持PDF文件'), false);
  }
};

/**
 * Multer upload instance for OCR
 * Max file size: 100MB for OCR processing
 */
const ocrUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.OCR_MAX_FILE_SIZE, 10) || 100 * 1024 * 1024, // 100MB
  },
});

/**
 * @route   GET /api/pdf/ocr/languages
 * @desc    Get supported OCR languages
 * @access  Public
 */
router.get('/languages', OcrController.getSupportedLanguages);

/**
 * @route   GET /api/pdf/ocr/status
 * @desc    Check OCR system status (Tesseract availability)
 * @access  Public
 */
router.get('/status', OcrController.checkSystemStatus);

/**
 * @route   GET /api/pdf/ocr/tasks
 * @desc    Get user's OCR tasks
 * @access  Private/Public (with visitor ID)
 */
router.get('/tasks', optionalAuth, OcrController.getUserTasks);

/**
 * @route   POST /api/pdf/ocr
 * @desc    Submit an OCR task
 * @access  Private/Public (with visitor ID)
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
router.post(
  '/',
  optionalAuth,
  ocrUpload.single('file'),
  OcrController.handleUploadError,
  OcrController.submitOcrTask
);

/**
 * @route   GET /api/pdf/ocr/:taskId
 * @desc    Get OCR task status
 * @access  Public
 * Requirements: 3.1, 3.2, 3.4
 */
router.get('/:taskId', OcrController.getTaskStatus);

/**
 * @route   GET /api/pdf/ocr/:taskId/download
 * @desc    Download OCR result (searchable PDF or text file)
 * @access  Public
 * Requirements: 3.1, 3.2, 3.4
 */
router.get('/:taskId/download', OcrController.downloadResult);

/**
 * @route   GET /api/pdf/ocr/:taskId/text
 * @desc    Get OCR text result
 * @access  Public
 * Requirements: 3.1, 3.2
 */
router.get('/:taskId/text', OcrController.getTextResult);

/**
 * @route   DELETE /api/pdf/ocr/:taskId
 * @desc    Delete an OCR task
 * @access  Private/Public (with visitor ID)
 */
router.delete('/:taskId', optionalAuth, OcrController.deleteTask);

module.exports = router;
