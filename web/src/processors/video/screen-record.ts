/**
 * 屏幕录制处理器
 * 实现浏览器端屏幕录制功能
 */

import {
  RecordQuality,
  OutputFormat,
  RecordStatus,
  ScreenRecordOptions,
  ScreenRecordResult,
  VideoErrorCode,
  videoErrorMessages,
  VIDEO_CONFIG
} from './types'

/**
 * 录制状态机 - 定义有效的状态转换
 */
export const VALID_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
  idle: ['recording'],
  recording: ['paused', 'stopped'],
  paused: ['recording', 'stopped'],
  stopped: ['idle']
}

/**
 * 检查状态转换是否有效
 */
export function isValidTransition(from: RecordStatus, to: RecordStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * 获取视频约束配置
 */
function getVideoConstraints(quality: RecordQuality): MediaTrackConstraints {
  const constraints: Record<RecordQuality, MediaTrackConstraints> = {
    '720p': {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    },
    '1080p': {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 }
    },
    '2k': {
      width: { ideal: 2560 },
      height: { ideal: 1440 },
      frameRate: { ideal: 30 }
    },
    original: {
      // 不限制分辨率，使用屏幕原始分辨率
      frameRate: { ideal: 60 }
    }
  }
  return constraints[quality]
}

/**
 * 获取视频码率配置（单位：bps）
 */
function getVideoBitrate(quality: RecordQuality): number {
  const bitrates: Record<RecordQuality, number> = {
    '720p': 5_000_000, // 5 Mbps
    '1080p': 10_000_000, // 10 Mbps
    '2k': 20_000_000, // 20 Mbps
    original: 40_000_000 // 40 Mbps - 高码率保证质量
  }
  return bitrates[quality]
}

/**
 * 获取MIME类型
 */
function getMimeType(format: OutputFormat): string {
  const mimeTypes: Record<OutputFormat, string> = {
    webm: 'video/webm;codecs=vp9',
    mp4: 'video/mp4'
  }
  return mimeTypes[format]
}

/**
 * 屏幕录制处理器类
 */
export class ScreenRecordProcessor {
  private mediaRecorder: MediaRecorder | null = null
  private mediaStream: MediaStream | null = null
  private microphoneStream: MediaStream | null = null
  private recordedChunks: Blob[] = []
  private status: RecordStatus = 'idle'
  private startTime: number = 0
  private pausedTime: number = 0
  private totalPausedDuration: number = 0
  private options: ScreenRecordOptions = {
    quality: VIDEO_CONFIG.screenRecord.defaultQuality,
    includeAudio: VIDEO_CONFIG.screenRecord.defaultIncludeAudio,
    audioSource: VIDEO_CONFIG.screenRecord.defaultAudioSource,
    outputFormat: VIDEO_CONFIG.screenRecord.defaultOutputFormat
  }

