/**
 * Icon Upload Controller
 * Handles tool icon upload API requests
 * Requirements: 5.1, 5.2, 5.3
 */

const { IconUploadService } = require('../services/icon-upload.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Icon Upload Controller Class
 */
class IconUploadController {
  /**
   * Upload tool icon
   * POST /api/upload/icon
   * Requirements: 5.1, 5.2, 5.5
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async uploadIcon(req, res) {
    try {
      if (!req.file) {
        return error(res, ErrorCodes.BAD_REQUEST, IconUploadService.getErrorMessage('NO_FILE'));
      }

      const result = await IconUploadService.uploadIcon(req.file);

      if (!result.success) {
        const errorMessage = IconUploadService.getErrorMessage(result.error);
        logger.warn('Icon upload failed:', { error: result.error, message: errorMessage });
        return error(res, ErrorCodes.BAD_REQUEST, errorMessage);
      }

      logger.info('Icon uploaded successfully:', {
        filename: result.filename,
        type: result.type,
        url: result.url,
      });

      return success(res, {
        url: result.url,
        filename: result.filename,
      }, '图标上传成功');
    } catch (err) {
      logger.error('Icon upload error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '图标上传失败，请稍后重试');
    }
  }

  /**
   * Delete tool icon
   * DELETE /api/upload/icon/:filename
   * Requirements: 5.1
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteIcon(req, res) {
    try {
      const { filename } = req.params;

      if (!filename) {
        return error(res, ErrorCodes.BAD_REQUEST, '文件名不能为空');
      }

      // Construct the icon URL from filename (不带/api前缀)
      const iconUrl = `/uploads/icons/${filename}`;
      const deleted = await IconUploadService.deleteIcon(iconUrl);

      if (!deleted) {
        return error(res, ErrorCodes.NOT_FOUND, '图标文件不存在');
      }

      logger.info('Icon deleted successfully:', { filename });
      return success(res, null, '图标删除成功');
    } catch (err) {
      logger.error('Icon delete error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '图标删除失败');
    }
  }

  /**
   * Handle multer errors for icon uploads
   * Middleware to handle file upload errors
   * Requirements: 5.3
   * @param {Error} err - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  static handleUploadError(err, req, res, next) {
    if (err) {
      logger.warn('Icon upload error:', { message: err.message, code: err.code });

      // Handle multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(
          res,
          ErrorCodes.BAD_REQUEST,
          IconUploadService.getErrorMessage('FILE_TOO_LARGE')
        );
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return error(res, ErrorCodes.BAD_REQUEST, '不支持的文件字段');
      }

      // Handle file type validation error from multer filter
      if (err.message === 'INVALID_FILE_TYPE') {
        return error(
          res,
          ErrorCodes.BAD_REQUEST,
          IconUploadService.getErrorMessage('INVALID_FILE_TYPE')
        );
      }

      // Generic error
      return error(res, ErrorCodes.BAD_REQUEST, err.message || '图标上传失败');
    }

    next();
  }
}

module.exports = IconUploadController;
