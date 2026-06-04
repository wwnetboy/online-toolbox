/**
 * 视频处理器模块导出
 *
 * 包含以下处理器：
 * - 屏幕录制处理器 (ScreenRecordProcessor)
 * - 视频转GIF处理器 (VideoToGifProcessor)
 */

// 导出类型定义
export * from './types'

// 导出屏幕录制处理器
export {
  ScreenRecordProcessor,
  createScreenRecordProcessor,
  isValidTransition,
  VALID_TRANSITIONS
} from './screen-record'

// 导出视频转GIF处理器
export {
  VideoToGifProcessor,
  createVideoToGifProcessor,
  validateVideo,
  validateVideoFormat,
  validateVideoSize,
  validateGifOptions,
  calculateHeightWithAspectRatio,
  getVideoInfo,
  getDefaultGifOptions
} from './video-to-gif'
