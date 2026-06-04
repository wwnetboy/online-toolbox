/**
 * 图片压缩处理器
 * 实现按质量压缩、按尺寸压缩、等比例缩放
 * 需求: 10.1, 10.2, 10.3, 10.4, 10.5
 */

export interface ImageCompressOptions {
  mode: 'quality' | 'size'
  quality?: number // 按质量压缩 (10-100)
  maxWidth?: number // 按尺寸压缩
  maxHeight?: number
  maintainAspectRatio: boolean // 等比例缩放
}

export interface ImageCompressResult {
  file: Blob
  fileName: string
  originalSize: number
  compressedSize: number
  compressionRatio: number // 压缩率百分比
  width: number
  height: number
  originalWidth: number
  originalHeight: number
}

/**
 * 压缩图片
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩结果
 */
export async function compressImage(
  file: File,
  options: ImageCompressOptions
): Promise<ImageCompressResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        try {
          const originalWidth = img.width
          const originalHeight = img.height

          // 计算目标尺寸
          let targetWidth = originalWidth
          let targetHeight = originalHeight

          if (options.mode === 'size' && (options.maxWidth || options.maxHeight)) {
            const dimensions = calculateTargetDimensions(
              originalWidth,
              originalHeight,
              options.maxWidth,
              options.maxHeight,
              options.maintainAspectRatio
            )
            targetWidth = dimensions.width
            targetHeight = dimensions.height
          }

          // 创建 canvas
          const canvas = document.createElement('canvas')
          canvas.width = targetWidth
          canvas.height = targetHeight

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }

          // 绘制压缩后的图片
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

          // 确定压缩质量
          const quality =
            options.mode === 'quality' && options.quality ? options.quality / 100 : 0.8

          // 转换为 Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片压缩失败'))
                return
              }

              // 计算压缩率
              const compressionRatio = ((file.size - blob.size) / file.size) * 100

              resolve({
                file: blob,
                fileName: file.name,
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: Math.max(0, compressionRatio),
                width: targetWidth,
                height: targetHeight,
                originalWidth,
                originalHeight
              })
            },
            file.type || 'image/jpeg',
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 批量压缩图片
 * @param files 图片文件列表
 * @param options 压缩选项
 * @returns 压缩结果列表
 */
export async function compressImageBatch(
  files: File[],
  options: ImageCompressOptions
): Promise<ImageCompressResult[]> {
  const results: ImageCompressResult[] = []

  for (const file of files) {
    try {
      const result = await compressImage(file, options)
      results.push(result)
    } catch (error) {
      console.error(`压缩文件 ${file.name} 失败:`, error)
      throw error
    }
  }

  return results
}

/**
 * 计算目标尺寸
 * 需求 10.3: 等比例缩放
 */
function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth?: number,
  maxHeight?: number,
  maintainAspectRatio: boolean = true
): { width: number; height: number } {
  if (!maintainAspectRatio) {
    // 不保持比例，直接使用指定尺寸
    return {
      width: maxWidth || originalWidth,
      height: maxHeight || originalHeight
    }
  }

  // 保持比例缩放
  let targetWidth = originalWidth
  let targetHeight = originalHeight

  if (maxWidth && originalWidth > maxWidth) {
    targetWidth = maxWidth
    targetHeight = (originalHeight * maxWidth) / originalWidth
  }

  if (maxHeight && targetHeight > maxHeight) {
    targetHeight = maxHeight
    targetWidth = (originalWidth * maxHeight) / originalHeight
  }

  return {
    width: Math.round(targetWidth),
    height: Math.round(targetHeight)
  }
}

/**
 * 验证压缩选项
 */
export function validateCompressOptions(options: ImageCompressOptions): {
  valid: boolean
  error?: string
} {
  if (options.mode === 'quality') {
    if (!options.quality || options.quality < 10 || options.quality > 100) {
      return {
        valid: false,
        error: '质量参数必须在 10-100 之间'
      }
    }
  }

  if (options.mode === 'size') {
    if (!options.maxWidth && !options.maxHeight) {
      return {
        valid: false,
        error: '按尺寸压缩时必须指定最大宽度或高度'
      }
    }

    if (options.maxWidth && options.maxWidth <= 0) {
      return {
        valid: false,
        error: '最大宽度必须大于 0'
      }
    }

    if (options.maxHeight && options.maxHeight <= 0) {
      return {
        valid: false,
        error: '最大高度必须大于 0'
      }
    }
  }

  return { valid: true }
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
 * 图片压缩处理器类
 */
export class ImageCompressProcessor {
  validate(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (files.length === 0) {
      errors.push('请选择文件')
      return { valid: false, errors }
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} 不是图片文件`)
      }
      if (file.size > 20 * 1024 * 1024) {
        errors.push(`${file.name} 文件大小超过 20MB`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  async process(
    files: File[],
    options: ImageCompressOptions,
    onProgress?: (progress: number, fileName?: string) => void
  ): Promise<
    ProcessResult<{
      files: Array<{ name: string; blob: Blob }>
      totalOriginalSize: number
      totalCompressedSize: number
    }>
  > {
    try {
      const results: Array<{ name: string; blob: Blob }> = []
      let totalOriginalSize = 0
      let totalCompressedSize = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const progress = Math.round(((i + 1) / files.length) * 100)

        if (onProgress) {
          onProgress(progress, file.name)
        }

        const result = await compressImage(file, options)
        results.push({
          name: result.fileName,
          blob: result.file
        })
        totalOriginalSize += result.originalSize
        totalCompressedSize += result.compressedSize
      }

      return {
        success: true,
        data: { files: results, totalOriginalSize, totalCompressedSize }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '压缩失败'
      }
    }
  }
}

/**
 * 创建图片压缩处理器
 */
export function createImageCompressProcessor(): ImageCompressProcessor {
  return new ImageCompressProcessor()
}
