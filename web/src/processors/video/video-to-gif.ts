/**
 * 视频转GIF处理器
 * 使用 Canvas + modern-gif 实现
 */

import { encode } from 'modern-gif'
import {
  SUPPORTED_VIDEO_FORMATS,
  VideoToGifOptions,
  VideoToGifResult,
  VideoInfo,
  ValidationResult,
  VideoErrorCode,
  videoErrorMessages,
  VIDEO_CONFIG
} from './types'

/**
 * 验证视频文件格式
 */
export function validateVideoFormat(file: File): ValidationResult {
  const isValidFormat = SUPPORTED_VIDEO_FORMATS.some((format) => file.type === format)

  if (!isValidFormat) {
    return {
      valid: false,
      error: videoErrorMessages[VideoErrorCode.VIDEO_FORMAT_NOT_SUPPORTED]
    }
  }

  return { valid: true }
}

/**
 * 验证视频文件大小
 */
export function validateVideoSize(
  file: File,
  maxSize: number = VIDEO_CONFIG.videoToGif.maxFileSize
): ValidationResult {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: videoErrorMessages[VideoErrorCode.VIDEO_FILE_TOO_LARGE]
    }
  }

  return { valid: true }
}

/**
 * 验证视频文件（格式和大小）
 */
export function validateVideo(file: File): ValidationResult {
  const formatResult = validateVideoFormat(file)
  if (!formatResult.valid) {
    return formatResult
  }

  const sizeResult = validateVideoSize(file)
  if (!sizeResult.valid) {
    return sizeResult
  }

  return { valid: true }
}

/**
 * 验证GIF转换参数
 */
export function validateGifOptions(
  options: VideoToGifOptions,
  videoDuration: number
): ValidationResult {
  const { startTime, endTime, width, fps } = options
  const config = VIDEO_CONFIG.videoToGif

  if (startTime < 0) {
    return { valid: false, error: '起始时间不能为负数' }
  }

  if (endTime <= startTime) {
    return { valid: false, error: '结束时间必须大于起始时间' }
  }

  if (endTime > videoDuration) {
    return { valid: false, error: '结束时间不能超过视频时长' }
  }

  const duration = endTime - startTime
  if (duration > config.maxDuration) {
    return { valid: false, error: `GIF时长不能超过${config.maxDuration}秒` }
  }

  if (width <= 0 || !Number.isInteger(width)) {
    return { valid: false, error: '宽度必须为正整数' }
  }

  if (fps < config.minFps || fps > config.maxFps) {
    return { valid: false, error: `帧率必须在${config.minFps}-${config.maxFps}之间` }
  }

  return { valid: true }
}

/**
 * 计算保持宽高比的高度
 */
export function calculateHeightWithAspectRatio(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number
): number {
  const aspectRatio = originalHeight / originalWidth
  return Math.max(1, Math.round(targetWidth * aspectRatio))
}

/**
 * 获取视频信息
 */
export async function getVideoInfo(file: File): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        format: file.type
      })
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error(videoErrorMessages[VideoErrorCode.VIDEO_CORRUPTED]))
    }

    video.src = URL.createObjectURL(file)
  })
}

/**
 * 获取默认GIF转换配置
 */
export function getDefaultGifOptions(): VideoToGifOptions {
  return {
    startTime: 0,
    endTime: 5,
    width: VIDEO_CONFIG.videoToGif.defaultWidth,
    fps: VIDEO_CONFIG.videoToGif.defaultFps
  }
}

/**
 * 视频转GIF处理器类
 */
export class VideoToGifProcessor {
  validateVideo(file: File): ValidationResult {
    return validateVideo(file)
  }

  async getVideoInfo(file: File): Promise<VideoInfo> {
    return getVideoInfo(file)
  }

  async convert(
    file: File,
    options: VideoToGifOptions,
    onProgress?: (progress: number) => void
  ): Promise<VideoToGifResult> {
    // 验证文件
    const validationResult = this.validateVideo(file)
    if (!validationResult.valid) {
      throw new Error(validationResult.error)
    }

    // 获取视频信息
    const videoInfo = await this.getVideoInfo(file)

    // 验证参数
    const optionsValidation = validateGifOptions(options, videoInfo.duration)
    if (!optionsValidation.valid) {
      throw new Error(optionsValidation.error)
    }

    const outputHeight = calculateHeightWithAspectRatio(
      videoInfo.width,
      videoInfo.height,
      options.width
    )

    // 创建视频元素
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true

    const videoUrl = URL.createObjectURL(file)

    try {
      // 加载视频
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve()
        video.onerror = () => reject(new Error('视频加载失败'))
        video.src = videoUrl
      })

      // 创建 Canvas
      const canvas = document.createElement('canvas')
      canvas.width = options.width
      canvas.height = outputHeight
      const ctx = canvas.getContext('2d')!

      // 计算帧
      const duration = options.endTime - options.startTime
      const frameCount = Math.ceil(duration * options.fps)
      const frameInterval = 1 / options.fps
      const frameDelay = Math.round(1000 / options.fps)

      // 收集帧数据
      const frames: { data: ImageData; delay: number }[] = []

      // 提取帧
      for (let i = 0; i < frameCount; i++) {
        const time = options.startTime + i * frameInterval

        // 跳转到指定时间
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve()
          video.currentTime = time
        })

        // 绘制到 Canvas
        ctx.drawImage(video, 0, 0, options.width, outputHeight)

        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, options.width, outputHeight)
        frames.push({ data: imageData, delay: frameDelay })

        // 更新进度 (提取帧占 70%)
        if (onProgress) {
          onProgress(((i + 1) / frameCount) * 70)
        }
      }

      // 编码 GIF
      if (onProgress) {
        onProgress(75)
      }

      const output = await encode({
        width: options.width,
        height: outputHeight,
        frames: frames.map((f) => ({
          data: f.data.data,
          delay: f.delay
        }))
      })

      if (onProgress) {
        onProgress(100)
      }

      const blob = new Blob([output], { type: 'image/gif' })

      return {
        blob,
        width: options.width,
        height: outputHeight,
        duration,
        frameCount,
        size: blob.size
      }
    } finally {
      URL.revokeObjectURL(videoUrl)
    }
  }

  getDefaultOptions(): VideoToGifOptions {
    return getDefaultGifOptions()
  }
}

/**
 * 创建视频转GIF处理器实例
 */
export function createVideoToGifProcessor(): VideoToGifProcessor {
  return new VideoToGifProcessor()
}
