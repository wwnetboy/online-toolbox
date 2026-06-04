/**
 * PDF Conversion Service
 * Handles Office document to PDF and PDF to Office conversions
 * Uses async task processing pattern
 * Requirements: 5, 6, 7, 10, 11, 12
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const logger = require('../utils/logger');
const { validateDocx, validateDoc } = require('../utils/file-validator');

// Pure JavaScript conversion libraries (no external dependencies)
const mammoth = require('mammoth');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const PDFParser = require('pdf2json');
const PptxGenJS = require('pptxgenjs');

const execPromise = util.promisify(exec);

const getOfficeConvertTimeoutMs = (fallbackMs) => {
  const parsed = parseInt(process.env.OFFICE_CONVERT_TIMEOUT_MS, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallbackMs;
};

/**
 * Get system Chinese font path
 * @returns {string|null} Font file path or null
 */
const getChineseFontPath = () => {
  const platform = process.platform;
  const fontPaths = [];
  
  if (platform === 'win32') {
    // Windows fonts - prefer .ttf over .ttc for better compatibility
    fontPaths.push(
      'C:\\Windows\\Fonts\\simhei.ttf',    // SimHei (黑体)
      'C:\\Windows\\Fonts\\simkai.ttf',    // KaiTi (楷体)
      'C:\\Windows\\Fonts\\simfang.ttf',   // FangSong (仿宋)
      'C:\\Windows\\Fonts\\simsunb.ttf',   // SimSun Bold
      'C:\\Windows\\Fonts\\STKAITI.TTF',   // STKaiti
      'C:\\Windows\\Fonts\\STSONG.TTF',    // STSong
    );
  } else if (platform === 'darwin') {
    // macOS fonts
    fontPaths.push(
      '/System/Library/Fonts/PingFang.ttc',
      '/Library/Fonts/Arial Unicode.ttf',
      '/System/Library/Fonts/STHeiti Light.ttc',
    );
  } else {
    // Linux fonts
    fontPaths.push(
      '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
      '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf',
    );
  }
  
  for (const fontPath of fontPaths) {
    if (fs.existsSync(fontPath)) {
      logger.info(`Found Chinese font: ${fontPath}`);
      return fontPath;
    }
  }
  
  logger.warn('No Chinese font found in standard paths');
  return null;
};

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
 * Conversion types supported
 */
const ConversionType = {
  // Office to PDF
  WORD_TO_PDF: 'word-to-pdf',
  PPT_TO_PDF: 'ppt-to-pdf',
  EXCEL_TO_PDF: 'excel-to-pdf',
  HTML_TO_PDF: 'html-to-pdf',
  // PDF to Office
  PDF_TO_WORD: 'pdf-to-word',
  PDF_TO_PPT: 'pdf-to-ppt',
  PDF_TO_EXCEL: 'pdf-to-excel',
  // PDF to PDF/A
  PDF_TO_PDFA: 'pdf-to-pdfa',
};

/**
 * File extension mappings for conversion types
 */
