/**
 * PDF Crop Service
 * Handles PDF cropping operations with task management
 * Requirements: 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');
const logger = require('../utils/logger');

/**
 * Task status enum
 */
const TaskStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Apply mode enum
 */
const ApplyMode = {
  CURRENT: 'current',
  ALL: 'all',
  RANGE: 'range',
};

/**
 * In-memory task storage (can be replaced with Redis for production)
 */
const taskStore = new Map();

/**
 * Task cleanup interval (clean completed/failed tasks after 1 hour)
 */
const TASK_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const TASK_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour

/**
 * Crop output directory
 */
const CROP_OUTPUT_DIR = process.env.CROP_OUTPUT_PATH || 'uploads/crops';

/**
 * Ensure crop output directory exists
 */
const ensureOutputDir = () => {
  const outputPath = path.resolve(CROP_OUTPUT_DIR);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  return outputPath;
};

/**
 * Generate unique task ID
 * @returns {string} Unique task ID
 */
const generateTaskId = () => {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `crop_${timestamp}_${randomBytes}`;
};

/**
 * Generate unique output filename
 * @param {string} originalName - Original filename
 * @returns {string} Unique output filename
 */
const generateOutputFilename = (originalName) => {
  const baseName = path.basename(originalName, path.extname(originalName));
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(4).toString('hex');
  return `${baseName}_cropped_${timestamp}_${randomBytes}.pdf`;
};

/**
 * PDF Crop Service Class
 */
class PdfCropService {
  /**
   * Validate crop parameters
   * Requirements: 4.2
   * @param {Object} cropArea - Crop area with x, y, width, height
   * @param {string} applyMode - Apply mode: 'current', 'all', or 'range'
   * @param {Array<number>} pages - Page numbers for range mode
   * @param {number} currentPage - Current page number for current mode
   * @returns {Object} Validation result
   */
  static validateCropParams(cropArea, applyMode, pages, currentPage) {
    const errors = [];

    // Validate crop area
    if (!cropArea) {
      errors.push('裁剪区域参数缺失');
    } else {
      if (typeof cropArea.x !== 'number' || cropArea.x < 0) {
        errors.push('裁剪区域 X 坐标无效');
      }
      if (typeof cropArea.y !== 'number' || cropArea.y < 0) {
        errors.push('裁剪区域 Y 坐标无效');
      }
      if (typeof cropArea.width !== 'number' || cropArea.width <= 0) {
        errors.push('裁剪区域宽度无效');
      }
      if (typeof cropArea.height !== 'number' || cropArea.height <= 0) {
        errors.push('裁剪区域高度无效');
      }
    }

    // Validate apply mode
    if (!Object.values(ApplyMode).includes(applyMode)) {
      errors.push('应用模式无效，必须是 current、all 或 range');
    }

    // Validate page parameters based on apply mode
    if (applyMode === ApplyMode.RANGE) {
      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        errors.push('页面范围参数无效');
      } else if (pages.some(p => typeof p !== 'number' || p < 1)) {
        errors.push('页面范围包含无效页码');
      }
    }

    if (applyMode === ApplyMode.CURRENT) {
      if (typeof currentPage !== 'number' || currentPage < 1) {
        errors.push('当前页面参数无效');
      }
    }

    if (errors.length > 0) {
      return { valid: false, error: errors.join('; ') };
    }

