/**
 * PDF Conversion Controller
 * Handles PDF conversion API endpoints
 * Requirements: 5, 6, 7, 10, 11, 12
 */

const path = require('path');
const fs = require('fs');
const { PdfConvertService, TaskStatus, ConversionType } = require('../services/pdf-convert.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * PDF Conversion Controller Class
 */
class PdfConvertController {
  /**
   * Submit a conversion task
   * POST /api/pdf/convert
   * Requirements: 5, 6, 7, 10, 11, 12
   */
  static async submitConversion(req, res) {
    try {
      const { conversionType } = req.body;
      const file = req.file;

      // Validate conversion type
      if (!conversionType) {
        return error(res, ErrorCodes.BAD_REQUEST, '请指定转换类型');
      }

      // Validate file
      if (!file) {
        return error(res, ErrorCodes.BAD_REQUEST, '请上传文件');
      }

      // Log file details for debugging
      logger.info('File upload details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        filename: file.filename
      });

      // Validate conversion request
      const validation = PdfConvertService.validateConversion(conversionType, file);
      if (!validation.valid) {
        // Clean up uploaded file
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return error(res, ErrorCodes.BAD_REQUEST, validation.error);
      }

      // Get user info
      const userId = req.user?.id || null;
      const visitorId = req.headers['x-visitor-id'] || null;

      // Parse options from request body
      const options = {};
      if (req.body.preserveHyperlinks !== undefined) {
        options.preserveHyperlinks = req.body.preserveHyperlinks === 'true';
      }
      if (req.body.preserveBookmarks !== undefined) {
        options.preserveBookmarks = req.body.preserveBookmarks === 'true';
      }
      if (req.body.includeNotes !== undefined) {
        options.includeNotes = req.body.includeNotes === 'true';
      }
      if (req.body.pdfaVersion) {
        options.pdfaVersion = req.body.pdfaVersion;
      }

      // Create conversion task
      const task = PdfConvertService.createTask(
        conversionType,
        file,
        options,
        userId,
        visitorId
      );

      logger.info(`Conversion task submitted: ${task.taskId}`, {
        conversionType,
        userId,
        visitorId,
      });

      return success(res, task, '转换任务已提交');
    } catch (err) {
      logger.error('Submit conversion error:', err);
      
      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return error(res, ErrorCodes.INTERNAL_ERROR, '提交转换任务失败');
    }
  }

  /**
   * Get task status
   * GET /api/pdf/convert/:taskId
   * Requirements: 5, 6, 7, 10, 11, 12
   */
  static async getTaskStatus(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const taskStatus = PdfConvertService.getTaskStatus(taskId);

      if (!taskStatus) {
        return error(res, ErrorCodes.NOT_FOUND, '任务不存在');
      }

      return success(res, taskStatus, '获取任务状态成功');
    } catch (err) {
      logger.error('Get task status error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取任务状态失败');
    }
  }

  /**
   * Download conversion result
   * GET /api/pdf/convert/:taskId/download
   * Requirements: 5, 6, 7, 10, 11, 12
   */
  static async downloadResult(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const taskStatus = PdfConvertService.getTaskStatus(taskId);

      if (!taskStatus) {
        return error(res, ErrorCodes.NOT_FOUND, '任务不存在');
      }

      if (taskStatus.status !== TaskStatus.COMPLETED) {
        return error(res, ErrorCodes.BAD_REQUEST, `任务尚未完成，当前状态: ${taskStatus.status}`);
      }

      const output = PdfConvertService.getTaskOutput(taskId);

      if (!output || !fs.existsSync(output.path)) {
        return error(res, ErrorCodes.NOT_FOUND, '转换结果文件不存在');
      }

      // Set response headers for file download
      res.setHeader('Content-Type', output.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(output.filename)}"`);
      res.setHeader('Content-Length', output.size);

      // Stream the file
      const fileStream = fs.createReadStream(output.path);
      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        logger.error('File stream error:', err);
        if (!res.headersSent) {
          return error(res, ErrorCodes.INTERNAL_ERROR, '下载文件失败');
        }
      });

      logger.info(`Conversion result downloaded: ${taskId}`);
    } catch (err) {
      logger.error('Download result error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '下载转换结果失败');
    }
  }

  /**
   * Delete a task
   * DELETE /api/pdf/convert/:taskId
   */
  static async deleteTask(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const deleted = PdfConvertService.deleteTask(taskId);

      if (!deleted) {
        return error(res, ErrorCodes.NOT_FOUND, '任务不存在');
      }

      return success(res, null, '任务已删除');
    } catch (err) {
      logger.error('Delete task error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '删除任务失败');
    }
  }

  /**
   * Get user's tasks
   * GET /api/pdf/convert/tasks
   */
  static async getUserTasks(req, res) {
    try {
      const userId = req.user?.id || null;
      const visitorId = req.headers['x-visitor-id'] || null;

      if (!userId && !visitorId) {
        return error(res, ErrorCodes.BAD_REQUEST, '无法识别用户');
      }

      const tasks = PdfConvertService.getUserTasks(userId, visitorId);

      return success(res, { tasks }, '获取任务列表成功');
    } catch (err) {
      logger.error('Get user tasks error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取任务列表失败');
    }
  }

  /**
   * Get supported conversion types
   * GET /api/pdf/convert/types
   */
  static async getSupportedTypes(req, res) {
    try {
      const conversions = PdfConvertService.getSupportedConversions();
      return success(res, { conversions }, '获取支持的转换类型成功');
    } catch (err) {
      logger.error('Get supported types error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取支持的转换类型失败');
    }
  }

  /**
   * Check system requirements
   * GET /api/pdf/convert/status
   */
  static async checkSystemStatus(req, res) {
    try {
      const status = await PdfConvertService.checkSystemRequirements();
      return success(res, status, '获取系统状态成功');
    } catch (err) {
      logger.error('Check system status error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取系统状态失败');
    }
  }

  /**
   * Handle file upload errors
   * Middleware to handle multer errors
   */
  static handleUploadError(err, req, res, next) {
    if (err) {
      logger.warn('File upload error:', { message: err.message, code: err.code });

      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, ErrorCodes.BAD_REQUEST, '文件大小超出限制');
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return error(res, ErrorCodes.BAD_REQUEST, '不支持的文件字段');
      }

      return error(res, ErrorCodes.BAD_REQUEST, err.message || '文件上传失败');
    }

    next();
  }
}

module.exports = PdfConvertController;