  /**
   * 检查浏览器是否支持屏幕录制
   */
  isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    )
  }

  /**
   * 获取当前录制状态
   */
  getStatus(): RecordStatus {
    return this.status
  }

  /**
   * 获取录制时长（秒）
   */
  getDuration(): number {
    if (this.status === 'idle' || this.startTime === 0) {
      return 0
    }

    if (this.status === 'paused') {
      return (this.pausedTime - this.startTime - this.totalPausedDuration) / 1000
    }

    if (this.status === 'stopped') {
      return (this.pausedTime - this.startTime - this.totalPausedDuration) / 1000
    }

    return (Date.now() - this.startTime - this.totalPausedDuration) / 1000
  }

  /**
   * 开始录制
   */
  async start(options?: Partial<ScreenRecordOptions>): Promise<void> {
    if (!this.isSupported()) {
      throw new Error(videoErrorMessages[VideoErrorCode.SCREEN_CAPTURE_NOT_SUPPORTED])
    }

    if (!isValidTransition(this.status, 'recording')) {
      throw new Error(`无法从 ${this.status} 状态开始录制`)
    }

    // 合并配置
    this.options = { ...this.options, ...options }

    try {
      // 判断是否需要系统音频
      const needSystemAudio = this.options.audioSource?.systemAudio || this.options.includeAudio

      // 获取屏幕捕获流
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: getVideoConstraints(this.options.quality),
        audio: needSystemAudio
      }

      this.mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions)

      // 如果需要麦克风音频，获取麦克风流并合并
      if (this.options.audioSource?.microphone) {
        try {
          this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true })

          // 使用 AudioContext 合并音频轨道
          const audioContext = new AudioContext()
          const destination = audioContext.createMediaStreamDestination()

          // 添加系统音频（如果有）
          const systemAudioTracks = this.mediaStream.getAudioTracks()
          if (systemAudioTracks.length > 0) {
            const systemSource = audioContext.createMediaStreamSource(
              new MediaStream([systemAudioTracks[0]])
            )
            systemSource.connect(destination)
          }

          // 添加麦克风音频
          const micSource = audioContext.createMediaStreamSource(this.microphoneStream)
          micSource.connect(destination)

          // 创建合并后的流
          const videoTrack = this.mediaStream.getVideoTracks()[0]
          const combinedAudioTrack = destination.stream.getAudioTracks()[0]

          this.mediaStream = new MediaStream([videoTrack, combinedAudioTrack])
        } catch (micError) {
          console.warn('无法获取麦克风权限，将继续录制但不包含麦克风音频')
        }
      }

      // 创建MediaRecorder
      const videoBitrate = getVideoBitrate(this.options.quality)

      // 尝试使用最兼容的编码器
      // 优先级：H.264 (MP4兼容) > VP9 > VP8
      const codecOptions = [
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=avc1',
        'video/x-matroska;codecs=avc1',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ]

      let selectedMimeType = 'video/webm'
      for (const codec of codecOptions) {
        if (MediaRecorder.isTypeSupported(codec)) {
          selectedMimeType = codec
          console.log('使用编码器:', codec)
          break
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        mimeType: selectedMimeType,
        videoBitsPerSecond: videoBitrate
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions)
      this.recordedChunks = []

      // 监听数据可用事件
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      // 监听流结束事件（用户点击浏览器的停止共享按钮）
      this.mediaStream.getVideoTracks()[0].onended = () => {
        if (this.status === 'recording' || this.status === 'paused') {
          this.stop()
        }
      }

      // 开始录制
      // 使用 100ms timeslice 生成足够的关键帧以支持 seek
      // 太小的 timeslice 会导致性能问题和文件过大
      this.mediaRecorder.start(100)
      this.status = 'recording'
      this.startTime = Date.now()
      this.pausedTime = 0
      this.totalPausedDuration = 0
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw new Error(videoErrorMessages[VideoErrorCode.SCREEN_CAPTURE_DENIED])
      }
      throw new Error(videoErrorMessages[VideoErrorCode.RECORDING_FAILED])
    }
  }

  /**
   * 暂停录制
   */
  pause(): void {
    if (!isValidTransition(this.status, 'paused')) {
      throw new Error(`无法从 ${this.status} 状态暂停录制`)
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause()
      this.status = 'paused'
      this.pausedTime = Date.now()
    }
  }

  /**
   * 恢复录制
   */
  resume(): void {
    if (!isValidTransition(this.status, 'recording')) {
      throw new Error(`无法从 ${this.status} 状态恢复录制`)
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume()
      this.totalPausedDuration += Date.now() - this.pausedTime
      this.status = 'recording'
    }
  }

  /**
   * 停止录制
   */
  async stop(): Promise<ScreenRecordResult> {
    if (!isValidTransition(this.status, 'stopped')) {
      throw new Error(`无法从 ${this.status} 状态停止录制`)
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error(videoErrorMessages[VideoErrorCode.RECORDING_FAILED]))
        return
      }

      // 记录停止时间
      if (this.status === 'paused') {
        this.totalPausedDuration += Date.now() - this.pausedTime
      }
      this.pausedTime = Date.now()

      this.mediaRecorder.onstop = async () => {
        // 停止所有轨道
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop())
        }

        // 创建Blob - 使用实际的 mimeType
        const actualMimeType = this.mediaRecorder?.mimeType || 'video/webm'
        const blob = new Blob(this.recordedChunks, {
          type: actualMimeType
        })

        const duration = this.getDuration()

        this.status = 'stopped'

        resolve({
          blob,
          duration,
          format: actualMimeType.includes('mp4') ? 'mp4' : 'webm',
          size: blob.size
        })
      }

      this.mediaRecorder.onerror = () => {
        reject(new Error(videoErrorMessages[VideoErrorCode.RECORDING_FAILED]))
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * 获取当前媒体流（用于实时预览）
   */
  getMediaStream(): MediaStream | null {
    return this.mediaStream
  }

  /**
   * 重置处理器状态
   */
  reset(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop())
    }

    this.mediaRecorder = null
    this.mediaStream = null
    this.microphoneStream = null
    this.recordedChunks = []
    this.status = 'idle'
    this.startTime = 0
    this.pausedTime = 0
    this.totalPausedDuration = 0
  }

  /**
   * 获取默认配置
   */
  getDefaultOptions(): ScreenRecordOptions {
    return {
      quality: VIDEO_CONFIG.screenRecord.defaultQuality,
      includeAudio: VIDEO_CONFIG.screenRecord.defaultIncludeAudio,
      audioSource: VIDEO_CONFIG.screenRecord.defaultAudioSource,
      outputFormat: VIDEO_CONFIG.screenRecord.defaultOutputFormat
    }
  }

  /**
   * 获取录制的原始Blob数据（用于多格式导出）
   */
  getRecordedBlob(): Blob | null {
    if (this.recordedChunks.length === 0) return null
    const mimeType = getMimeType(this.options.outputFormat)
    return new Blob(this.recordedChunks, {
      type: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm'
    })
  }
}

/**
 * 创建屏幕录制处理器实例
 */
export function createScreenRecordProcessor(): ScreenRecordProcessor {
  return new ScreenRecordProcessor()
}
