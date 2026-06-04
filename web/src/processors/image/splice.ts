/**
 * 长截图拼接处理器
 * 实现多图拼接、边距背景设置
 * 需求: 12.1, 12.2, 12.3, 12.4
 */

export interface ImageSpliceOptions {
  direction: 'vertical' | 'horizontal' // 拼接方向
  spacing: number // 图片间距（像素）
  backgroundColor: string // 背景色
  compress?: boolean // 是否压缩优化
  quality?: number // 压缩质量 (10-100)
  outputFormat?: 'png' | 'jpg' | 'webp' // 输出格式
}

export interface ImageSpliceResult {
  file: Blob
  fileName: string
  width: number
  height: number
  imageCount: number
}

/**
 * 拼接多张图片
 * @param files 图片文件列表（按顺序）
 * @param options 拼接选项
 * @returns 拼接结果
 */
export async function spliceImages(
  files: File[],
  options: ImageSpliceOptions
): Promise<ImageSpliceResult> {
  if (files.length === 0) {
    throw new Error('至少需要一张图片')
  }

  // 加载所有图片
  const images = await loadImages(files)

  // 计算画布尺寸
  const canvasDimensions = calculateCanvasDimensions(images, options)

  // 创建 canvas
  const canvas = document.createElement('canvas')
  canvas.width = canvasDimensions.width
  canvas.height = canvasDimensions.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建 Canvas 上下文')
  }

  // 填充背景色
  ctx.fillStyle = options.backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 绘制所有图片
  let currentPosition = 0

  for (const img of images) {
    if (options.direction === 'vertical') {
      // 垂直拼接：居中对齐
      const x = (canvas.width - img.width) / 2
      ctx.drawImage(img, x, currentPosition, img.width, img.height)
      currentPosition += img.height + options.spacing
    } else {
      // 水平拼接：居中对齐
      const y = (canvas.height - img.height) / 2
      ctx.drawImage(img, currentPosition, y, img.width, img.height)
      currentPosition += img.width + options.spacing
    }
  }

  // 转换为 Blob
  return new Promise((resolve, reject) => {
    const quality = options.compress && options.quality ? options.quality / 100 : 1.0

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('图片拼接失败'))
          return
        }

        resolve({
          file: blob,
          fileName: `拼接图片_${Date.now()}.png`,
          width: canvas.width,
          height: canvas.height,
          imageCount: files.length
        })
      },
      options.compress ? 'image/jpeg' : 'image/png',
      quality
    )
  })
}

/**
 * 加载所有图片
 */
async function loadImages(files: File[]): Promise<HTMLImageElement[]> {
  const promises = files.map((file) => loadImage(file))
  return Promise.all(promises)
}

/**
 * 加载单张图片
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        resolve(img)
      }

      img.onerror = () => {
        reject(new Error(`图片 ${file.name} 加载失败`))
      }
    }

    reader.onerror = () => {
      reject(new Error(`文件 ${file.name} 读取失败`))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 计算画布尺寸
 * 需求 12.2: 自动拼接保持画面连贯
 */
function calculateCanvasDimensions(
  images: HTMLImageElement[],
  options: ImageSpliceOptions
): { width: number; height: number } {
  if (options.direction === 'vertical') {
    // 垂直拼接：宽度取最大值，高度累加
    const maxWidth = Math.max(...images.map((img) => img.width))
    const totalHeight = images.reduce((sum, img) => sum + img.height, 0)
    const totalSpacing = (images.length - 1) * options.spacing

    return {
      width: maxWidth,
      height: totalHeight + totalSpacing
    }
  } else {
    // 水平拼接：高度取最大值，宽度累加
    const maxHeight = Math.max(...images.map((img) => img.height))
    const totalWidth = images.reduce((sum, img) => sum + img.width, 0)
    const totalSpacing = (images.length - 1) * options.spacing

    return {
      width: totalWidth + totalSpacing,
      height: maxHeight
    }
  }
}

/**
 * 验证拼接选项
 */
export function validateSpliceOptions(options: ImageSpliceOptions): {
  valid: boolean
  error?: string
} {
  if (options.spacing < 0) {
    return {
      valid: false,
      error: '图片间距不能为负数'
    }
  }

  if (options.compress && options.quality) {
    if (options.quality < 10 || options.quality > 100) {
      return {
        valid: false,
        error: '压缩质量必须在 10-100 之间'
      }
    }
  }

  // 验证背景色格式
  if (!isValidColor(options.backgroundColor)) {
    return {
      valid: false,
      error: '无效的背景色格式'
    }
  }

  return { valid: true }
}

/**
 * 验证颜色格式
 */
function isValidColor(color: string): boolean {
  // 支持 hex、rgb、rgba、颜色名称
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
  const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/
  const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/

  return (
    hexPattern.test(color) ||
    rgbPattern.test(color) ||
    rgbaPattern.test(color) ||
    CSS.supports('color', color)
  )
}

/**
 * 获取默认拼接选项
 */
export function getDefaultSpliceOptions(): ImageSpliceOptions {
  return {
    direction: 'vertical',
    spacing: 0,
    backgroundColor: '#ffffff',
    compress: false,
    quality: 80
  }
}

/**
 * 处理结果接口
 */
export interface ProcessResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 图片拼接处理器类
 */
export class ImageSpliceProcessor {
  async process(
    files: File[],
    options: ImageSpliceOptions,
    onProgress?: (progress: number) => void
  ): Promise<ProcessResult<{ file: Blob; preview: string }>> {
    try {
      if (onProgress) {
        onProgress(10)
      }

      const result = await spliceImages(files, options)

      if (onProgress) {
        onProgress(90)
      }

      // 生成预览
      const preview = URL.createObjectURL(result.file)

      if (onProgress) {
        onProgress(100)
      }

      return {
        success: true,
        data: { file: result.file, preview }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '拼接失败'
      }
    }
  }
}

/**
 * 创建图片拼接处理器
 */
export function createImageSpliceProcessor(): ImageSpliceProcessor {
  return new ImageSpliceProcessor()
}
