/**
 * PDF Crop Controller
 * Handles PDF cropping API endpoints
 * Requirements: 4.1, 4.2, 4.5
 */

const fs = require('fs');
const { PdfCropService, TaskStatus } = require('../services/pdf-crop.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * PDF Crop Controller Class
 */
class PdfCropController {
  /**
   * Submit a crop task
   * POST /api/pdf/crop
   * Requirements: 4.1, 4.2
   */
  static async submitCrop(req, res) {
    try {
      const { cropArea, applyMode, pages, currentPage } = req.body;
      const file = req.file;

      // Validate file
      if (!file) {
        return error(res, ErrorCodes.BAD_REQUEST, '请上传 PDF 文件');
      }

      // Validate file type
      if (!file.mimetype || !file.mimetype.includes('pdf')) {
        // Clean up uploaded file
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return error(res, ErrorCodes.BAD_REQUEST, '文件类型不正确，请上传 PDF 文件');
      }

      // Validate file size (100MB limit)
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_FILE_SIZE) {
        // Clean up uploaded file
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return error(res, ErrorCodes.BAD_REQUEST, '文件大小超过 100MB 限制');
      }

      // Parse cropArea if it's a string
      let parsedCropArea = cropArea;
      if (typeof cropArea === 'string') {
        try {
          parsedCropArea = JSON.parse(cropArea);
        } catch (parseError) {
          // Clean up uploaded file
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return error(res, ErrorCodes.BAD_REQUEST, '裁剪区域参数格式错误');
        }
      }

      // Parse pages if it's a string
      let parsedPages = pages;
      if (typeof pages === 'string') {
        try {
          parsedPages = JSON.parse(pages);
        } catch (parseError) {
          // Clean up uploaded file
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return error(res, ErrorCodes.BAD_REQUEST, '页面范围参数格式错误');
        }
      }

      // Parse currentPage if it's a string
      let parsedCurrentPage = currentPage;
      if (typeof currentPage === 'string') {
        parsedCurrentPage = parseInt(currentPage, 10);
        if (isNaN(parsedCurrentPage)) {
          // Clean up uploaded file
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return error(res, ErrorCodes.BAD_REQUEST, '当前页面参数格式错误');
        }
      }

      // Validate crop parameters
      const validation = PdfCropService.validateCropParams(
        parsedCropArea,
        applyMode,
        parsedPages,
        parsedCurrentPage
      );

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

      // Create crop task
      const task = PdfCropService.createCropTask(
        file,
        {
          cropArea: parsedCropArea,
          applyMode,
          pages: parsedPages,
          currentPage: parsedCurrentPage,
        },
        userId,
        visitorId
      );

      logger.info(`Crop task submitted: ${task.taskId}`, {
        applyMode,
        userId,
        visitorId,
        originalName: file.originalname,
      });

      return success(res, task, '裁剪任务已提交');
    } catch (err) {
      logger.error('Submit crop error:', err);

      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return error(res, ErrorCodes.INTERNAL_ERROR, '提交裁剪任务失败');
    }
  }

  /**
   * Get task status
   * GET /api/pdf/crop/:taskId
   * Requirements: 4.1
   */
  static async getTaskStatus(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const taskStatus = PdfCropService.getTaskStatus(taskId);

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
   * Download crop result
   * GET /api/pdf/crop/:taskId/download
   * Requirements: 4.1, 4.5
   */
  static async downloadResult(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const taskStatus = PdfCropService.getTaskStatus(taskId);

      if (!taskStatus) {
        return error(res, ErrorCodes.NOT_FOUND, '任务不存在');
      }

      if (taskStatus.status !== TaskStatus.COMPLETED) {
        return error(
          res,
          ErrorCodes.BAD_REQUEST,
          `任务尚未完成，当前状态: ${taskStatus.status}`
        );
      }

      const output = PdfCropService.getTaskOutput(taskId);

      if (!output || !fs.existsSync(output.path)) {
        return error(res, ErrorCodes.NOT_FOUND, '裁剪结果文件不存在');
      }

      // Set response headers for file download
      res.setHeader('Content-Type', output.mimetype);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(output.filename)}"`
      );
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

      logger.info(`Crop result downloaded: ${taskId}`);
    } catch (err) {
      logger.error('Download result error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '下载裁剪结果失败');
    }
  }

  /**
   * Delete a crop task
   * DELETE /api/pdf/crop/:taskId
   */
  static async deleteTask(req, res) {
    try {
      const { taskId } = req.params;

      if (!taskId) {
        return error(res, ErrorCodes.BAD_REQUEST, '请提供任务ID');
      }

      const deleted = PdfCropService.deleteTask(taskId);

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
   * Get user's crop tasks
   * GET /api/pdf/crop/tasks
   */
  static async getUserTasks(req, res) {
    try {
      const userId = req.user?.id || null;
      const visitorId = req.headers['x-visitor-id'] || null;

      if (!userId && !visitorId) {
        return error(res, ErrorCodes.BAD_REQUEST, '无法识别用户');
      }

      const tasks = PdfCropService.getUserTasks(userId, visitorId);

      return success(res, { tasks }, '获取任务列表成功');
    } catch (err) {
      logger.error('Get user tasks error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取任务列表失败');
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

module.exports = PdfCropController;
