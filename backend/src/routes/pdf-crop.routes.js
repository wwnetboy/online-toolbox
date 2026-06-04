/**
 * PDF Crop Routes
 * Handles PDF cropping API endpoints
 * Requirements: 4.1
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const PdfCropController = require('../controllers/pdf-crop.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * Configure multer for PDF file uploads
 */
const CROP_UPLOAD_DIR = process.env.CROP_UPLOAD_PATH || 'uploads/crop-input';

/**
 * Ensure upload directory exists
 */
const ensureUploadDir = () => {
  const uploadPath = path.resolve(CROP_UPLOAD_DIR);
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
 * File filter for PDF uploads
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Accept PDF files
  if (ext === '.pdf' || file.mimetype === 'application/pdf') {
    cb(null, true);
    return;
  }

  cb(new Error('不支持的文件类型。仅支持 PDF 文件'), false);
};

/**
 * Multer upload instance for PDF crop
 * Max file size: 100MB
 */
const cropUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.CROP_MAX_FILE_SIZE, 10) || 100 * 1024 * 1024, // 100MB
  },
});

/**
 * @route   GET /api/pdf/crop/tasks
 * @desc    Get user's crop tasks
 * @access  Private/Public (with visitor ID)
 */
router.get('/tasks', optionalAuth, PdfCropController.getUserTasks);

/**
 * @route   POST /api/pdf/crop
 * @desc    Submit a crop task
 * @access  Private/Public (with visitor ID)
 * Requirements: 4.1, 4.2
 */
router.post(
  '/',
  optionalAuth,
  cropUpload.single('file'),
  PdfCropController.handleUploadError,
  PdfCropController.submitCrop
);

/**
 * @route   GET /api/pdf/crop/:taskId
 * @desc    Get task status
 * @access  Public
 * Requirements: 4.1
 */
router.get('/:taskId', PdfCropController.getTaskStatus);

/**
 * @route   GET /api/pdf/crop/:taskId/download
 * @desc    Download crop result
 * @access  Public
 * Requirements: 4.1, 4.5
 */
router.get('/:taskId/download', PdfCropController.downloadResult);

/**
 * @route   DELETE /api/pdf/crop/:taskId
 * @desc    Delete a crop task
 * @access  Private/Public (with visitor ID)
 */
router.delete('/:taskId', optionalAuth, PdfCropController.deleteTask);

module.exports = router;
