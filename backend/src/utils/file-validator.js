/**
 * File Validator Utility
 * Validates file types by checking magic numbers (file signatures)
 */

const fs = require('fs');

/**
 * File signatures (magic numbers) for common file types
 */
const FILE_SIGNATURES = {
  // ZIP-based formats (including .docx, .xlsx, .pptx)
  ZIP: [
    [0x50, 0x4B, 0x03, 0x04], // Standard ZIP
    [0x50, 0x4B, 0x05, 0x06], // Empty ZIP
    [0x50, 0x4B, 0x07, 0x08], // Spanned ZIP
  ],
  // Old Office formats
  DOC: [
    [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE2/CFB (used by .doc, .xls, .ppt)
  ],
  // PDF
  PDF: [
    [0x25, 0x50, 0x44, 0x46], // %PDF
  ],
};

/**
 * Check if buffer starts with any of the given signatures
 * @param {Buffer} buffer - File buffer
 * @param {Array<Array<number>>} signatures - Array of signature arrays
 * @returns {boolean} True if matches any signature
 */
function matchesSignature(buffer, signatures) {
  for (const signature of signatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return true;
    }
  }
  return false;
}

/**
 * Validate if file is a valid DOCX (ZIP-based Office format)
 * @param {string} filePath - Path to file
 * @returns {Object} Validation result
 */
function validateDocx(filePath) {
  try {
    // Read first 8 bytes to check signature
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    // Check if it's a ZIP file (DOCX is a ZIP archive)
    if (!matchesSignature(buffer, FILE_SIGNATURES.ZIP)) {
      // Check if it's an old DOC format
      if (matchesSignature(buffer, FILE_SIGNATURES.DOC)) {
        return {
          valid: false,
          error: '检测到旧的.doc格式文件。请将文件另存为.docx格式，或在服务器上安装LibreOffice以支持.doc格式。',
          fileType: 'doc',
        };
      }

      return {
        valid: false,
        error: '文件不是有效的.docx格式（.docx文件应该是ZIP压缩包）。请确保文件是真正的Word文档。',
        fileType: 'unknown',
      };
    }

    // Additional check: try to verify it's actually a DOCX by checking for Office-specific content
    // DOCX files should contain [Content_Types].xml
    const JSZip = require('jszip');
    const fileBuffer = fs.readFileSync(filePath);
    
    return JSZip.loadAsync(fileBuffer)
      .then(zip => {
        // Check for required DOCX files
        if (zip.files['[Content_Types].xml'] || zip.files['word/document.xml']) {
          return {
            valid: true,
            fileType: 'docx',
          };
        } else {
          return {
            valid: false,
            error: '文件是ZIP格式但不是有效的.docx文档（缺少必需的Word文档结构）。请确保文件是真正的Word文档。',
            fileType: 'zip',
          };
        }
      })
      .catch(err => {
        return {
          valid: false,
          error: `无法解析文件: ${err.message}。文件可能已损坏。`,
          fileType: 'corrupted',
        };
      });

  } catch (error) {
    return Promise.resolve({
      valid: false,
      error: `文件验证失败: ${error.message}`,
      fileType: 'error',
    });
  }
}

/**
 * Validate if file is a valid DOC (old Office format)
 * @param {string} filePath - Path to file
 * @returns {Object} Validation result
 */
function validateDoc(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    if (matchesSignature(buffer, FILE_SIGNATURES.DOC)) {
      return {
        valid: true,
        fileType: 'doc',
      };
    }

    return {
      valid: false,
      error: '文件不是有效的.doc格式',
      fileType: 'unknown',
    };
  } catch (error) {
    return {
      valid: false,
      error: `文件验证失败: ${error.message}`,
      fileType: 'error',
    };
  }
}

/**
 * Validate if file is a valid PDF
 * @param {string} filePath - Path to file
 * @returns {Object} Validation result
 */
function validatePdf(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    if (matchesSignature(buffer, FILE_SIGNATURES.PDF)) {
      return {
        valid: true,
        fileType: 'pdf',
      };
    }

    return {
      valid: false,
      error: '文件不是有效的PDF格式',
      fileType: 'unknown',
    };
  } catch (error) {
    return {
      valid: false,
      error: `文件验证失败: ${error.message}`,
      fileType: 'error',
    };
  }
}

module.exports = {
  validateDocx,
  validateDoc,
  validatePdf,
  matchesSignature,
  FILE_SIGNATURES,
};
