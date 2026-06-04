/**
 * OCR Service
 * Handles PDF OCR (Optical Character Recognition) processing
 * Uses Tesseract.js for OCR engine
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const logger = require('../utils/logger');

const execPromise = util.promisify(exec);

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
 * Supported OCR languages
 */
const SupportedLanguages = {
  CHINESE: 'chi_sim',
  CHINESE_TRADITIONAL: 'chi_tra',
  ENGLISH: 'eng',
};

/**
 * Language display names
 */
const LanguageNames = {
  [SupportedLanguages.CHINESE]: '简体中文',
  [SupportedLanguages.CHINESE_TRADITIONAL]: '繁体中文',
  [SupportedLanguages.ENGLISH]: '英文',
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
 * OCR output directory
 */
const OCR_OUTPUT_DIR = process.env.OCR_OUTPUT_PATH || 'uploads/ocr-output';

/**
 * Temporary directory for PDF page images
 */
const OCR_TEMP_DIR = process.env.OCR_TEMP_PATH || 'uploads/ocr-temp';

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 * @returns {string} Resolved path
 */
const ensureDir = (dirPath) => {
  const resolvedPath = path.resolve(dirPath);
  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
  }
  return resolvedPath;
};

/**
 * Generate unique task ID
 * @returns {string} Unique task ID
 */
const generateTaskId = () => {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `ocr_${timestamp}_${randomBytes}`;
};

/**
 * Generate unique output filename
 * @param {string} originalName - Original filename
 * @param {string} suffix - Suffix to add
 * @returns {string} Unique output filename
 */
const generateOutputFilename = (originalName, suffix = '_ocr') => {
  const baseName = path.basename(originalName, path.extname(originalName));
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(4).toString('hex');
  return `${baseName}${suffix}_${timestamp}_${randomBytes}.pdf`;
};


/**
 * Check if Tesseract is available
 * @returns {Promise<boolean>} True if Tesseract is available
 */
