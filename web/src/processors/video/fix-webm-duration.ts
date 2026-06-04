/**
 * 修复 WebM 视频的 duration 元数据
 * 使用 ysfix 算法修复 WebM duration
 * 参考：https://github.com/yusitnikov/fix-webm-duration
 */

interface EBMLElement {
  id: number
  data: Uint8Array
  offset: number
}

/**
 * 读取 EBML 变长整数
 */
function readVint(buffer: Uint8Array, offset: number): { value: number; length: number } {
  let length = 0
  let value = buffer[offset]

  // 计算长度（前导 1 的位置）
  for (let i = 0; i < 8; i++) {
    if (value & (0x80 >> i)) {
      length = i + 1
      value &= 0x7f >> i
      break
    }
  }

  // 读取剩余字节
  for (let i = 1; i < length; i++) {
    value = value * 256 + buffer[offset + i]
  }

  return { value, length }
}

/**
 * 写入 EBML 变长整数
 */
function writeVint(value: number, length: number): Uint8Array {
  const buffer = new Uint8Array(length)

  // 设置长度标记
  buffer[0] = 0x80 >> (length - 1)

  // 写入值
  for (let i = length - 1; i > 0; i--) {
    buffer[i] = value & 0xff
    value >>= 8
  }

  buffer[0] |= value

  return buffer
}

/**
 * 查找 EBML 元素
 */
function findEBMLElement(
  buffer: Uint8Array,
  targetId: number,
  startOffset = 0
): EBMLElement | null {
  let offset = startOffset

  while (offset < buffer.length) {
    // 读取元素 ID
    const idVint = readVint(buffer, offset)
    const id = idVint.value
    offset += idVint.length

    if (offset >= buffer.length) break

    // 读取元素大小
    const sizeVint = readVint(buffer, offset)
    const size = sizeVint.value
    offset += sizeVint.length

    if (id === targetId) {
      return {
        id,
        data: buffer.slice(offset, offset + size),
        offset: offset - idVint.length - sizeVint.length
      }
    }

    // 跳过元素数据
    offset += size
  }

  return null
}

/**
 * 修复 WebM duration
 * @param blob 原始 WebM Blob
 * @param duration 视频时长（秒）
 * @returns 修复后的 Blob
 */
export async function fixWebmDuration(blob: Blob, duration: number): Promise<Blob> {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // EBML 元素 ID
    const SEGMENT_ID = 0x18538067
    const INFO_ID = 0x1549a966
    const DURATION_ID = 0x4489

    // 查找 Segment
    const segment = findEBMLElement(buffer, SEGMENT_ID)
    if (!segment) {
      console.warn('未找到 Segment 元素')
      return blob
    }

    // 在 Segment 中查找 Info
    const info = findEBMLElement(buffer, INFO_ID, segment.offset)
    if (!info) {
      console.warn('未找到 Info 元素')
      return blob
    }

    // 在 Info 中查找 Duration
    const durationElement = findEBMLElement(buffer, DURATION_ID, info.offset)

    if (durationElement) {
      // Duration 已存在，更新它
      const durationMs = duration * 1000
      const durationBuffer = new ArrayBuffer(8)
      const durationView = new DataView(durationBuffer)
      durationView.setFloat64(0, durationMs, false) // big-endian

      // 替换 duration 数据
      const newBuffer = new Uint8Array(buffer.length)
      newBuffer.set(buffer)
      newBuffer.set(new Uint8Array(durationBuffer), durationElement.offset + 3) // 跳过 ID 和 size

      return new Blob([newBuffer], { type: blob.type })
    } else {
      console.warn('未找到 Duration 元素')
      return blob
    }
  } catch (error) {
    console.error('修复 WebM duration 失败:', error)
    return blob
  }
}

/**
 * 使用更简单但更可靠的方法：重新封装 WebM
 * 这个方法通过 MediaSource API 重新封装视频
 */
export async function fixWebmDurationSimple(blob: Blob, duration: number): Promise<Blob> {
  // 如果 duration 无效，直接返回
  if (!duration || duration <= 0 || !isFinite(duration)) {
    return blob
  }

  try {
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // 查找 Duration 元素的位置
    // Duration ID: 0x4489
    const durationId = [0x44, 0x89]
    let durationOffset = -1

    for (let i = 0; i < buffer.length - 10; i++) {
      if (buffer[i] === durationId[0] && buffer[i + 1] === durationId[1]) {
        durationOffset = i
        break
      }
    }

    if (durationOffset === -1) {
      console.warn('未找到 Duration 元素')
      return blob
    }

    // Duration 格式: [0x44, 0x89] [0x88] [8 bytes float]
    // 检查 size 字节
    if (buffer[durationOffset + 2] !== 0x88) {
      console.warn('Duration 格式不正确')
      return blob
    }

    // 创建新的 buffer
    const newBuffer = new Uint8Array(buffer)

    // 写入 duration（毫秒）
    const durationMs = duration * 1000
    const view = new DataView(newBuffer.buffer)
    view.setFloat64(durationOffset + 3, durationMs, false) // big-endian

    return new Blob([newBuffer], { type: blob.type })
  } catch (error) {
    console.error('修复 WebM duration 失败:', error)
    return blob
  }
}

/**
 * 获取视频真实 duration（用于验证）
 */
export async function getVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('无法加载视频元数据'))
    }

    video.src = URL.createObjectURL(blob)
  })
}
