/**
 * File Upload Service
 * Handles file upload configuration, validation, and storage
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const config = require('../config');

/**
 * Allowed file extensions and their MIME types
 * Requirement: 13.2
 */
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

/**
 * Get all allowed MIME types
 * @returns {string[]} Array of allowed MIME types
 */
const getAllowedMimeTypes = () => Object.keys(ALLOWED_TYPES);

/**
 * Get all allowed extensions
 * @returns {string[]} Array of allowed file extensions
 */
const getAllowedExtensions = () => {
  const extensions = [];
  Object.values(ALLOWED_TYPES).forEach(exts => extensions.push(...exts));
  return extensions;
};

/**
 * Validate file type
 * Requirement: 13.1, 13.5
 * @param {string} mimetype - File MIME type
 * @returns {boolean} True if file type is allowed
 */
const isValidFileType = (mimetype) => {
  return getAllowedMimeTypes().includes(mimetype);
};

/**
 * Validate file size
 * Requirement: 13.4, 13.6
 * @param {number} size - File size in bytes
 * @returns {boolean} True if file size is within limit
 */
const isValidFileSize = (size) => {
  return size <= config.upload.maxFileSize;
};

/**
 * Generate unique filename
 * Requirement: 13.3
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${timestamp}-${randomBytes}${ext}`;
};

/**
 * Ensure upload directory exists
 * @param {string} uploadPath - Upload directory path
 */
const ensureUploadDir = (uploadPath) => {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
};

/**
 * Configure multer storage
 * Requirements: 13.3
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.resolve(config.upload.path);
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  },
});

/**
 * File filter for multer
 * Requirement: 13.1, 13.5
 */
const fileFilter = (req, file, cb) => {
  if (isValidFileType(file.mimetype)) {
    cb(null, true);
  } else {
    const allowedExts = getAllowedExtensions().join(', ');
    cb(new Error(`不支持的文件类型。支持的类型: ${allowedExts}`), false);
  }
};

/**
 * Create multer upload instance
 * Requirements: 13.1, 13.3, 13.4
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

/**
 * Upload Service Class
 */
class UploadService {
  /**
   * Get single file upload middleware
   * @param {string} fieldName - Form field name for file
   * @returns {Function} Multer middleware
   */
  static single(fieldName = 'file') {
    return upload.single(fieldName);
  }

  /**
   * Get multiple files upload middleware
   * @param {string} fieldName - Form field name for files
   * @param {number} maxCount - Maximum number of files
   * @returns {Function} Multer middleware
   */
  static multiple(fieldName = 'files', maxCount = 10) {
    return upload.array(fieldName, maxCount);
  }

  /**
   * Validate file type
   * @param {string} mimetype - File MIME type
   * @returns {Object} Validation result
   */
  static validateFileType(mimetype) {
    const isValid = isValidFileType(mimetype);
    return {
      valid: isValid,
      allowedTypes: getAllowedMimeTypes(),
      allowedExtensions: getAllowedExtensions(),
    };
  }

  /**
   * Validate file size
   * @param {number} size - File size in bytes
   * @returns {Object} Validation result
   */
  static validateFileSize(size) {
    const isValid = isValidFileSize(size);
    return {
      valid: isValid,
      maxSize: config.upload.maxFileSize,
      maxSizeMB: config.upload.maxFileSize / (1024 * 1024),
    };
  }

  /**
   * Generate file URL
   * Requirement: 13.7
   * @param {string} filename - Stored filename
   * @returns {string} Accessible URL
   */
  static getFileUrl(filename) {
    // 返回通过Nginx直接访问的URL（不带/api前缀）
    return `/uploads/${filename}`;
  }

  /**
   * Delete file
   * @param {string} filename - Filename to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteFile(filename) {
    try {
      const filePath = path.join(config.upload.path, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get file info
   * @param {string} filename - Filename
   * @returns {Object|null} File info or null if not found
   */
  static getFileInfo(filename) {
    try {
      const filePath = path.join(config.upload.path, filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          url: this.getFileUrl(filename),
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  }
}

// Export utilities for testing
module.exports = {
  UploadService,
  isValidFileType,
  isValidFileSize,
  generateUniqueFilename,
  getAllowedMimeTypes,
  getAllowedExtensions,
  ALLOWED_TYPES,
};
