/**
 * 图片旋转/翻转处理器
 * 实现90度、180度旋转和水平/垂直翻转
 * 需求: 11.4, 11.5
 */

export type RotateAngle = 90 | 180 | 270 | -90 | -180 | -270
export type FlipDirection = 'horizontal' | 'vertical'

export interface ImageRotateOptions {
  angle: RotateAngle
}

export interface ImageFlipOptions {
  direction: FlipDirection
}

export interface ImageTransformResult {
  file: Blob
  fileName: string
  width: number
  height: number
  originalWidth: number
  originalHeight: number
}

/**
 * 旋转图片
 * @param file 原始图片文件
 * @param options 旋转选项
 * @returns 旋转结果
 */
export async function rotateImage(
  file: File,
  options: ImageRotateOptions
): Promise<ImageTransformResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        try {
          const originalWidth = img.width
          const originalHeight = img.height

          // 计算旋转后的尺寸
          const needSwapDimensions =
            Math.abs(options.angle) === 90 || Math.abs(options.angle) === 270
          const canvasWidth = needSwapDimensions ? originalHeight : originalWidth
          const canvasHeight = needSwapDimensions ? originalWidth : originalHeight

          // 创建 canvas
          const canvas = document.createElement('canvas')
          canvas.width = canvasWidth
          canvas.height = canvasHeight

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }

          // 移动到中心点
          ctx.translate(canvasWidth / 2, canvasHeight / 2)

          // 旋转
          ctx.rotate((options.angle * Math.PI) / 180)

          // 绘制图片（从中心点绘制）
          ctx.drawImage(img, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight)

          // 转换为 Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片旋转失败'))
                return
              }

              resolve({
                file: blob,
                fileName: file.name,
                width: canvasWidth,
                height: canvasHeight,
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
 * 翻转图片
 * @param file 原始图片文件
 * @param options 翻转选项
 * @returns 翻转结果
 */
export async function flipImage(
  file: File,
  options: ImageFlipOptions
): Promise<ImageTransformResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        try {
          const originalWidth = img.width
          const originalHeight = img.height

          // 创建 canvas
          const canvas = document.createElement('canvas')
          canvas.width = originalWidth
          canvas.height = originalHeight

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }

          // 应用翻转变换
          if (options.direction === 'horizontal') {
            // 水平翻转
            ctx.translate(originalWidth, 0)
            ctx.scale(-1, 1)
          } else {
            // 垂直翻转
            ctx.translate(0, originalHeight)
            ctx.scale(1, -1)
          }

          // 绘制图片
          ctx.drawImage(img, 0, 0, originalWidth, originalHeight)

          // 转换为 Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片翻转失败'))
                return
              }

              resolve({
                file: blob,
                fileName: file.name,
                width: originalWidth,
                height: originalHeight,
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
 * 批量旋转图片
 */
export async function rotateImageBatch(
  files: File[],
  options: ImageRotateOptions
): Promise<ImageTransformResult[]> {
  const results: ImageTransformResult[] = []

  for (const file of files) {
    try {
      const result = await rotateImage(file, options)
      results.push(result)
    } catch (error) {
      console.error(`旋转文件 ${file.name} 失败:`, error)
      throw error
    }
  }

  return results
}

/**
 * 批量翻转图片
 */
export async function flipImageBatch(
  files: File[],
  options: ImageFlipOptions
): Promise<ImageTransformResult[]> {
  const results: ImageTransformResult[] = []

  for (const file of files) {
    try {
      const result = await flipImage(file, options)
      results.push(result)
    } catch (error) {
      console.error(`翻转文件 ${file.name} 失败:`, error)
      throw error
    }
  }

  return results
}

/**
 * 验证旋转角度
 */
export function validateRotateAngle(angle: number): { valid: boolean; error?: string } {
  const validAngles = [90, 180, 270, -90, -180, -270]

  if (!validAngles.includes(angle)) {
    return {
      valid: false,
      error: '旋转角度必须是 90、180 或 270 度'
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
 * 图片旋转处理选项
 */
export interface ImageRotateProcessOptions {
  operation: 'rotate' | 'flipH' | 'flipV'
  angle?: number
}

/**
 * 图片旋转处理器类
 */
export class ImageRotateProcessor {
  async process(
    files: File[],
    options: ImageRotateProcessOptions,
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

        let result: ImageTransformResult

        if (options.operation === 'rotate' && options.angle) {
          result = await rotateImage(file, { angle: options.angle as RotateAngle })
        } else if (options.operation === 'flipH') {
          result = await flipImage(file, { direction: 'horizontal' })
        } else if (options.operation === 'flipV') {
          result = await flipImage(file, { direction: 'vertical' })
        } else {
          throw new Error('无效的操作类型')
        }

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
        error: error.message || '处理失败'
      }
    }
  }
}

/**
 * 创建图片旋转处理器
 */
export function createImageRotateProcessor(): ImageRotateProcessor {
  return new ImageRotateProcessor()
}
