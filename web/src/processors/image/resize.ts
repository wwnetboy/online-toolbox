/**
 * 图片尺寸调整处理器
 * 实现宽高调整、保持比例
 * 需求: 32.1, 32.2, 32.3, 32.4, 32.5, 32.6
 */

export interface ImageResizeOptions {
  width?: number
  height?: number
  targetWidth?: number // 别名，兼容页面使用
  targetHeight?: number // 别名，兼容页面使用
  mode?: 'keep-ratio' | 'stretch' // 保持比例或拉伸填充
  maintainAspectRatio?: boolean // 是否保持比例
  fitMode?: 'contain' | 'cover' // 适配模式
}

export interface ImageResizeResult {
  file: Blob
  fileName: string
  width: number
  height: number
  originalWidth: number
  originalHeight: number
}

/**
 * 调整图片尺寸
 * @param file 原始图片文件
 * @param options 调整选项
 * @returns 调整结果
 */
export async function resizeImage(
  file: File,
  options: ImageResizeOptions
): Promise<ImageResizeResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        try {
          const originalWidth = img.width
          const originalHeight = img.height

          // 支持 targetWidth/targetHeight 别名
          const targetWidth = options.targetWidth || options.width
          const targetHeight = options.targetHeight || options.height

          // 确定模式
          const mode =
            options.mode || (options.maintainAspectRatio !== false ? 'keep-ratio' : 'stretch')

          // 计算目标尺寸
          const targetDimensions = calculateTargetDimensions(
            originalWidth,
            originalHeight,
            targetWidth,
            targetHeight,
            mode
          )

          // 创建 canvas
          const canvas = document.createElement('canvas')
          canvas.width = targetDimensions.width
          canvas.height = targetDimensions.height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }

          // 绘制调整后的图片
          ctx.drawImage(img, 0, 0, targetDimensions.width, targetDimensions.height)

          // 转换为 Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片尺寸调整失败'))
                return
              }

              resolve({
                file: blob,
                fileName: file.name,
                width: targetDimensions.width,
                height: targetDimensions.height,
                originalWidth,
                originalHeight
              })
            },
            file.type || 'image/png',
            1.0
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
 * 批量调整图片尺寸
 * @param files 图片文件列表
 * @param options 调整选项
 * @returns 调整结果列表
 */
export async function resizeImageBatch(
  files: File[],
  options: ImageResizeOptions
): Promise<ImageResizeResult[]> {
  const results: ImageResizeResult[] = []

  for (const file of files) {
    try {
      const result = await resizeImage(file, options)
      results.push(result)
    } catch (error) {
      console.error(`调整文件 ${file.name} 尺寸失败:`, error)
      throw error
    }
  }

  return results
}

/**
 * 计算目标尺寸
 * 需求 32.2, 32.3, 32.4: 按比例自动计算或拉伸填充
 */
function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number,
  mode?: 'keep-ratio' | 'stretch'
): { width: number; height: number } {
  // 如果没有指定任何尺寸，返回原始尺寸
  if (!targetWidth && !targetHeight) {
    return { width: originalWidth, height: originalHeight }
  }

  // 拉伸填充模式：直接使用指定尺寸
  if (mode === 'stretch') {
    return {
      width: targetWidth || originalWidth,
      height: targetHeight || originalHeight
    }
  }

  // 保持比例模式
  const aspectRatio = originalWidth / originalHeight

  // 只指定宽度，按比例计算高度
  if (targetWidth && !targetHeight) {
    return {
      width: targetWidth,
      height: Math.round(targetWidth / aspectRatio)
    }
  }

  // 只指定高度，按比例计算宽度
  if (!targetWidth && targetHeight) {
    return {
      width: Math.round(targetHeight * aspectRatio),
      height: targetHeight
    }
  }

  // 同时指定宽高，保持比例适配
  if (targetWidth && targetHeight) {
    const targetRatio = targetWidth / targetHeight

    if (aspectRatio > targetRatio) {
      // 原图更宽，以宽度为准
      return {
        width: targetWidth,
        height: Math.round(targetWidth / aspectRatio)
      }
    } else {
      // 原图更高，以高度为准
      return {
        width: Math.round(targetHeight * aspectRatio),
        height: targetHeight
      }
    }
  }

  return { width: originalWidth, height: originalHeight }
}

/**
 * 验证调整选项
 */
export function validateResizeOptions(options: ImageResizeOptions): {
  valid: boolean
  error?: string
} {
  if (!options.width && !options.height) {
    return {
      valid: false,
      error: '必须指定宽度或高度'
    }
  }

  if (options.width && options.width <= 0) {
    return {
      valid: false,
      error: '宽度必须大于 0'
    }
  }

  if (options.height && options.height <= 0) {
    return {
      valid: false,
      error: '高度必须大于 0'
    }
  }

  return { valid: true }
}

/**
 * 获取图片尺寸信息
 * 需求 32.1: 显示原始图片尺寸信息
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
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
 * 处理结果接口
 */
export interface ProcessResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 图片尺寸调整处理器类
 */
export class ImageResizeProcessor {
  async process(
    files: File[],
    options: ImageResizeOptions,
    onProgress?: (progress: number, fileName: string) => void
  ): Promise<ProcessResult<{ files: Array<{ name: string; blob: Blob }> }>> {
    try {
      const results: Array<{ name: string; blob: Blob }> = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const progress = Math.round(((i + 1) / files.length) * 100)

        if (onProgress) {
          onProgress(progress, file.name)
        }

        const result = await resizeImage(file, options)
        results.push({
          name: result.fileName,
          blob: result.file
        })
      }

      return {
        success: true,
        data: { files: results }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '调整失败'
      }
    }
  }
}

/**
 * 创建图片尺寸调整处理器
 */
export function createImageResizeProcessor(): ImageResizeProcessor {
  return new ImageResizeProcessor()
}
