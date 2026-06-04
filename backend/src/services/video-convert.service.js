/**
 * Video Convert Service
 * Handles video conversion operations (WebM to MP4, etc.)
 */
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');
const config = require('../config');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

/**
 * Convert WebM video to MP4 format using FFmpeg
 * @param {string} inputPath - Path to input WebM file
 * @param {string} outputDir - Directory for output file
 * @returns {Promise<{outputPath: string, outputFileName: string}>}
 */
async function convertWebmToMp4(inputPath, outputDir) {
  const outputFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
  const outputPath = path.join(outputDir, outputFileName);

  const cmd = [
    config.tool.ffmpeg,
    '-i', `"${inputPath}"`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    `"${outputPath}"`,
  ].join(' ');

  logger.info(`Executing FFmpeg: ${cmd}`);

  await execAsync(cmd, { timeout: 300000 });

  const stats = await fs.stat(outputPath);
  if (!stats.isFile()) {
    throw new Error('转换失败：输出文件不存在');
  }

  return { outputPath, outputFileName };
}

module.exports = { convertWebmToMp4 };
