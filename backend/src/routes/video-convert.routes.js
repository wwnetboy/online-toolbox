const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoConvertController = require('../controllers/video-convert.controller');

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB 限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/webm', 'video/mp4', 'video/x-matroska'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.webm')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 WebM 格式的视频文件'));
    }
  }
});

// 转换 WebM 到 MP4
router.post('/webm-to-mp4', upload.single('video'), videoConvertController.convertWebmToMp4);

module.exports = router;