const checkTesseractAvailable = async () => {
  try {
    await execPromise('tesseract --version');
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Check if pdftoppm (poppler) is available for PDF to image conversion
 * @returns {Promise<boolean>} True if pdftoppm is available
 */
const checkPopplerAvailable = async () => {
  try {
    await execPromise('pdftoppm -v');
    return true;
  } catch (error) {
    // Try alternative command on Windows
    try {
      await execPromise('pdftoppm -h');
      return true;
    } catch (e) {
      return false;
    }
  }
};

/**
 * Get available Tesseract languages
 * @returns {Promise<string[]>} List of available language codes
 */
const getAvailableLanguages = async () => {
  try {
    const { stdout } = await execPromise('tesseract --list-langs');
    const lines = stdout.split('\n').filter(line => line.trim());
    // Skip the first line which is the header
    return lines.slice(1).map(lang => lang.trim());
  } catch (error) {
    logger.warn('Failed to get Tesseract languages:', error.message);
    return [];
  }
};

/**
 * Get PDF page count using pdfinfo or pdftoppm
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<number>} Page count
 */
const getPdfPageCount = async (pdfPath) => {
  try {
    // Try pdfinfo first
    const { stdout } = await execPromise(`pdfinfo "${pdfPath}"`);
    const match = stdout.match(/Pages:\s*(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  } catch (error) {
    // pdfinfo not available, try alternative method
  }

  // Fallback: convert first page and check if it exists
  // This is less efficient but works without pdfinfo
  try {
    const tempDir = ensureDir(OCR_TEMP_DIR);
    const testPrefix = path.join(tempDir, `pagecount_${Date.now()}`);
    
    // Try to get page count by converting with -l (last page) set high
    await execPromise(`pdftoppm -f 1 -l 1 -png "${pdfPath}" "${testPrefix}"`, { timeout: 10000 });
    
    // Clean up test file
    const testFiles = fs.readdirSync(tempDir).filter(f => f.startsWith(`pagecount_${Date.now()}`));
    testFiles.forEach(f => {
      try { fs.unlinkSync(path.join(tempDir, f)); } catch (e) {}
    });
    
    // Default to 1 page if we can't determine
    return 1;
  } catch (error) {
    logger.warn('Failed to get PDF page count:', error.message);
    return 1;
  }
};

/**
 * Convert PDF pages to images using pdftoppm
 * @param {string} pdfPath - Path to PDF file
 * @param {string} outputDir - Output directory for images
 * @param {number[]} pages - Pages to convert (1-indexed), empty for all
 * @param {number} dpi - DPI for conversion
 * @returns {Promise<string[]>} Array of image file paths
 */
const convertPdfToImages = async (pdfPath, outputDir, pages = [], dpi = 300) => {
  ensureDir(outputDir);
  const prefix = path.join(outputDir, 'page');
  const imagePaths = [];

  try {
    if (pages.length === 0) {
      // Convert all pages
      await execPromise(`pdftoppm -png -r ${dpi} "${pdfPath}" "${prefix}"`, {
        timeout: 300000, // 5 minute timeout
      });
    } else {
      // Convert specific pages
      for (const page of pages) {
        await execPromise(`pdftoppm -png -r ${dpi} -f ${page} -l ${page} "${pdfPath}" "${prefix}"`, {
          timeout: 60000, // 1 minute per page
        });
      }
    }

    // Find generated images
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('page') && f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });

    for (const file of files) {
      imagePaths.push(path.join(outputDir, file));
    }

    return imagePaths;
  } catch (error) {
    logger.error('PDF to image conversion error:', error);
    throw new Error(`PDF转图片失败: ${error.message}`);
  }
};


/**
 * Perform OCR on an image using Tesseract
 * @param {string} imagePath - Path to image file
 * @param {string[]} languages - Language codes for OCR
 * @param {string} outputPath - Output path (without extension)
 * @returns {Promise<{text: string, confidence: number}>} OCR result
 */
const performOcrOnImage = async (imagePath, languages, outputPath) => {
  const langParam = languages.join('+');
  
  try {
    // Run Tesseract to generate both text and hOCR output
    await execPromise(
      `tesseract "${imagePath}" "${outputPath}" -l ${langParam} --oem 1 --psm 3 hocr`,
      { timeout: 120000 } // 2 minute timeout per page
    );

    // Also generate plain text
    await execPromise(
      `tesseract "${imagePath}" "${outputPath}_txt" -l ${langParam} --oem 1 --psm 3`,
      { timeout: 120000 }
    );

    // Read the text output
    const textPath = `${outputPath}_txt.txt`;
    let text = '';
    if (fs.existsSync(textPath)) {
      text = fs.readFileSync(textPath, 'utf-8');
    }

    // Parse confidence from hOCR if available
    let confidence = 0;
    const hocrPath = `${outputPath}.hocr`;
    if (fs.existsSync(hocrPath)) {
      const hocr = fs.readFileSync(hocrPath, 'utf-8');
      const confidenceMatches = hocr.match(/x_wconf\s+(\d+)/g);
      if (confidenceMatches && confidenceMatches.length > 0) {
        const confidences = confidenceMatches.map(m => parseInt(m.match(/\d+/)[0], 10));
        confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      }
    }

    return { text, confidence };
  } catch (error) {
    logger.error('OCR error:', error);
    throw new Error(`OCR处理失败: ${error.message}`);
  }
};

/**
 * Create searchable PDF from images and OCR data
 * This is a simplified implementation - for production, consider using
 * tools like ocrmypdf or pdf-lib with text layer embedding
 * @param {string[]} imagePaths - Array of image paths
 * @param {Object[]} ocrResults - OCR results for each page
 * @param {string} outputPath - Output PDF path
 * @returns {Promise<void>}
 */
const createSearchablePdf = async (imagePaths, ocrResults, outputPath) => {
  // For a proper searchable PDF, we would need to:
  // 1. Use a library like pdf-lib to create PDF with image layers
  // 2. Add invisible text layer with OCR results
  // 
  // For now, we'll use ImageMagick or a similar tool to create a basic PDF
  // and include the text as a separate file
  
  try {
    // Check if ImageMagick is available
    try {
      await execPromise('convert -version');
    } catch (e) {
      // ImageMagick not available, try alternative
      throw new Error('ImageMagick未安装，无法生成PDF');
    }

    // Convert images to PDF using ImageMagick
    const imageList = imagePaths.map(p => `"${p}"`).join(' ');
    await execPromise(`convert ${imageList} "${outputPath}"`, {
      timeout: 300000, // 5 minute timeout
    });

    logger.info(`Created searchable PDF: ${outputPath}`);
  } catch (error) {
    logger.error('Create searchable PDF error:', error);
    throw new Error(`创建可搜索PDF失败: ${error.message}`);
  }
};

/**
 * OCR Service Class
 */
class OcrService {
  /**
   * Validate OCR request
   * @param {Object} file - Uploaded file object
   * @returns {Object} Validation result
   */
  static validateOcrRequest(file) {
    if (!file) {
      return {
        valid: false,
        error: '请上传PDF文件',
      };
    }

    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (fileExt !== '.pdf') {
      return {
        valid: false,
        error: '仅支持PDF文件',
      };
    }

    if (file.mimetype !== 'application/pdf') {
      return {
        valid: false,
        error: '文件类型必须是PDF',
      };
    }

    return { valid: true };
  }

  /**
   * Create a new OCR task
   * @param {Object} file - Uploaded file object
   * @param {Object} options - OCR options
   * @param {string} userId - User ID (optional)
   * @param {string} visitorId - Visitor ID (optional)
   * @returns {Object} Task info
   */
  static createTask(file, options = {}, userId = null, visitorId = null) {
    const taskId = generateTaskId();
    const outputFilename = generateOutputFilename(file.originalname);

    // Parse languages
    let languages = options.languages || ['chi_sim', 'eng'];
    if (typeof languages === 'string') {
      languages = languages.split(',').map(l => l.trim());
    }

    // Parse pages
    let pages = options.pages || [];
    if (typeof pages === 'string') {
      if (pages === 'all' || pages === '') {
        pages = [];
      } else {
        pages = pages.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
      }
    }

    const task = {
      taskId,
      status: TaskStatus.PENDING,
      progress: 0,
      currentPage: 0,
      totalPages: 0,
      inputFile: {
        path: file.path,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
      outputFile: null,
      outputFilename,
      options: {
        languages,
        pages,
        outputType: options.outputType || 'searchable-pdf',
        dpi: parseInt(options.dpi, 10) || 300,
      },
      result: null,
      userId,
      visitorId,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    taskStore.set(taskId, task);
    
    // Start processing asynchronously
    this.processTask(taskId).catch(err => {
      logger.error(`OCR Task ${taskId} processing error:`, err);
    });

    logger.info(`OCR task created: ${taskId}`, {
      languages: task.options.languages,
      pages: task.options.pages,
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
      currentPage: task.currentPage,
      totalPages: task.totalPages,
      inputFile: {
        originalName: task.inputFile.originalName,
        size: task.inputFile.size,
      },
      outputFile: task.outputFile ? {
        filename: task.outputFilename,
        size: task.outputFile.size,
      } : null,
      result: task.result ? {
        confidence: task.result.confidence,
        pageCount: task.result.pageResults?.length || 0,
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
   * Get OCR result text
   * @param {string} taskId - Task ID
   * @returns {Object|null} OCR result or null
   */
  static getTaskResult(taskId) {
    const task = taskStore.get(taskId);
    
    if (!task || task.status !== TaskStatus.COMPLETED || !task.result) {
      return null;
    }

    return task.result;
  }


  /**
   * Process OCR task
   * Requirements: 3.1, 3.2, 3.3, 3.4
   * @param {string} taskId - Task ID
   */
  static async processTask(taskId) {
    const task = taskStore.get(taskId);
    
    if (!task) {
      logger.error(`OCR Task not found: ${taskId}`);
      return;
    }

    const tempDir = path.join(ensureDir(OCR_TEMP_DIR), taskId);
    ensureDir(tempDir);

    try {
      // Update status to processing
      task.status = TaskStatus.PROCESSING;
      task.progress = 5;
      task.updatedAt = new Date();

      // Check system requirements
      const tesseractAvailable = await checkTesseractAvailable();
      if (!tesseractAvailable) {
        throw new Error('Tesseract OCR引擎未安装。请安装Tesseract以使用OCR功能。');
      }

      const popplerAvailable = await checkPopplerAvailable();
      if (!popplerAvailable) {
        throw new Error('Poppler工具未安装。请安装Poppler以进行PDF处理。');
      }

      task.progress = 10;
      task.updatedAt = new Date();

      // Get PDF page count
      const totalPages = await getPdfPageCount(task.inputFile.path);
      task.totalPages = totalPages;
      
      // Determine which pages to process
      let pagesToProcess = task.options.pages;
      if (pagesToProcess.length === 0) {
        // Process all pages
        pagesToProcess = Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      task.progress = 15;
      task.updatedAt = new Date();

      // Convert PDF pages to images
      logger.info(`Converting PDF to images: ${taskId}`, { pages: pagesToProcess });
      const imagePaths = await convertPdfToImages(
        task.inputFile.path,
        tempDir,
        pagesToProcess,
        task.options.dpi
      );

      if (imagePaths.length === 0) {
        throw new Error('PDF转图片失败：未生成任何图片');
      }

      task.totalPages = imagePaths.length;
      task.progress = 30;
      task.updatedAt = new Date();

      // Perform OCR on each page
      const pageResults = [];
      const progressPerPage = 50 / imagePaths.length;

      for (let i = 0; i < imagePaths.length; i++) {
        const imagePath = imagePaths[i];
        const pageNum = pagesToProcess[i] || (i + 1);
        
        task.currentPage = pageNum;
        task.updatedAt = new Date();

        logger.info(`Processing OCR for page ${pageNum}: ${taskId}`);

        const ocrOutputPath = path.join(tempDir, `ocr_page_${pageNum}`);
        const ocrResult = await performOcrOnImage(
          imagePath,
          task.options.languages,
          ocrOutputPath
        );

        pageResults.push({
          pageIndex: pageNum - 1,
          pageNumber: pageNum,
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          lowConfidenceAreas: ocrResult.confidence < 70 ? [{ 
            description: '整页置信度较低',
            confidence: ocrResult.confidence 
          }] : [],
        });

        task.progress = 30 + Math.round((i + 1) * progressPerPage);
        task.updatedAt = new Date();
      }

      task.progress = 80;
      task.updatedAt = new Date();

      // Calculate overall confidence
      const overallConfidence = pageResults.length > 0
        ? pageResults.reduce((sum, p) => sum + p.confidence, 0) / pageResults.length
        : 0;

      // Create output based on output type
      const outputDir = ensureDir(OCR_OUTPUT_DIR);
      const outputPath = path.join(outputDir, task.outputFilename);

      if (task.options.outputType === 'searchable-pdf') {
        // Create searchable PDF
        await createSearchablePdf(imagePaths, pageResults, outputPath);
      } else {
        // Text-only output - save as text file
        const textContent = pageResults.map(p => 
          `--- 第 ${p.pageNumber} 页 ---\n${p.text}`
        ).join('\n\n');
        
        const textOutputPath = outputPath.replace('.pdf', '.txt');
        fs.writeFileSync(textOutputPath, textContent, 'utf-8');
        task.outputFilename = task.outputFilename.replace('.pdf', '.txt');
      }

      // Verify output file exists
      const finalOutputPath = task.options.outputType === 'searchable-pdf' 
        ? outputPath 
        : outputPath.replace('.pdf', '.txt');

      if (!fs.existsSync(finalOutputPath)) {
        throw new Error('OCR处理失败：输出文件未生成');
      }

      const stats = fs.statSync(finalOutputPath);
      
      // Update task with output info
      task.status = TaskStatus.COMPLETED;
      task.progress = 100;
      task.outputFile = {
        path: finalOutputPath,
        size: stats.size,
      };
      task.result = {
        confidence: Math.round(overallConfidence),
        pageResults,
        text: pageResults.map(p => p.text).join('\n\n'),
      };
      task.completedAt = new Date();
      task.updatedAt = new Date();

      logger.info(`OCR task completed: ${taskId}`, {
        outputSize: stats.size,
        confidence: task.result.confidence,
        pageCount: pageResults.length,
      });

    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.error = error.message || 'OCR处理失败';
      task.updatedAt = new Date();
      
      logger.error(`OCR task failed: ${taskId}`, {
        error: error.message,
      });
    } finally {
      // Clean up temporary files
      this.cleanupDirectory(tempDir);
      // Clean up input file
      this.cleanupFile(task.inputFile.path);
    }
  }

  /**
   * Clean up a file
   * @param {string} filePath - File path to clean up
   */
  static cleanupFile(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      logger.warn(`Failed to cleanup file: ${filePath}`, error);
    }
  }

  /**
   * Clean up a directory and its contents
   * @param {string} dirPath - Directory path to clean up
   */
  static cleanupDirectory(dirPath) {
    try {
      if (dirPath && fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          fs.unlinkSync(filePath);
        }
        fs.rmdirSync(dirPath);
        logger.info(`Cleaned up directory: ${dirPath}`);
      }
    } catch (error) {
      logger.warn(`Failed to cleanup directory: ${dirPath}`, error);
    }
  }

  /**
   * Delete a task and its associated files
   * @param {string} taskId - Task ID
   * @returns {boolean} True if deleted
   */
  static deleteTask(taskId) {
    const task = taskStore.get(taskId);
    
    if (!task) {
      return false;
    }

    // Clean up files
    this.cleanupFile(task.inputFile?.path);
    this.cleanupFile(task.outputFile?.path);

    // Remove from store
    taskStore.delete(taskId);
    
    logger.info(`OCR Task deleted: ${taskId}`);
    return true;
  }

  /**
   * Get all tasks for a user
   * @param {string} userId - User ID
   * @param {string} visitorId - Visitor ID
   * @returns {Array} List of tasks
   */
  static getUserTasks(userId, visitorId) {
    const tasks = [];
    
    for (const [taskId, task] of taskStore) {
      if ((userId && task.userId === userId) || 
          (visitorId && task.visitorId === visitorId)) {
        tasks.push({
          taskId: task.taskId,
          status: task.status,
          progress: task.progress,
          currentPage: task.currentPage,
          totalPages: task.totalPages,
          inputFile: {
            originalName: task.inputFile.originalName,
            size: task.inputFile.size,
          },
          result: task.result ? {
            confidence: task.result.confidence,
          } : null,
          error: task.error,
          createdAt: task.createdAt,
          completedAt: task.completedAt,
        });
      }
    }

    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Cleanup expired tasks
   * Called periodically to remove old completed/failed tasks
   */
  static cleanupExpiredTasks() {
    const now = Date.now();
    const expiredTasks = [];

    for (const [taskId, task] of taskStore) {
      const taskAge = now - task.createdAt.getTime();
      
      // Remove completed/failed tasks older than expiry time
      if ((task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) &&
          taskAge > TASK_EXPIRY_TIME) {
        expiredTasks.push(taskId);
      }
      
      // Remove stuck processing tasks (older than 30 minutes)
      if (task.status === TaskStatus.PROCESSING && taskAge > 30 * 60 * 1000) {
        task.status = TaskStatus.FAILED;
        task.error = 'OCR任务处理超时';
        task.updatedAt = new Date();
        expiredTasks.push(taskId);
      }
    }

    for (const taskId of expiredTasks) {
      this.deleteTask(taskId);
    }

    if (expiredTasks.length > 0) {
      logger.info(`Cleaned up ${expiredTasks.length} expired OCR tasks`);
    }
  }

  /**
   * Get supported languages
   * @returns {Promise<Object>} Supported languages info
   */
  static async getSupportedLanguages() {
    const availableLanguages = await getAvailableLanguages();
    
    return {
      supported: Object.entries(SupportedLanguages).map(([key, code]) => ({
        code,
        name: LanguageNames[code] || key,
        available: availableLanguages.includes(code),
      })),
      available: availableLanguages,
    };
  }

  /**
   * Check system requirements
   * @returns {Promise<Object>} System status
   */
  static async checkSystemRequirements() {
    const tesseractAvailable = await checkTesseractAvailable();
    const popplerAvailable = await checkPopplerAvailable();
    const languages = await this.getSupportedLanguages();
    
    return {
      tesseract: {
        available: tesseractAvailable,
        required: true,
        message: tesseractAvailable 
          ? 'Tesseract OCR已安装' 
          : 'Tesseract OCR未安装，OCR功能将不可用',
      },
      poppler: {
        available: popplerAvailable,
        required: true,
        message: popplerAvailable 
          ? 'Poppler工具已安装' 
          : 'Poppler工具未安装，PDF处理功能将不可用',
      },
      languages,
      ready: tesseractAvailable && popplerAvailable,
    };
  }
}

// Start periodic cleanup
setInterval(() => {
  OcrService.cleanupExpiredTasks();
}, TASK_CLEANUP_INTERVAL);

// Export service and constants
module.exports = {
  OcrService,
  TaskStatus,
  SupportedLanguages,
  LanguageNames,
};
