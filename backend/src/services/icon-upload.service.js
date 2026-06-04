/**
 * Icon Upload Service
 * 处理工具图标的上传、验证和存储
 * Requirements: 1.3, 1.5, 2.1, 2.2, 2.5
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const config = require('../config');

/**
 * Icon file size limit (2MB)
 * Requirement: 1.5
 */
const ICON_MAX_SIZE = 2 * 1024 * 1024;

/**
 * Icon storage directory
 * Requirement: 2.1
 */
const ICON_UPLOAD_DIR = path.join(config.upload.path, 'icons');

/**
 * PNG file signature (magic bytes)
 * PNG files start with: 89 50 4E 47 0D 0A 1A 0A
 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

/**
 * JPEG file signatures (magic bytes)
 * JPEG files start with: FF D8 FF
 */
const JPEG_SIGNATURE = Buffer.from([0xFF, 0xD8, 0xFF]);

/**
 * Allowed MIME types for icons
 */
const ALLOWED_ICON_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/svg+xml': '.svg',
};

/**
 * Validate file signature to ensure it's a genuine PNG, JPEG or SVG file
 * Requirement: 2.5
 * @param {Buffer} buffer - File content buffer
 * @returns {Object} { valid: boolean, type: 'png' | 'jpg' | 'svg' | null, error?: string }
 */
const validateFileSignature = (buffer) => {
  if (!buffer || buffer.length === 0) {
    return { valid: false, type: null, error: 'EMPTY_FILE' };
  }

  // Check PNG signature (first 8 bytes)
  if (buffer.length >= 8) {
    const pngHeader = buffer.subarray(0, 8);
    if (pngHeader.equals(PNG_SIGNATURE)) {
      return { valid: true, type: 'png' };
    }
  }

  // Check JPEG signature (first 3 bytes)
  if (buffer.length >= 3) {
    const jpegHeader = buffer.subarray(0, 3);
    if (jpegHeader.equals(JPEG_SIGNATURE)) {
      return { valid: true, type: 'jpg' };
    }
  }

  // Check SVG (look for XML declaration or SVG tag)
  // SVG files are text-based, so we check for common SVG patterns
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
  const trimmedContent = content.trim().toLowerCase();
  
  // Check for XML declaration or SVG tag
  if (
    trimmedContent.startsWith('<?xml') ||
    trimmedContent.startsWith('<svg') ||
    trimmedContent.includes('<svg')
  ) {
    // Additional validation: ensure it contains SVG namespace or svg tag
    if (content.includes('<svg') || content.includes('xmlns="http://www.w3.org/2000/svg"')) {
      return { valid: true, type: 'svg' };
    }
  }

  return { valid: false, type: null, error: 'INVALID_FILE_SIGNATURE' };
};

/**
 * Generate unique filename for icon
 * Requirement: 2.2
 * @param {string} _originalName - Original filename (unused, kept for API consistency)
 * @param {string} detectedType - Detected file type ('png', 'jpg' or 'svg')
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (_originalName, detectedType) => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  let ext = '.png';
  if (detectedType === 'svg') {
    ext = '.svg';
  } else if (detectedType === 'jpg') {
    ext = '.jpg';
  }
  return `icon-${timestamp}-${randomBytes}${ext}`;
};

/**
 * Ensure icon upload directory exists
 * Requirement: 2.1
 */
const ensureIconDir = () => {
  const iconPath = path.resolve(ICON_UPLOAD_DIR);
  if (!fs.existsSync(iconPath)) {
    fs.mkdirSync(iconPath, { recursive: true });
  }
  return iconPath;
};

/**
 * Configure multer storage for icons
 * Uses memory storage for signature validation before saving
 */
const iconStorage = multer.memoryStorage();

/**
 * File filter for icon uploads
 * Requirement: 1.4
 */
const iconFileFilter = (_req, file, cb) => {
  // Check MIME type first
  if (!ALLOWED_ICON_TYPES[file.mimetype]) {
    return cb(new Error('INVALID_FILE_TYPE'), false);
  }
  cb(null, true);
};

/**
 * Create multer instance for icon uploads
 * Requirements: 1.5
 */
const iconUpload = multer({
  storage: iconStorage,
  fileFilter: iconFileFilter,
  limits: {
    fileSize: ICON_MAX_SIZE,
  },
});

/**
 * Icon Upload Service Class
 */
class IconUploadService {
  /**
   * Get multer middleware for single icon upload
   * @returns {Function} Multer middleware
   */
  static getMulterConfig() {
    return iconUpload.single('icon');
  }

  /**
   * Validate file signature
   * Requirement: 2.5
   * @param {Buffer} buffer - File content
   * @returns {Object} { valid: boolean, type: 'png' | 'svg' | null, error?: string }
   */
  static validateFileSignature(buffer) {
    return validateFileSignature(buffer);
  }

