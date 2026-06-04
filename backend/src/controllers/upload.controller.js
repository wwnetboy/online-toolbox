/**
 * File Upload Controller
 * Handles file upload endpoints
 * Requirements: 13.7
 */

const { UploadService, getAllowedExtensions } = require('../services/upload.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Upload Controller Class
 */
class UploadController {
  /**
   * Upload single file
   * POST /api/upload
   * Requirement: 13.7
   */
  static async uploadFile(req, res) {
    try {
      if (!req.file) {
        return error(res, ErrorCodes.BAD_REQUEST, '请选择要上传的文件');
      }

      const fileUrl = UploadService.getFileUrl(req.file.filename);

      logger.info(`File uploaded: ${req.file.filename}`, {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      return success(res, {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      }, '文件上传成功');
    } catch (err) {
      logger.error('File upload error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '文件上传失败，请稍后重试');
    }
  }

  /**
   * Upload multiple files
   * POST /api/upload/multiple
   * Requirement: 13.7
   */
  static async uploadMultipleFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return error(res, ErrorCodes.BAD_REQUEST, '请选择要上传的文件');
      }

      const uploadedFiles = req.files.map(file => ({
        url: UploadService.getFileUrl(file.filename),
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      }));

      logger.info(`Multiple files uploaded: ${req.files.length} files`);

      return success(res, {
        files: uploadedFiles,
        count: uploadedFiles.length,
      }, '文件上传成功');
    } catch (err) {
      logger.error('Multiple file upload error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '文件上传失败，请稍后重试');
    }
  }

  /**
   * Handle multer errors
   * Middleware to handle file upload errors
   * Requirements: 13.5, 13.6
   */
  static handleUploadError(err, req, res, next) {
    if (err) {
      logger.warn('File upload error:', { message: err.message, code: err.code });

      // Handle multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxSizeMB = config.upload.maxFileSize / (1024 * 1024);
        return error(
          res,
          ErrorCodes.BAD_REQUEST,
          `文件大小超出限制，最大允许 ${maxSizeMB}MB`
        );
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        return error(res, ErrorCodes.BAD_REQUEST, '上传文件数量超出限制');
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return error(res, ErrorCodes.BAD_REQUEST, '不支持的文件字段');
      }

      // Handle file type validation error
      if (err.message && err.message.includes('不支持的文件类型')) {
        const allowedExts = getAllowedExtensions().join(', ');
        return error(
          res,
          ErrorCodes.BAD_REQUEST,
          `不支持的文件类型。支持的类型: ${allowedExts}`
        );
      }

      // Generic error
      return error(res, ErrorCodes.BAD_REQUEST, err.message || '文件上传失败');
    }

    next();
  }

  /**
   * Delete uploaded file
   * DELETE /api/upload/:filename
   */
  static async deleteFile(req, res) {
    try {
      const { filename } = req.params;

      if (!filename) {
        return error(res, ErrorCodes.BAD_REQUEST, '文件名不能为空');
      }

      const deleted = await UploadService.deleteFile(filename);

      if (!deleted) {
        return error(res, ErrorCodes.NOT_FOUND, '文件不存在');
      }

      logger.info(`File deleted: ${filename}`);
      return success(res, null, '文件删除成功');
    } catch (err) {
      logger.error('File delete error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '文件删除失败');
    }
  }

  /**
   * Get file info
   * GET /api/upload/:filename
   */
  static async getFileInfo(req, res) {
    try {
      const { filename } = req.params;

      if (!filename) {
        return error(res, ErrorCodes.BAD_REQUEST, '文件名不能为空');
      }

      const fileInfo = UploadService.getFileInfo(filename);

      if (!fileInfo) {
        return error(res, ErrorCodes.NOT_FOUND, '文件不存在');
      }

      return success(res, fileInfo, '获取文件信息成功');
    } catch (err) {
      logger.error('Get file info error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取文件信息失败');
    }
  }
}

module.exports = UploadController;
