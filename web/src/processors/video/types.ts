/**
 * 视频处理器共享类型定义
 */

// ==================== 通用类型 ====================

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * 处理结果
 */
export interface ProcessResult<T> {
  success: boolean
  data?: T
  error?: string
  progress?: number
}

// ==================== 屏幕录制类型 ====================

/**
 * 录制质量选项
 */
export type RecordQuality = '720p' | '1080p' | '2k' | 'original'

/**
 * 输出格式选项
 */
export type OutputFormat = 'webm' | 'mp4'

/**
 * 录制状态
 */
export type RecordStatus = 'idle' | 'recording' | 'paused' | 'stopped'

/**
 * 音频源类型
 */
export interface AudioSourceOptions {
  systemAudio: boolean // 系统声音
  microphone: boolean // 麦克风声音
}

/**
 * 屏幕录制配置选项
 */
export interface ScreenRecordOptions {
  quality: RecordQuality // 视频质量
  includeAudio: boolean // 是否录制系统音频（兼容旧版）
  audioSource: AudioSourceOptions // 音频源选项
  outputFormat: OutputFormat // 输出格式
}

/**
 * 屏幕录制结果
 */
export interface ScreenRecordResult {
  blob: Blob // 录制的视频数据
  duration: number // 录制时长（秒）
  format: OutputFormat // 输出格式
  size: number // 文件大小（字节）
}

// ==================== 视频转GIF类型 ====================

/**
 * 支持的视频格式
 */
export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo'
] as const

/**
 * 支持的视频格式类型
 */
export type SupportedVideoFormat = (typeof SUPPORTED_VIDEO_FORMATS)[number]

/**
 * 视频转GIF配置选项
 */
export interface VideoToGifOptions {
  startTime: number // 起始时间（秒）
  endTime: number // 结束时间（秒）
  width: number // GIF宽度（像素）
  fps: number // 帧率（5-30）
}

/**
 * 视频转GIF结果
 */
export interface VideoToGifResult {
  blob: Blob // GIF数据
  width: number // 实际宽度
  height: number // 实际高度
  duration: number // 时长（秒）
  frameCount: number // 帧数
  size: number // 文件大小（字节）
}

/**
 * 视频信息
 */
export interface VideoInfo {
  duration: number // 视频时长（秒）
  width: number // 视频宽度
  height: number // 视频高度
  format: string // 视频格式
}

// ==================== 错误类型 ====================

/**
 * 视频错误代码
 */
export enum VideoErrorCode {
  // 录屏错误
  SCREEN_CAPTURE_NOT_SUPPORTED = 'SCREEN_CAPTURE_NOT_SUPPORTED',
  SCREEN_CAPTURE_DENIED = 'SCREEN_CAPTURE_DENIED',
  RECORDING_FAILED = 'RECORDING_FAILED',

  // 视频转GIF错误
  VIDEO_FILE_TOO_LARGE = 'VIDEO_FILE_TOO_LARGE',
  VIDEO_FORMAT_NOT_SUPPORTED = 'VIDEO_FORMAT_NOT_SUPPORTED',
  VIDEO_CORRUPTED = 'VIDEO_CORRUPTED',
  CONVERSION_FAILED = 'CONVERSION_FAILED',
  CONVERSION_TIMEOUT = 'CONVERSION_TIMEOUT',

  // 通用错误
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS'
}

/**
 * 视频错误消息映射
 */
export const videoErrorMessages: Record<VideoErrorCode, string> = {
  [VideoErrorCode.SCREEN_CAPTURE_NOT_SUPPORTED]: '当前浏览器不支持录屏功能',
  [VideoErrorCode.SCREEN_CAPTURE_DENIED]: '用户拒绝了屏幕录制权限',
  [VideoErrorCode.RECORDING_FAILED]: '录制失败，请重试',
  [VideoErrorCode.VIDEO_FILE_TOO_LARGE]: '视频文件大小超出限制（最大200MB）',
  [VideoErrorCode.VIDEO_FORMAT_NOT_SUPPORTED]: '不支持该视频格式',
  [VideoErrorCode.VIDEO_CORRUPTED]: '视频文件已损坏，无法处理',
  [VideoErrorCode.CONVERSION_FAILED]: '转换失败，请重试',
  [VideoErrorCode.CONVERSION_TIMEOUT]: '转换超时，请尝试缩短视频时长',
  [VideoErrorCode.BROWSER_NOT_SUPPORTED]: '当前浏览器不支持此功能',
  [VideoErrorCode.INVALID_PARAMETERS]: '参数无效'
}

// ==================== 配置常量 ====================

/**
 * 视频工具配置
 */
export const VIDEO_CONFIG = {
  // 在线录屏配置
  screenRecord: {
    defaultQuality: '1080p' as RecordQuality,
    defaultIncludeAudio: true,
    defaultAudioSource: {
      systemAudio: true,
      microphone: false
    },
    defaultOutputFormat: 'webm' as OutputFormat,
    maxDuration: 3600 // 最大录制时长（秒）
  },

  // 视频转GIF配置
  videoToGif: {
    maxFileSize: 200 * 1024 * 1024, // 最大文件大小（200MB）
    supportedFormats: SUPPORTED_VIDEO_FORMATS,
    defaultWidth: 480,
    defaultFps: 15,
    minFps: 5,
    maxFps: 30,
    maxDuration: 30 // 最大GIF时长（秒）
  }
}