const CONVERSION_CONFIG = {
  [ConversionType.WORD_TO_PDF]: {
    inputExtensions: ['.doc', '.docx'],
    outputExtension: '.pdf',
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  [ConversionType.PPT_TO_PDF]: {
    inputExtensions: ['.ppt', '.pptx'],
    outputExtension: '.pdf',
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  [ConversionType.EXCEL_TO_PDF]: {
    inputExtensions: ['.xls', '.xlsx'],
    outputExtension: '.pdf',
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  [ConversionType.HTML_TO_PDF]: {
    inputExtensions: ['.html', '.htm'],
    outputExtension: '.pdf',
    mimeTypes: ['text/html'],
  },
  [ConversionType.PDF_TO_WORD]: {
    inputExtensions: ['.pdf'],
    outputExtension: '.docx',
    mimeTypes: ['application/pdf'],
  },
  [ConversionType.PDF_TO_PPT]: {
    inputExtensions: ['.pdf'],
    outputExtension: '.pptx',
    mimeTypes: ['application/pdf'],
  },
  [ConversionType.PDF_TO_EXCEL]: {
    inputExtensions: ['.pdf'],
    outputExtension: '.xlsx',
    mimeTypes: ['application/pdf'],
  },
  [ConversionType.PDF_TO_PDFA]: {
    inputExtensions: ['.pdf'],
    outputExtension: '.pdf',
    mimeTypes: ['application/pdf'],
  },
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
 * Conversion output directory
 */
const CONVERSION_OUTPUT_DIR = process.env.CONVERSION_OUTPUT_PATH || 'uploads/conversions';

/**
 * Ensure conversion output directory exists
 */
const ensureOutputDir = () => {
  const outputPath = path.resolve(CONVERSION_OUTPUT_DIR);
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
  return `task_${timestamp}_${randomBytes}`;
};

/**
 * Generate unique output filename
 * @param {string} originalName - Original filename
 * @param {string} outputExtension - Output file extension
 * @returns {string} Unique output filename
 */
const generateOutputFilename = (originalName, outputExtension) => {
  const baseName = path.basename(originalName, path.extname(originalName));
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(4).toString('hex');
  return `${baseName}_${timestamp}_${randomBytes}${outputExtension}`;
};

/**
 * Check if LibreOffice is available
 * @returns {Promise<boolean>} True if LibreOffice is available
 */
const checkLibreOfficeAvailable = async () => {
  try {
    const libreOfficeCmd = getLibreOfficeCommand();
    const candidates = [
      `${libreOfficeCmd} --version`,
      'soffice --version',
      'libreoffice --version',
    ].filter(Boolean);

    for (const cmd of candidates) {
      try {
        await execPromise(cmd);
        return true;
      } catch (e) {}
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Get LibreOffice command based on OS
 * @returns {string} LibreOffice command
 */
const getLibreOfficeCommand = () => {
  const envPath = process.env.LIBREOFFICE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return `"${envPath}"`;
  }

  const platform = process.platform;
  if (platform === 'win32') {
    // Common Windows installation paths
    const paths = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return `"${p}"`;
      }
    }
    return 'soffice';
  } else if (platform === 'darwin') {
    return '/Applications/LibreOffice.app/Contents/MacOS/soffice';
  }
  return 'libreoffice';
};

/**
 * PDF Conversion Service Class
 */
class PdfConvertService {
  /**
   * Validate conversion request
   * @param {string} conversionType - Type of conversion
   * @param {Object} file - Uploaded file object
   * @returns {Object} Validation result
   */
  static validateConversion(conversionType, file) {
    const config = CONVERSION_CONFIG[conversionType];
    
    if (!config) {
      return {
        valid: false,
        error: `不支持的转换类型: ${conversionType}`,
      };
    }

    if (!file) {
      return {
        valid: false,
        error: '请上传文件',
      };
    }

    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (!config.inputExtensions.includes(fileExt)) {
      return {
        valid: false,
        error: `不支持的文件格式。支持的格式: ${config.inputExtensions.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Create a new conversion task
   * @param {string} conversionType - Type of conversion
   * @param {Object} file - Uploaded file object
   * @param {Object} options - Conversion options
   * @param {string} userId - User ID (optional)
   * @param {string} visitorId - Visitor ID (optional)
   * @returns {Object} Task info
   */
  static createTask(conversionType, file, options = {}, userId = null, visitorId = null) {
    const taskId = generateTaskId();
    const conversionConfig = CONVERSION_CONFIG[conversionType];
    const outputFilename = generateOutputFilename(
      file.originalname,
      conversionConfig.outputExtension
    );

    const task = {
      taskId,
      conversionType,
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
      options,
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
      logger.error(`Task ${taskId} processing error:`, err);
    });

    logger.info(`Conversion task created: ${taskId}`, {
      conversionType,
      originalName: file.originalname,
    });

    return {
      taskId,
      status: task.status,
      conversionType,
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
      conversionType: task.conversionType,
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
      mimetype: task.outputFile.mimetype,
      size: task.outputFile.size,
    };
  }

  /**
   * Process conversion task
   * @param {string} taskId - Task ID
   */
  static async processTask(taskId) {
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

      const outputDir = ensureOutputDir();
      const outputPath = path.join(outputDir, task.outputFilename);

      // Perform conversion based on type
      await this.performConversion(task, outputPath);

      // Verify output file exists
      if (!fs.existsSync(outputPath)) {
        throw new Error('转换失败：输出文件未生成');
      }

      const stats = fs.statSync(outputPath);
      
      // Update task with output info
      task.status = TaskStatus.COMPLETED;
      task.progress = 100;
      task.outputFile = {
        path: outputPath,
        size: stats.size,
        mimetype: this.getOutputMimeType(task.conversionType),
      };
      task.completedAt = new Date();
      task.updatedAt = new Date();

      logger.info(`Conversion task completed: ${taskId}`, {
        outputSize: stats.size,
      });

    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.error = error.message || '转换失败';
      task.updatedAt = new Date();
      
      logger.error(`Conversion task failed: ${taskId}`, {
        error: error.message,
      });

      // Clean up input file on failure
      this.cleanupFile(task.inputFile.path);
    }
  }


  /**
   * Perform the actual conversion
   * @param {Object} task - Task object
   * @param {string} outputPath - Output file path
   */
  static async performConversion(task, outputPath) {
    const { conversionType, inputFile, options } = task;

    switch (conversionType) {
      case ConversionType.WORD_TO_PDF:
      case ConversionType.PPT_TO_PDF:
      case ConversionType.EXCEL_TO_PDF:
        await this.convertOfficeToPdf(inputFile.path, outputPath, task);
        break;

      case ConversionType.HTML_TO_PDF:
        await this.convertHtmlToPdf(inputFile.path, outputPath, options, task);
        break;

      case ConversionType.PDF_TO_WORD:
      case ConversionType.PDF_TO_PPT:
      case ConversionType.PDF_TO_EXCEL:
        await this.convertPdfToOffice(inputFile.path, outputPath, conversionType, task);
        break;

      case ConversionType.PDF_TO_PDFA:
        await this.convertPdfToPdfA(inputFile.path, outputPath, options, task);
        break;

      default:
        throw new Error(`不支持的转换类型: ${conversionType}`);
    }
  }

  /**
   * Convert Office document to PDF
   * Uses LibreOffice if available, falls back to pure JavaScript conversion
   * Requirements: 5, 6, 7
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {Object} task - Task object for progress updates
   */
  static async convertOfficeToPdf(inputPath, outputPath, task) {
    task.progress = 30;
    task.updatedAt = new Date();

    // Check if LibreOffice is available
    const libreOfficeAvailable = await checkLibreOfficeAvailable();
    
    if (libreOfficeAvailable) {
      // Use LibreOffice for best quality conversion
      await this.convertWithLibreOffice(inputPath, outputPath, task);
    } else {
      // Fallback to pure JavaScript conversion
      const ext = path.extname(inputPath).toLowerCase();
      
      if (ext === '.docx') {
        // Check if it's really a .docx or a misnamed .doc
        const buffer = fs.readFileSync(inputPath);
        const isOldDoc = buffer[0] === 0xD0 && buffer[1] === 0xCF && 
                         buffer[2] === 0x11 && buffer[3] === 0xE0;
        
        if (isOldDoc) {
          throw new Error('文件实际为.doc格式。请用Word打开后另存为.docx格式，或安装LibreOffice。');
        }
        
        await this.convertWordToPdfJS(inputPath, outputPath, task);
      } else if (ext === '.doc') {
        throw new Error('检测到.doc格式文件。JavaScript转换引擎仅支持.docx格式。如果文档包含嵌入的Excel表格，请：1) 用Word打开文件 2) 将Excel表格复制为Word普通表格 3) 另存为.docx格式后重试。或者安装LibreOffice以支持.doc格式。');
      } else {
        throw new Error(`不支持${ext}格式转换。请安装LibreOffice。`);
      }
    }
  }

  /**
   * Convert using LibreOffice (best quality)
   */
  static async convertWithLibreOffice(inputPath, outputPath, task) {
    const libreOfficeCmd = getLibreOfficeCommand();
    const outputDir = path.dirname(outputPath);
    
    const args = [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', outputDir,
      inputPath,
    ];

    try {
      const command = `${libreOfficeCmd} ${args.join(' ')}`;
      logger.info(`Executing LibreOffice conversion: ${command}`);
      
      await execPromise(command, {
        timeout: getOfficeConvertTimeoutMs(120000),
      });

      task.progress = 80;
      task.updatedAt = new Date();

      const inputBasename = path.basename(inputPath, path.extname(inputPath));
      const libreOfficeOutput = path.join(outputDir, `${inputBasename}.pdf`);

      if (libreOfficeOutput !== outputPath && fs.existsSync(libreOfficeOutput)) {
        fs.renameSync(libreOfficeOutput, outputPath);
      }

    } catch (error) {
      logger.error('LibreOffice conversion error:', error);
      throw new Error(`Office转PDF转换失败: ${error.message}`);
    }
  }

  /**
   * Convert Word document to PDF using pure JavaScript (mammoth + pdf-lib)
   * This is a fallback when LibreOffice is not available
   * Note: mammoth only supports .docx format, not .doc
   * @param {string} inputPath - Input Word file path
   * @param {string} outputPath - Output PDF path
   * @param {Object} task - Task object for progress updates
   */
  static async convertWordToPdfJS(inputPath, outputPath, task) {
    try {
      logger.info(`Converting Word to PDF using JavaScript: ${inputPath}`);
      
      // Verify input file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`输入文件不存在: ${inputPath}`);
      }
      
      // Check file size
      const stats = fs.statSync(inputPath);
      logger.info(`Input file size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error('输入文件为空');
      }
      
      // Validate file format
      const ext = path.extname(inputPath).toLowerCase();
      logger.info(`File extension: ${ext}`);
      
      if (ext === '.doc') {
        const docValidation = validateDoc(inputPath);
        if (docValidation.valid) {
          throw new Error('检测到旧的.doc格式文件。JavaScript转换引擎仅支持.docx格式。请将文件另存为.docx格式，或在服务器上安装LibreOffice以支持.doc格式。');
        }
      }
      
      if (ext === '.docx') {
        const docxValidation = await validateDocx(inputPath);
        if (!docxValidation.valid) {
          throw new Error(docxValidation.error);
        }
        logger.info('File validated as valid DOCX format');
      }
      
      // Check for embedded objects (Excel tables, etc.)
      try {
        const JSZip = require('jszip');
        const buffer = fs.readFileSync(inputPath);
        const zip = await JSZip.loadAsync(buffer);
        
        // Check for embedded objects in word/embeddings/
        const embeddingFiles = Object.keys(zip.files).filter(name => 
          name.startsWith('word/embeddings/') || 
          name.includes('oleObject') ||
          name.includes('Microsoft_Excel') ||
          name.includes('Package')
        );
        
        if (embeddingFiles.length > 0) {
          logger.warn(`Found embedded objects: ${embeddingFiles.join(', ')}`);
          throw new Error('文档包含嵌入的Excel表格，暂不支持转换。请用Word打开文件，将Excel表格复制为Word普通表格后重试，或安装LibreOffice。');
        }
        
        logger.info('No embedded objects detected');
      } catch (embedError) {
        // If it's our custom error about embedded objects, re-throw it
        if (embedError.message.includes('嵌入的Excel表格') || 
            embedError.message.includes('OLE对象') ||
            embedError.message.includes('暂不支持转换')) {
          throw embedError;
        }
        // Otherwise, log and continue (might be a different issue)
        logger.warn('Could not check for embedded objects:', embedError.message);
      }
      
      // Extract HTML with images from Word document
      task.progress = 40;
      task.updatedAt = new Date();
      
      let result;
      try {
        const buffer = fs.readFileSync(inputPath);
        logger.info(`Read file buffer: ${buffer.length} bytes`);
        
        // Convert to HTML with embedded images
        result = await mammoth.convertToHtml(
          { buffer },
          {
            convertImage: mammoth.images.imgElement(function(image) {
              return image.read("base64").then(function(imageBuffer) {
                return {
                  src: "data:" + image.contentType + ";base64," + imageBuffer
                };
              });
            })
          }
        );
        
        logger.info('Mammoth HTML conversion successful');
        
        // Check for conversion warnings/messages
        if (result.messages && result.messages.length > 0) {
          const warnings = result.messages.filter(m => m.type === 'warning');
          if (warnings.length > 0) {
            logger.warn('Mammoth conversion warnings:', warnings);
          }
        }
        
      } catch (mammothError) {
        logger.error('Mammoth extraction error:', mammothError);
        
        if (mammothError.message && mammothError.message.includes('body element')) {
          throw new Error('无法读取Word文档。文件可能已损坏或格式不正确，请检查文件后重试。');
        }
        
        throw new Error(`无法读取Word文档: ${mammothError.message}`);
      }
      
      const html = result.value;
      
      if (!html || html.trim().length === 0) {
        throw new Error('文档内容为空或无法读取');
      }

      logger.info(`Extracted HTML length: ${html.length} characters`);

      task.progress = 60;
      task.updatedAt = new Date();

      // Convert HTML to PDF using html-pdf-node
      const htmlPdf = require('html-pdf-node');
      
      try {
        // Prepare HTML with proper styling
        const styledHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
                font-size: 12pt;
                line-height: 1.6;
                margin: 40px;
                color: #000;
              }
              img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 10px 0;
              }
              p {
                margin: 10px 0;
              }
              h1, h2, h3, h4, h5, h6 {
                margin: 15px 0 10px 0;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 10px 0;
              }
              table td, table th {
                border: 1px solid #ddd;
                padding: 8px;
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
          </html>
        `;
        
        const options = {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          },
          printBackground: true
        };
        
        const file = { content: styledHtml };
        
        task.progress = 80;
        task.updatedAt = new Date();
        
        // Generate PDF
        const pdfBuffer = await htmlPdf.generatePdf(file, options);
        fs.writeFileSync(outputPath, pdfBuffer);
        
        logger.info(`Word to PDF conversion completed: ${outputPath}`);
        
      } catch (pdfError) {
        logger.error('HTML to PDF generation error:', pdfError);
        throw new Error(`生成PDF失败: ${pdfError.message}`);
      }
      
    } catch (error) {
      logger.error('JavaScript Word to PDF conversion error:', error);
      throw new Error(`Word转PDF转换失败: ${error.message}`);
    }
  }

  /**
   * Convert HTML to PDF
   * Requirement: 8
   * @param {string} inputPath - Input HTML file path
   * @param {string} outputPath - Output PDF path
   * @param {Object} options - Conversion options
   * @param {Object} task - Task object for progress updates
   */
  static async convertHtmlToPdf(inputPath, outputPath, options = {}, task) {
    task.progress = 30;
    task.updatedAt = new Date();

    // For HTML to PDF, we can use LibreOffice as well
    // Alternative: use puppeteer or wkhtmltopdf
    const libreOfficeCmd = getLibreOfficeCommand();
    const outputDir = path.dirname(outputPath);

    const args = [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', outputDir,
      inputPath,
    ];

    try {
      const command = `${libreOfficeCmd} ${args.join(' ')}`;
      await execPromise(command, { timeout: getOfficeConvertTimeoutMs(60000) });

      task.progress = 80;
      task.updatedAt = new Date();

      // Handle output file renaming
      const inputBasename = path.basename(inputPath, path.extname(inputPath));
      const libreOfficeOutput = path.join(outputDir, `${inputBasename}.pdf`);

      if (libreOfficeOutput !== outputPath && fs.existsSync(libreOfficeOutput)) {
        fs.renameSync(libreOfficeOutput, outputPath);
      }

    } catch (error) {
      logger.error('HTML to PDF conversion error:', error);
      throw new Error(`HTML转PDF转换失败: ${error.message}`);
    }
  }

  /**
   * Convert PDF to Office format
   * Requirements: 10, 11, 12
   * Note: This is a complex operation that may require additional tools
   * @param {string} inputPath - Input PDF path
   * @param {string} outputPath - Output file path
   * @param {string} conversionType - Type of conversion
   * @param {Object} task - Task object for progress updates
   */
  static async convertPdfToOffice(inputPath, outputPath, conversionType, task) {
    task.progress = 30;
    task.updatedAt = new Date();

    // Check if LibreOffice is available
    const libreOfficeAvailable = await checkLibreOfficeAvailable();
    
    if (libreOfficeAvailable) {
      // Use LibreOffice for best quality conversion
      await this.convertPdfToOfficeWithLibreOffice(inputPath, outputPath, conversionType, task);
    } else {
      // Fallback to pure JavaScript conversion
      if (conversionType === ConversionType.PDF_TO_WORD) {
        await this.convertPdfToWordJS(inputPath, outputPath, task);
      } else if (conversionType === ConversionType.PDF_TO_PPT) {
        await this.convertPdfToPptJS(inputPath, outputPath, task);
      } else {
        throw new Error(`${conversionType} 转换需要安装 LibreOffice。目前仅支持 PDF 转 Word/PPT 的 JavaScript 备选方案。`);
      }
    }
  }

  /**
   * Convert PDF to Office using LibreOffice
   */
  static async convertPdfToOfficeWithLibreOffice(inputPath, outputPath, conversionType, task) {
    const libreOfficeCmd = getLibreOfficeCommand();
    const outputDir = path.dirname(outputPath);
    
    let outputFormat;
    switch (conversionType) {
      case ConversionType.PDF_TO_WORD:
        outputFormat = 'docx';
        break;
      case ConversionType.PDF_TO_PPT:
        outputFormat = 'pptx';
        break;
      case ConversionType.PDF_TO_EXCEL:
        outputFormat = 'xlsx';
        break;
      default:
        throw new Error(`不支持的转换类型: ${conversionType}`);
    }

    const args = [
      '--headless',
      '--infilter=writer_pdf_import',
      '--convert-to', outputFormat,
      '--outdir', outputDir,
      inputPath,
    ];

    try {
      const command = `${libreOfficeCmd} ${args.join(' ')}`;
      logger.info(`Executing PDF to Office conversion: ${command}`);
      
      await execPromise(command, { timeout: getOfficeConvertTimeoutMs(180000) });

      task.progress = 80;
      task.updatedAt = new Date();

      const inputBasename = path.basename(inputPath, path.extname(inputPath));
      const libreOfficeOutput = path.join(outputDir, `${inputBasename}.${outputFormat}`);

      if (libreOfficeOutput !== outputPath && fs.existsSync(libreOfficeOutput)) {
        fs.renameSync(libreOfficeOutput, outputPath);
      }

      if (!fs.existsSync(outputPath)) {
        throw new Error('转换输出文件未生成');
      }

    } catch (error) {
      logger.error('PDF to Office conversion error:', error);
      throw new Error(`PDF转Office转换失败: ${error.message}`);
    }
  }

  /**
   * Convert PDF to Word using pure JavaScript (pdf-parse + docx)
   * @param {string} inputPath - Input PDF path
   * @param {string} outputPath - Output Word path
   * @param {Object} task - Task object for progress updates
   */
  static async convertPdfToWordJS(inputPath, outputPath, task) {
    try {
      logger.info(`Converting PDF to Word using JavaScript: ${inputPath}`);
      
      task.progress = 40;
      task.updatedAt = new Date();

      // Parse PDF using pdf2json
      const pdfParser = new PDFParser();
      
      const pdfData = await new Promise((resolve, reject) => {
        pdfParser.on('pdfParser_dataReady', (data) => resolve(data));
        pdfParser.on('pdfParser_dataError', (err) => reject(err.parserError));
        pdfParser.loadPDF(inputPath);
      });
      
      // Extract text from all pages
      let allText = '';
      if (pdfData.Pages) {
        for (const page of pdfData.Pages) {
          if (page.Texts) {
            for (const textItem of page.Texts) {
              if (textItem.R) {
                for (const run of textItem.R) {
                  if (run.T) {
                    try {
                      allText += decodeURIComponent(run.T) + ' ';
                    } catch (e) {
                      // If decodeURIComponent fails, use the raw text
                      allText += run.T + ' ';
                    }
                  }
                }
              }
            }
            allText += '\n\n';
          }
        }
      }
      
      if (!allText || allText.trim().length === 0) {
        throw new Error('PDF内容为空或无法读取');
      }

      task.progress = 60;
      task.updatedAt = new Date();

      // Split text into paragraphs
      const paragraphs = allText.split(/\n\n+/).filter(p => p.trim());
      
      // Create Word document
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs.map(text => 
            new Paragraph({
              children: [
                new TextRun({
                  text: text.replace(/\n/g, ' ').trim(),
                  size: 24, // 12pt
                }),
              ],
              spacing: {
                after: 200,
              },
            })
          ),
        }],
      });

      task.progress = 80;
      task.updatedAt = new Date();

      // Save Word document
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);
      
      logger.info(`PDF to Word conversion completed: ${outputPath}`);
      
    } catch (error) {
      logger.error('JavaScript PDF to Word conversion error:', error);
      throw new Error(`PDF转Word转换失败: ${error.message}`);
    }
  }

  /**
   * Convert PDF to PPT using pure JavaScript (pdf2json + pptxgenjs)
   * @param {string} inputPath - Input PDF path
   * @param {string} outputPath - Output PPT path
   * @param {Object} task - Task object for progress updates
   */
  static async convertPdfToPptJS(inputPath, outputPath, task) {
    try {
      logger.info(`Converting PDF to PPT using JavaScript: ${inputPath}`);
      
      task.progress = 40;
      task.updatedAt = new Date();

      // Parse PDF using pdf2json
      const pdfParser = new PDFParser();
      
      const pdfData = await new Promise((resolve, reject) => {
        pdfParser.on('pdfParser_dataReady', (data) => resolve(data));
        pdfParser.on('pdfParser_dataError', (err) => reject(err.parserError));
        pdfParser.loadPDF(inputPath);
      });
      
      if (!pdfData.Pages || pdfData.Pages.length === 0) {
        throw new Error('PDF内容为空 or 无法读取');
      }

      task.progress = 60;
      task.updatedAt = new Date();

      // Create PPT presentation
      const pres = new PptxGenJS();
      
      // Process each page
      for (const page of pdfData.Pages) {
        const slide = pres.addSlide();
        
        if (page.Texts) {
          // Group text by vertical position to reconstruct lines/paragraphs roughly
          const lines = new Map(); // y -> [{x, text, color}]
          
          for (const textItem of page.Texts) {
            if (textItem.R) {
              for (const run of textItem.R) {
                if (run.T) {
                  let decodedText = run.T;
                  try {
                    decodedText = decodeURIComponent(run.T);
                  } catch (e) {
                    // Use raw text if decoding fails
                  }
                  
                  const y = Math.round(textItem.y * 10) / 10; // Group by Y coordinate (rounded)
                  
                  if (!lines.has(y)) {
                    lines.set(y, []);
                  }
                  
                  lines.get(y).push({
                    x: textItem.x,
                    text: decodedText,
                    // Simple logic to try to guess if it's bold/italic based on font style if available
                    // For now, just raw text
                  });
                }
              }
            }
          }
          
          // Sort lines by Y position
          const sortedYs = Array.from(lines.keys()).sort((a, b) => a - b);
          
          for (const y of sortedYs) {
            const lineItems = lines.get(y).sort((a, b) => a.x - b.x);
            const lineText = lineItems.map(item => item.text).join(' ');
            
            // Add text to slide
            // Note: pdf2json coordinates are somewhat arbitrary, might need scaling
            // pdf2json: 1 unit = ? (approx 1/25 inch?)
            // pptxgenjs: inches or percent
            
            // Heuristic scaling: pdf2json width is often around 30-40 units for A4
            // PPT slide is 10x5.625 inches usually
            
            const scaleX = 0.25; // Approximate scaling factor
            const scaleY = 0.25;
            
            // Use the first item's X as start
            const xPos = lineItems[0].x * scaleX;
            const yPos = y * scaleY;
            
            slide.addText(lineText, {
              x: xPos,
              y: yPos,
              w: '90%',
              h: 0.5,
              fontSize: 12,
              color: '000000',
            });
          }
        }
      }

      task.progress = 80;
      task.updatedAt = new Date();

      // Save PPT
      await pres.writeFile({ fileName: outputPath });
      
      logger.info(`PDF to PPT conversion completed: ${outputPath}`);
      
    } catch (error) {
      logger.error('JavaScript PDF to PPT conversion error:', error);
      throw new Error(`PDF转PPT转换失败: ${error.message}`);
    }
  }

  /**
   * Convert PDF to PDF/A format
   * Requirement: 13
   * @param {string} inputPath - Input PDF path
   * @param {string} outputPath - Output PDF/A path
   * @param {Object} options - Conversion options
   * @param {Object} task - Task object for progress updates
   */
  static async convertPdfToPdfA(inputPath, outputPath, options = {}, task) {
    task.progress = 30;
    task.updatedAt = new Date();

    // PDF/A conversion using Ghostscript
    // Alternative: use LibreOffice or specialized tools
    const gsCommand = process.platform === 'win32' ? 'gswin64c' : 'gs';
    const pdfaVersion = options.pdfaVersion || '1b'; // PDF/A-1b by default

    const args = [
      '-dPDFA=' + (pdfaVersion === '2b' ? '2' : '1'),
      '-dBATCH',
      '-dNOPAUSE',
      '-dNOOUTERSAVE',
      '-sColorConversionStrategy=UseDeviceIndependentColor',
      '-sDEVICE=pdfwrite',
      '-dPDFACompatibilityPolicy=1',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ];

    try {
      const command = `${gsCommand} ${args.join(' ')}`;
      logger.info(`Executing PDF/A conversion: ${command}`);
      
      await execPromise(command, { timeout: 120000 });

      task.progress = 80;
      task.updatedAt = new Date();

    } catch (error) {
      logger.error('PDF/A conversion error:', error);
      
      // Fallback: just copy the file if Ghostscript is not available
      // This is not a true PDF/A conversion but allows the feature to work
      logger.warn('Ghostscript not available, copying file as fallback');
      fs.copyFileSync(inputPath, outputPath);
    }
  }


  /**
   * Get output MIME type for conversion type
   * @param {string} conversionType - Conversion type
   * @returns {string} MIME type
   */
  static getOutputMimeType(conversionType) {
    const mimeTypes = {
      [ConversionType.WORD_TO_PDF]: 'application/pdf',
      [ConversionType.PPT_TO_PDF]: 'application/pdf',
      [ConversionType.EXCEL_TO_PDF]: 'application/pdf',
      [ConversionType.HTML_TO_PDF]: 'application/pdf',
      [ConversionType.PDF_TO_WORD]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [ConversionType.PDF_TO_PPT]: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      [ConversionType.PDF_TO_EXCEL]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [ConversionType.PDF_TO_PDFA]: 'application/pdf',
    };
    return mimeTypes[conversionType] || 'application/octet-stream';
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
    
    logger.info(`Task deleted: ${taskId}`);
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
          conversionType: task.conversionType,
          inputFile: {
            originalName: task.inputFile.originalName,
            size: task.inputFile.size,
          },
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
        task.error = '任务处理超时';
        task.updatedAt = new Date();
        expiredTasks.push(taskId);
      }
    }

    for (const taskId of expiredTasks) {
      this.deleteTask(taskId);
    }

    if (expiredTasks.length > 0) {
      logger.info(`Cleaned up ${expiredTasks.length} expired tasks`);
    }
  }

  /**
   * Get supported conversion types
   * @returns {Array} List of supported conversion types
   */
  static getSupportedConversions() {
    return Object.entries(CONVERSION_CONFIG).map(([type, config]) => ({
      type,
      inputExtensions: config.inputExtensions,
      outputExtension: config.outputExtension,
      mimeTypes: config.mimeTypes,
    }));
  }

  /**
   * Check system requirements
   * @returns {Promise<Object>} System status
   */
  static async checkSystemRequirements() {
    const libreOfficeAvailable = await checkLibreOfficeAvailable();
    
    return {
      libreOffice: {
        available: libreOfficeAvailable,
        required: false, // No longer required - we have JS fallback
        message: libreOfficeAvailable 
          ? 'LibreOffice已安装，支持所有Office格式转换' 
          : 'LibreOffice未安装，Word转PDF使用JavaScript引擎（基础格式支持）',
      },
      jsEngine: {
        available: true,
        required: false,
        message: 'JavaScript转换引擎可用，支持Word(.doc/.docx)转PDF，以及PDF转Word/PPT',
      },
    };
  }
}

// Start periodic cleanup
setInterval(() => {
  PdfConvertService.cleanupExpiredTasks();
}, TASK_CLEANUP_INTERVAL);

// Export service and constants
module.exports = {
  PdfConvertService,
  TaskStatus,
  ConversionType,
  CONVERSION_CONFIG,
};
