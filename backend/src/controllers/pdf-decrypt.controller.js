/**
 * PDF Decrypt Controller
 * Handles HTTP requests for PDF decryption
 */
const fs = require('fs').promises;
const path = require('path');
const pdfDecryptService = require('../services/pdf-decrypt.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * POST /api/pdf/decrypt
 * Decrypt a password-protected PDF
 */
const decryptPdf = async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) return error(res, ErrorCodes.BAD_REQUEST, '请上传PDF文件');
    if (!req.body.password) return error(res, ErrorCodes.BAD_REQUEST, '请输入密码');

    inputPath = req.file.path;
    outputPath = inputPath + '_decrypted.pdf';

    await pdfDecryptService.decryptPdf(inputPath, req.body.password, outputPath);

    res.download(outputPath, path.basename(req.file.originalname, '.pdf') + '_decrypted.pdf', async () => {
      try { await fs.unlink(inputPath); } catch {}
      try { await fs.unlink(outputPath); } catch {}
    });
  } catch (err) {
    try { if (inputPath) await fs.unlink(inputPath); } catch {}
    try { if (outputPath) await fs.unlink(outputPath); } catch {}

    if (err.code === 'PASSWORD_ERROR') {
      return error(res, ErrorCodes.BAD_REQUEST, err.message);
    }
    logger.error('PDF decrypt error:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, err.message || '解密失败');
  }
};

module.exports = { decryptPdf };
