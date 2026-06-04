const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const videoExtractorService = require('../services/video-extractor.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * GET /api/video/extract/info
 * Get video info from URL
 */
exports.getVideoInfo = async (req, res) => {
  try {
    const { url, cookies } = req.body;
    if (!url) return error(res, ErrorCodes.BAD_REQUEST, '请输入视频URL');

    // More lenient URL validation - just check basic format
    if (!url.match(/^https?:\/\/.+\..+/)) {
      return error(res, ErrorCodes.BAD_REQUEST, '请输入有效的视频链接，需以 http:// 或 https:// 开头');
    }

    const info = await videoExtractorService.getVideoInfo(url, cookies);
    // Rewrite thumbnail URL through proxy to avoid hotlink 403
    if (info.thumbnail) {
      info.thumbnail = `/api/video/extract/thumbnail?url=${encodeURIComponent(info.thumbnail)}`
    }
    return success(res, info, '获取视频信息成功');
  } catch (err) {
    logger.error('Get video info error:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, err.message || '获取视频信息失败');
  }
};

/**
 * POST /api/video/extract/download
 * Start video/audio download
 */
exports.startDownload = async (req, res) => {
  try {
    const { url, format, audioOnly, audioFormat, cookies } = req.body;
    if (!url) return error(res, ErrorCodes.BAD_REQUEST, '请输入视频URL');

    if (!url.match(/^https?:\/\/.+\..+/)) {
      return error(res, ErrorCodes.BAD_REQUEST, '请输入有效的视频链接，需以 http:// 或 https:// 开头');
    }

    // Fire-and-forget: start download in background, return taskId immediately
    const taskId = await videoExtractorService.startDownload(url, {
      format,
      audioOnly,
      audioFormat,
      cookies,
    });

    return success(res, { taskId }, '下载已开始');
  } catch (err) {
    logger.error('Download error:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, err.message || '下载失败');
  }
};

/**
 * GET /api/video/extract/progress/:taskId
 * Get download progress
 */
exports.getProgress = (req, res) => {
  const { taskId } = req.params;
  const task = videoExtractorService.getTaskProgress(taskId);
  if (!task) return error(res, ErrorCodes.NOT_FOUND, '任务不存在或已过期');
  return success(res, task);
};

/**
 * GET /api/video/extract/file/:taskId
 * Download completed file
 */
exports.downloadFile = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = videoExtractorService.getTaskProgress(taskId);
    if (!task) return error(res, ErrorCodes.NOT_FOUND, '任务不存在或已过期');
    if (task.status !== 'completed') return error(res, ErrorCodes.BAD_REQUEST, '任务未完成');
    if (!task.outputFile) return error(res, ErrorCodes.NOT_FOUND, '文件不存在');

    if (!fs.existsSync(task.outputFile)) {
      return error(res, ErrorCodes.NOT_FOUND, '文件已被清理');
    }

    const filename = path.basename(task.outputFile);
    res.download(task.outputFile, filename, async (downloadErr) => {
      if (downloadErr) logger.error('File download error:', downloadErr);
      await videoExtractorService.cleanupTask(taskId);
    });
  } catch (err) {
    logger.error('Download file error:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, '文件下载失败');
  }
};

/**
 * GET /api/video/extract/thumbnail?url=...
 * Proxy thumbnail to avoid hotlink 403
 */
exports.proxyThumbnail = (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) return error(res, ErrorCodes.BAD_REQUEST, '缺少url参数');

    const client = imageUrl.startsWith('https') ? https : http;
    client.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/',
      },
    }, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        return error(res, ErrorCodes.NOT_FOUND, '缩略图加载失败');
      }
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      proxyRes.pipe(res);
    }).on('error', () => {
      error(res, ErrorCodes.NOT_FOUND, '缩略图加载失败');
    });
  } catch {
    error(res, ErrorCodes.INTERNAL_ERROR, '缩略图加载失败');
  }
};
