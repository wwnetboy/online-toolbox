/**
 * OCR Controller
 * Handles OCR API endpoints
 * Requirements: 3.1, 3.2, 3.4
 */

const path = require('path');
const fs = require('fs');
const { OcrService, TaskStatus } = require('../services/ocr.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * OCR Controller Class
 */
class OcrController {
  /**
   * Submit an OCR task
   * POST /api/pdf/ocr
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  static async submitOcrTask(req, res) {
    try {
      const file = req.file;

      // Validate file
      const validation = OcrService.validateOcrRequest(file);
      if (!validation.valid) {
        // Clean up uploaded file
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return error(res, ErrorCodes.BAD_REQUEST, validation.error);
      }

      // Get user info
      const userId = req.user?.id || null;
      const visitorId = req.headers['x-visitor-id'] || null;

      // Parse options from request body
      const options = {
        languages: req.body.languages || 'chi_sim,eng',
        pages: req.body.pages || 'all',
        outputType: req.body.outputType || 'searchable-pdf',
        dpi: req.body.dpi || 300,
      };

      // Create OCR task
      const task = OcrService.createTask(
        file,
        options,
        userId,
        visitorId
      );

      logger.info(`OCR task submitted: ${task.taskId}`, {
        languages: options.languages,
        userId,
        visitorId,
      });

      return success(res, task, 'OCR任务已提交');
    } catch (err) {
      logger.error('Submit OCR task error:', err);
      
      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return error(res, ErrorCodes.INTERNAL_ERROR, '提交OCR任务失败');
    }
  }

  /**
   * Get task status
   * GET /api/pdf/ocr/:taskId
   * Requirements: 3.1, 3.2, 3.4
   */
  static async getTaskStatus(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const taskStatus = OcrService.getTaskStatus(taskId);

      if (!taskStatus) {
        return error(res, ErrorCodes.NOT_FOUND, '任务不存在');
      }

      return success(res, taskStatus, '获取任务状态成功');
    } catch (err) {
      logger.error('Get OCR task status error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取任务状态失败');
    }
  }

  /**
   * Download OCR result
   * GET /api/pdf/ocr/:taskId/download
   * Requirements: 3.1, 3.2, 3.4
   */
  static async downloadResult(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const taskStatus = OcrService.getTaskStatus(taskId);

      if (!taskStatus) {
        return error(res, ErrorCodes.NOT_FOUND, '任务不存在');
      }

      if (taskStatus.status !== TaskStatus.COMPLETED) {
        return error(res, ErrorCodes.BAD_REQUEST, `任务尚未完成，当前状态: ${taskStatus.status}`);
      }

      const output = OcrService.getTaskOutput(taskId);

      if (!output || !fs.existsSync(output.path)) {
        return error(res, ErrorCodes.NOT_FOUND, 'OCR结果文件不存在');
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

      logger.info(`OCR result downloaded: ${taskId}`);
    } catch (err) {
      logger.error('Download OCR result error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '下载OCR结果失败');
    }
  }

  /**
   * Get OCR text result
   * GET /api/pdf/ocr/:taskId/text
   * Requirements: 3.1, 3.2
   */
  static async getTextResult(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const taskStatus = OcrService.getTaskStatus(taskId);

      if (!taskStatus) {
        return error(res, ErrorCodes.NOT_FOUND, '任务不存在');
      }

      if (taskStatus.status !== TaskStatus.COMPLETED) {
        return error(res, ErrorCodes.BAD_REQUEST, `任务尚未完成，当前状态: ${taskStatus.status}`);
      }

      const result = OcrService.getTaskResult(taskId);

      if (!result) {
        return error(res, ErrorCodes.NOT_FOUND, 'OCR结果不存在');
      }

      return success(res, result, '获取OCR结果成功');
    } catch (err) {
      logger.error('Get OCR text result error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取OCR结果失败');
    }
  }

  /**
   * Delete a task
   * DELETE /api/pdf/ocr/:taskId
   */
  static async deleteTask(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const deleted = OcrService.deleteTask(taskId);

      if (!deleted) {
        return error(res, ErrorCodes.NOT_FOUND, '任务不存在');
      }

      return success(res, null, '任务已删除');
    } catch (err) {
      logger.error('Delete OCR task error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '删除任务失败');
    }
  }

  /**
   * Get user's OCR tasks
   * GET /api/pdf/ocr/tasks
   */
  static async getUserTasks(req, res) {
    try {
      const userId = req.user?.id || null;
      const visitorId = req.headers['x-visitor-id'] || null;

      if (!userId && !visitorId) {
        return error(res, ErrorCodes.BAD_REQUEST, '无法识别用户');
      }

      const tasks = OcrService.getUserTasks(userId, visitorId);

      return success(res, { tasks }, '获取任务列表成功');
    } catch (err) {
      logger.error('Get user OCR tasks error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取任务列表失败');
    }
  }

  /**
   * Get supported languages
   * GET /api/pdf/ocr/languages
   */
  static async getSupportedLanguages(req, res) {
    try {
      const languages = await OcrService.getSupportedLanguages();
      return success(res, languages, '获取支持的语言成功');
    } catch (err) {
      logger.error('Get supported languages error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取支持的语言失败');
    }
  }

  /**
   * Check system requirements
   * GET /api/pdf/ocr/status
   */
  static async checkSystemStatus(req, res) {
    try {
      const status = await OcrService.checkSystemRequirements();
      return success(res, status, '获取系统状态成功');
    } catch (err) {
      logger.error('Check OCR system status error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取系统状态失败');
    }
  }

  /**
   * Handle file upload errors
   * Middleware to handle multer errors
   */
  static handleUploadError(err, req, res, next) {
    if (err) {
      logger.warn('OCR file upload error:', { message: err.message, code: err.code });

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

module.exports = OcrController;
