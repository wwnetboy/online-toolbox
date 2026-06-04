/**
 * 图片格式转换处理器
 * 实现 JPG/PNG/BMP/WEBP/GIF 互转
 * 需求: 9.1, 9.2, 9.3, 9.4
 */

export interface ImageConvertOptions {
  targetFormat: 'jpg' | 'png' | 'bmp' | 'webp' | 'gif'
  quality: number // 10-100
}

export interface ImageConvertResult {
  file: Blob
  fileName: string
  originalSize: number
  convertedSize: number
  width: number
  height: number
}

/**
 * 将图片转换为指定格式
 * @param file 原始图片文件
 * @param options 转换选项
 * @returns 转换结果
 */
export async function convertImage(
  file: File,
  options: ImageConvertOptions
): Promise<ImageConvertResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        try {
          // 创建 canvas
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'))
            return
          }

          // 绘制图片
          ctx.drawImage(img, 0, 0)

          // 转换格式
          const mimeType = getMimeType(options.targetFormat)
          const quality = options.quality / 100

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片转换失败'))
                return
              }

              // 生成新文件名
              const originalName = file.name.substring(0, file.name.lastIndexOf('.'))
              const fileName = `${originalName}.${options.targetFormat}`

              resolve({
                file: blob,
                fileName,
                originalSize: file.size,
                convertedSize: blob.size,
                width: img.width,
                height: img.height
              })
            },
            mimeType,
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
 * 批量转换图片格式
 * @param files 图片文件列表
 * @param options 转换选项
 * @returns 转换结果列表
 */
export async function convertImageBatch(
  files: File[],
  options: ImageConvertOptions
): Promise<ImageConvertResult[]> {
  const results: ImageConvertResult[] = []

  for (const file of files) {
    try {
      const result = await convertImage(file, options)
      results.push(result)
    } catch (error) {
      console.error(`转换文件 ${file.name} 失败:`, error)
      throw error
    }
  }

  return results
}

/**
 * 获取 MIME 类型
 */
function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    bmp: 'image/bmp',
    webp: 'image/webp',
    gif: 'image/gif'
  }

  return mimeTypes[format.toLowerCase()] || 'image/png'
}

/**
 * 验证图片文件
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const supportedFormats = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp', 'image/gif']

  if (!supportedFormats.includes(file.type)) {
    return {
      valid: false,
      error: '不支持的图片格式'
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
 * 图片格式转换处理器类
 */
export class ImageConvertProcessor {
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
    options: ImageConvertOptions,
    onProgress?: (progress: number, fileName?: string) => void
  ): Promise<ProcessResult<{ files: Array<{ name: string; blob: Blob }> }>> {
    try {
      const results: Array<{ name: string; blob: Blob }> = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const progress = Math.round(((i + 1) / files.length) * 100)

        if (onProgress) {
          onProgress(progress, file.name)
        }

        const result = await convertImage(file, options)
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
        error: error.message || '转换失败'
      }
    }
  }
}

/**
 * 创建图片格式转换处理器
 */
export function createImageConvertProcessor(): ImageConvertProcessor {
  return new ImageConvertProcessor()
}