    return { valid: true };
  }

  /**
   * Parse page range string to array of page numbers
   * Requirements: 5.5
   * Supports formats like: "1-5, 8, 10-12"
   * @param {string} rangeStr - Page range string
   * @param {number} totalPages - Total number of pages in PDF
   * @returns {Array<number>} Array of page numbers
   */
  static parsePageRange(rangeStr, totalPages) {
    const pages = new Set();

    if (!rangeStr || typeof rangeStr !== 'string') {
      return [];
    }

    // Split by comma and process each part
    const parts = rangeStr.split(',').map(p => p.trim()).filter(p => p);

    for (const part of parts) {
      if (part.includes('-')) {
        // Range format: "1-5"
        const [startStr, endStr] = part.split('-').map(s => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);

        if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
          continue; // Skip invalid ranges
        }

        // Add all pages in range
        for (let i = start; i <= Math.min(end, totalPages); i++) {
          pages.add(i);
        }
      } else {
        // Single page: "8"
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          pages.add(pageNum);
        }
      }
    }

    // Convert Set to sorted array
    return Array.from(pages).sort((a, b) => a - b);
  }

  /**
   * Determine which pages to crop based on apply mode
   * Requirements: 5.1, 5.2, 5.3, 5.4
   * @param {string} applyMode - Apply mode
   * @param {Array<number>} pages - Page numbers for range mode
   * @param {number} currentPage - Current page for current mode
   * @param {number} totalPages - Total pages in PDF
   * @returns {Array<number>} Array of page numbers to crop
   */
  static determinePages(applyMode, pages, currentPage, totalPages) {
    if (applyMode === ApplyMode.CURRENT) {
      // Only crop current page
      return [currentPage];
    } else if (applyMode === ApplyMode.ALL) {
      // Crop all pages
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else if (applyMode === ApplyMode.RANGE) {
      // Crop specified pages, filter out invalid page numbers
      return pages.filter(p => p >= 1 && p <= totalPages);
    }

    return [];
  }

  /**
   * Create a new crop task
   * Requirements: 4.1, 4.2
   * @param {Object} file - Uploaded file object
   * @param {Object} options - Crop options
   * @param {string} userId - User ID (optional)
   * @param {string} visitorId - Visitor ID (optional)
   * @returns {Object} Task info
   */
  static createCropTask(file, options, userId = null, visitorId = null) {
    const taskId = generateTaskId();
    const outputFilename = generateOutputFilename(file.originalname);

    const task = {
      taskId,
      status: TaskStatus.PENDING,
      progress: 0,
      inputFile: {
        path: file.path,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
      outputFile: null,
      outputFilename,
      options: {
        cropArea: options.cropArea,
        applyMode: options.applyMode,
        pages: options.pages || null,
        currentPage: options.currentPage || null,
      },
      userId,
      visitorId,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    taskStore.set(taskId, task);

    // Start processing asynchronously
    this.processCropTask(taskId).catch(err => {
      logger.error(`Crop task ${taskId} processing error:`, err);
    });

    logger.info(`Crop task created: ${taskId}`, {
      applyMode: options.applyMode,
      originalName: file.originalname,
    });

    return {
      taskId,
      status: task.status,
      createdAt: task.createdAt,
    };
  }

  /**
   * Get task status
   * @param {string} taskId - Task ID
   * @returns {Object|null} Task status or null if not found
   */
  static getTaskStatus(taskId) {
    const task = taskStore.get(taskId);

    if (!task) {
      return null;
    }

    return {
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      inputFile: {
        originalName: task.inputFile.originalName,
        size: task.inputFile.size,
      },
      outputFile: task.outputFile ? {
        filename: task.outputFilename,
        size: task.outputFile.size,
      } : null,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
    };
  }

  /**
   * Get task output file path
   * @param {string} taskId - Task ID
   * @returns {Object|null} File info or null
   */
  static getTaskOutput(taskId) {
    const task = taskStore.get(taskId);

    if (!task || task.status !== TaskStatus.COMPLETED || !task.outputFile) {
      return null;
    }

    return {
      path: task.outputFile.path,
      filename: task.outputFilename,
      mimetype: 'application/pdf',
      size: task.outputFile.size,
    };
  }

  /**
   * Process crop task
   * Requirements: 4.3, 4.4, 5.1, 5.2, 5.3
   * @param {string} taskId - Task ID
   */
  static async processCropTask(taskId) {
    const task = taskStore.get(taskId);

    if (!task) {
      logger.error(`Task not found: ${taskId}`);
      return;
    }

    try {
      // Update status to processing
      task.status = TaskStatus.PROCESSING;
      task.progress = 10;
      task.updatedAt = new Date();

      logger.info(`Processing crop task: ${taskId}`);

      // Load PDF document
      const pdfBytes = fs.readFileSync(task.inputFile.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      task.progress = 30;
      task.updatedAt = new Date();

      // Get total pages
      const totalPages = pdfDoc.getPageCount();
      logger.info(`PDF has ${totalPages} pages`);

      // Determine which pages to crop
      const pagesToCrop = this.determinePages(
        task.options.applyMode,
        task.options.pages,
        task.options.currentPage,
        totalPages
      );

      if (pagesToCrop.length === 0) {
        throw new Error('没有有效的页面可裁剪');
      }

      logger.info(`Cropping ${pagesToCrop.length} pages: ${pagesToCrop.join(', ')}`);

      // Apply crop to each page
      for (let i = 0; i < pagesToCrop.length; i++) {
        const pageNum = pagesToCrop[i];
        const pageIndex = pageNum - 1; // Convert to 0-based index

        if (pageIndex < 0 || pageIndex >= totalPages) {
          logger.warn(`Page ${pageNum} is out of range, skipping`);
          continue;
        }

        const page = pdfDoc.getPage(pageIndex);
        const { x, y, width, height } = task.options.cropArea;

        // Get current page size for validation
        const pageSize = page.getSize();

        // Validate crop area is within page bounds
        if (x + width > pageSize.width || y + height > pageSize.height) {
          logger.warn(`Crop area exceeds page ${pageNum} bounds, adjusting`);
          // Adjust crop area to fit within page
          const adjustedWidth = Math.min(width, pageSize.width - x);
          const adjustedHeight = Math.min(height, pageSize.height - y);
          page.setCropBox(x, y, adjustedWidth, adjustedHeight);
        } else {
          // Apply crop box
          page.setCropBox(x, y, width, height);
        }

        // Update progress
        task.progress = 30 + Math.round((i / pagesToCrop.length) * 60);
        task.updatedAt = new Date();
      }

      task.progress = 90;
      task.updatedAt = new Date();

      // Save cropped PDF
      const outputDir = ensureOutputDir();
      const outputPath = path.join(outputDir, task.outputFilename);

      const outputBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, outputBytes);

      // Verify output file exists
      if (!fs.existsSync(outputPath)) {
        throw new Error('裁剪失败：输出文件未生成');
      }

      const stats = fs.statSync(outputPath);

      // Update task with output info
      task.status = TaskStatus.COMPLETED;
      task.progress = 100;
      task.outputFile = {
        path: outputPath,
        size: stats.size,
      };
      task.completedAt = new Date();
      task.updatedAt = new Date();

      logger.info(`Crop task completed: ${taskId}`, {
        outputSize: stats.size,
        pagesCropped: pagesToCrop.length,
      });

    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.error = error.message || '裁剪处理失败';
      task.updatedAt = new Date();

      logger.error(`Crop task failed: ${taskId}`, {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      // Clean up input file
      this.cleanupFile(task.inputFile.path);
    }
  }

  /**
   * Clean up a file
   * @param {string} filePath - File path to clean up
   */
  static cleanupFile(filePath) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up file: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to cleanup file: ${filePath}`, {
          error: error.message,
        });
      }
    }
  }

  /**
   * Delete a task and its output file
   * @param {string} taskId - Task ID
   * @returns {boolean} True if deleted, false if not found
   */
  static deleteTask(taskId) {
    const task = taskStore.get(taskId);

    if (!task) {
      return false;
    }

    // Clean up output file if exists
    if (task.outputFile?.path) {
      this.cleanupFile(task.outputFile.path);
    }

    // Clean up input file if still exists
    if (task.inputFile?.path) {
      this.cleanupFile(task.inputFile.path);
    }

    // Remove from store
    taskStore.delete(taskId);

    logger.info(`Task deleted: ${taskId}`);
    return true;
  }

  /**
   * Get user's tasks
   * @param {string} userId - User ID
   * @param {string} visitorId - Visitor ID
   * @returns {Array} Array of tasks
   */
  static getUserTasks(userId, visitorId) {
    const tasks = [];

    for (const [taskId, task] of taskStore.entries()) {
      if ((userId && task.userId === userId) || (visitorId && task.visitorId === visitorId)) {
        tasks.push({
          taskId: task.taskId,
          status: task.status,
          progress: task.progress,
          inputFile: {
            originalName: task.inputFile.originalName,
            size: task.inputFile.size,
          },
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          completedAt: task.completedAt,
        });
      }
    }

    return tasks;
  }

  /**
   * Clean up expired tasks
   * Removes completed/failed tasks older than TASK_EXPIRY_TIME
   */
  static cleanupExpiredTasks() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [taskId, task] of taskStore.entries()) {
      const isExpired = now - task.updatedAt.getTime() > TASK_EXPIRY_TIME;
      const isTerminal = task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED;

      if (isExpired && isTerminal) {
        this.deleteTask(taskId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired tasks`);
    }
  }
}

/**
 * Start periodic task cleanup
 */
setInterval(() => {
  PdfCropService.cleanupExpiredTasks();
}, TASK_CLEANUP_INTERVAL);

module.exports = {
  PdfCropService,
  TaskStatus,
  ApplyMode,
};
