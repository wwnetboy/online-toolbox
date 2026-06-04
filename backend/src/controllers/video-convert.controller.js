/**
 * Video Convert Controller
 * Handles HTTP requests for video format conversion
 */
const fs = require('fs').promises;
const path = require('path');
const videoConvertService = require('../services/video-convert.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * POST /api/video/convert
 * Convert WebM video to MP4 format
 */
const convertWebmToMp4 = async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      return error(res, ErrorCodes.BAD_REQUEST, '请上传视频文件');
    }

    inputPath = req.file.path;
    const outputDir = path.dirname(inputPath);

    const result = await videoConvertService.convertWebmToMp4(inputPath, outputDir);
    outputPath = result.outputPath;

    res.download(outputPath, result.outputFileName, async (downloadErr) => {
      try {
        if (inputPath) await fs.unlink(inputPath);
        if (outputPath) await fs.unlink(outputPath);
      } catch (cleanupErr) {
        logger.error('清理临时文件失败:', cleanupErr);
      }

      if (downloadErr) {
        logger.error('发送文件失败:', downloadErr);
      }
    });
  } catch (err) {
    logger.error('视频转换失败:', err);

    try {
      if (inputPath) await fs.unlink(inputPath);
      if (outputPath) await fs.unlink(outputPath);
    } catch (cleanupErr) {
      logger.error('清理临时文件失败:', cleanupErr);
    }

    return error(res, ErrorCodes.INTERNAL_ERROR, err.message || '视频转换失败');
  }
};

module.exports = { convertWebmToMp4 };