  /**
   * Upload icon file
   * Requirements: 1.3, 2.1, 2.2
   * @param {Object} file - Multer file object (from memory storage)
   * @returns {Promise<{ success: boolean, url?: string, filename?: string, error?: string }>}
   */
  static async uploadIcon(file) {
    try {
      if (!file || !file.buffer) {
        return { success: false, error: 'NO_FILE' };
      }

      // Validate file size (double-check, multer should handle this)
      if (file.size > ICON_MAX_SIZE) {
        return { success: false, error: 'FILE_TOO_LARGE' };
      }

      // Validate file signature
      const signatureResult = validateFileSignature(file.buffer);
      if (!signatureResult.valid) {
        return { success: false, error: signatureResult.error || 'INVALID_FILE_SIGNATURE' };
      }

      // Ensure icon directory exists
      const iconDir = ensureIconDir();

      // Generate unique filename
      const filename = generateUniqueFilename(file.originalname, signatureResult.type);
      const filePath = path.join(iconDir, filename);

      // Write file to disk
      await fs.promises.writeFile(filePath, file.buffer);

      // Generate URL (不带/api前缀，直接通过Nginx访问)
      const url = `/uploads/icons/${filename}`;

      return {
        success: true,
        url,
        filename,
        type: signatureResult.type,
      };
    } catch (err) {
      return { success: false, error: 'UPLOAD_FAILED' };
    }
  }

  /**
   * Delete icon file
   * Requirements: 2.3, 2.4
   * @param {string} iconUrl - Icon URL path (e.g., /uploads/icons/icon-xxx.png)
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteIcon(iconUrl) {
    try {
      if (!iconUrl) {
        return false;
      }

      // Extract filename from URL
      // URL format: /uploads/icons/filename.ext
      const filename = path.basename(iconUrl);
      
      // Validate filename to prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return false;
      }

      const filePath = path.join(path.resolve(ICON_UPLOAD_DIR), filename);

      // Check if file exists
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }

      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Check if icon file exists
   * @param {string} iconUrl - Icon URL path
   * @returns {boolean} True if file exists
   */
  static iconExists(iconUrl) {
    try {
      if (!iconUrl) {
        return false;
      }

      const filename = path.basename(iconUrl);
      
      // Validate filename
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return false;
      }

      const filePath = path.join(path.resolve(ICON_UPLOAD_DIR), filename);
      return fs.existsSync(filePath);
    } catch (err) {
      return false;
    }
  }

  /**
   * Get icon file path
   * @param {string} iconUrl - Icon URL path
   * @returns {string|null} Full file path or null
   */
  static getIconPath(iconUrl) {
    try {
      if (!iconUrl) {
        return null;
      }

      const filename = path.basename(iconUrl);
      
      // Validate filename
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return null;
      }

      return path.join(path.resolve(ICON_UPLOAD_DIR), filename);
    } catch (err) {
      return null;
    }
  }

  /**
   * Get error message for error code
   * @param {string} errorCode - Error code
   * @returns {string} Human-readable error message
   */
  static getErrorMessage(errorCode) {
    const messages = {
      'NO_FILE': '请选择要上传的图标文件',
      'INVALID_FILE_TYPE': '只支持 PNG、JPG、JPEG、SVG 格式的图标文件',
      'FILE_TOO_LARGE': '图标文件大小不能超过 2MB',
      'INVALID_FILE_SIGNATURE': '文件格式无效，请上传真实的 PNG、JPG 或 SVG 文件',
      'EMPTY_FILE': '文件内容为空',
      'UPLOAD_FAILED': '图标上传失败，请重试',
    };
    return messages[errorCode] || '图标上传失败';
  }

  /**
   * Get maximum file size
   * @returns {number} Maximum file size in bytes
   */
  static getMaxFileSize() {
    return ICON_MAX_SIZE;
  }

  /**
   * Get allowed file types
   * @returns {string[]} Array of allowed MIME types
   */
  static getAllowedTypes() {
    return Object.keys(ALLOWED_ICON_TYPES);
  }

  /**
   * Get allowed file extensions
   * @returns {string[]} Array of allowed extensions
   */
  static getAllowedExtensions() {
    return Object.values(ALLOWED_ICON_TYPES);
  }
}

// Export for testing
module.exports = {
  IconUploadService,
  validateFileSignature,
  generateUniqueFilename,
  ensureIconDir,
  ICON_MAX_SIZE,
  ICON_UPLOAD_DIR,
  PNG_SIGNATURE,
  JPEG_SIGNATURE,
  ALLOWED_ICON_TYPES,
};
