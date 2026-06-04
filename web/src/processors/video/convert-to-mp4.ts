/**
 * 将 WebM 视频转换为可 seek 的格式
 * 使用 Canvas + MediaRecorder 重新编码
 */

/**
 * 将 WebM 转换为 MP4（实际上是重新编码为可 seek 的 WebM）
 * @param blob 原始视频 Blob
 * @param onProgress 进度回调
 * @returns 转换后的 Blob
 */
export async function convertToSeekableVideo(
  blob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('无法创建 Canvas 上下文'))
      return
    }

    video.src = URL.createObjectURL(blob)
    video.muted = true

    const chunks: Blob[] = []
    let mediaRecorder: MediaRecorder | null = null
    let startTime = 0

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // 创建 Canvas 流
      const stream = canvas.captureStream(30) // 30 FPS

      // 尝试使用 H.264 编码（更好的兼容性）
      let mimeType = 'video/webm;codecs=h264'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp9'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm'
        }
      }

      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000 // 5 Mbps
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        URL.revokeObjectURL(video.src)
        const outputBlob = new Blob(chunks, { type: mimeType })
        resolve(outputBlob)
      }

      mediaRecorder.onerror = () => {
        URL.revokeObjectURL(video.src)
        reject(new Error('转换失败'))
      }

      // 开始录制
      mediaRecorder.start(100) // 每 100ms 一个 chunk，确保可 seek
      startTime = Date.now()
      video.play()
    }

    video.ontimeupdate = () => {
      // 绘制当前帧到 Canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 更新进度
      if (onProgress && video.duration > 0) {
        const progress = (video.currentTime / video.duration) * 100
        onProgress(progress)
      }
    }

    video.onended = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('视频加载失败'))
    }
  })
}
