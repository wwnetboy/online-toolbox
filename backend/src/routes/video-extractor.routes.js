const express = require('express');
const router = express.Router();
const controller = require('../controllers/video-extractor.controller');

// POST /api/video/extract/info - Get video info from URL
router.post('/info', controller.getVideoInfo);

// POST /api/video/extract/download - Start video/audio download
router.post('/download', controller.startDownload);

// GET /api/video/extract/progress/:taskId - Get download progress
router.get('/progress/:taskId', controller.getProgress);

// GET /api/video/extract/file/:taskId - Download completed file
router.get('/file/:taskId', controller.downloadFile);

// GET /api/video/extract/thumbnail - Proxy thumbnail to avoid hotlink 403
router.get('/thumbnail', controller.proxyThumbnail);

module.exports = router;
