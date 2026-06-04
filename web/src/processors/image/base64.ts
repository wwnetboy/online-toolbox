/**
 * 图片Base64互转处理器
 * 实现图片与Base64互转
 * 需求: 31.1, 31.2, 31.3, 31.4, 31.5
 */

export type Base64Format = 'data-uri' | 'pure' // 带Data URI前缀或纯Base64

export interface ImageToBase64Options {
  format: Base64Format
  quality?: number // 图片质量 (10-100)，仅对 JPEG 有效
}

export interface ImageToBase64Result {
  base64: string
  format: Base64Format
  mimeType: string
  size: number // Base64 字符串长度
}

export interface Base64ToImageResult {
  file: Blob
  fileName: string
  mimeType: string
  width: number
  height: number
}

/**
 * 将图片转换为 Base64
 * 需求 31.1: 上传图片转换为Base64编码字符串
 * @param file 图片文件
 * @param options 转换选项
 * @returns Base64 结果
 */
export async function imageToBase64(
  file: File,
  options: ImageToBase64Options
): Promise<ImageToBase64Result> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        let base64String = e.target?.result as string

        // 如果需要调整质量，重新处理图片
        if (options.quality && options.quality < 100) {
          base64String = await compressImageToBase64(file, options.quality)
        }

        // 提取 MIME 类型
        const mimeTypeMatch = base64String.match(/^data:([^;]+);base64,/)
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png'

        // 根据格式返回
        let result: string
        if (options.format === 'pure') {
          // 纯 Base64，移除 Data URI 前缀
          result = base64String.replace(/^data:[^;]+;base64,/, '')
        } else {
          // 带 Data URI 前缀
          result = base64String
        }

        resolve({
          base64: result,
          format: options.format,
          mimeType,
          size: result.length
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 将 Base64 转换为图片
 * 需求 31.2: 粘贴Base64编码转换为图片并预览
 * @param base64 Base64 字符串
 * @returns 图片结果
 */
export async function base64ToImage(base64: string): Promise<Base64ToImageResult> {
  return new Promise((resolve, reject) => {
    // 确保有 Data URI 前缀
    let dataUri = base64
    if (!base64.startsWith('data:')) {
      // 尝试检测图片类型
      const mimeType = detectImageType(base64)
      dataUri = `data:${mimeType};base64,${base64}`
    }

    // 提取 MIME 类型
    const mimeTypeMatch = dataUri.match(/^data:([^;]+);base64,/)
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png'

    // 创建图片对象以获取尺寸
    const img = new Image()

    img.onload = () => {
      // 将 Data URI 转换为 Blob
      fetch(dataUri)
        .then((res) => res.blob())
        .then((blob) => {
          // 生成文件名
          const extension = getExtensionFromMimeType(mimeType)
          const fileName = `image_${Date.now()}.${extension}`

          resolve({
            file: blob,
            fileName,
            mimeType,
            width: img.width,
            height: img.height
          })
        })
        .catch((error) => {
          reject(new Error(`转换失败: ${error.message}`))
        })
    }

    img.onerror = () => {
      reject(new Error('无效的 Base64 图片数据'))
    }

    img.src = dataUri
  })
}

/**
 * 压缩图片并转换为 Base64
 */
async function compressImageToBase64(file: File, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'))
          return
        }

        ctx.drawImage(img, 0, 0)

        // 转换为 Base64
        const base64 = canvas.toDataURL(file.type || 'image/jpeg', quality / 100)
        resolve(base64)
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
 * 检测 Base64 图片类型
 */
function detectImageType(base64: string): string {
  // 检查 Base64 开头的魔数
  const signatures: Record<string, string> = {
    '/9j/': 'image/jpeg',
    iVBORw0KGgo: 'image/png',
    R0lGOD: 'image/gif',
    UklGR: 'image/webp',
    Qk: 'image/bmp'
  }

  for (const [signature, mimeType] of Object.entries(signatures)) {
    if (base64.startsWith(signature)) {
      return mimeType
    }
  }

  // 默认返回 PNG
  return 'image/png'
}

/**
 * 从 MIME 类型获取文件扩展名
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp'
  }

  return extensions[mimeType] || 'png'
}

/**
 * 验证 Base64 字符串
 */
export function validateBase64(base64: string): { valid: boolean; error?: string } {
  if (!base64 || base64.trim() === '') {
    return {
      valid: false,
      error: 'Base64 字符串不能为空'
    }
  }

  // 移除 Data URI 前缀
  const pureBase64 = base64.replace(/^data:[^;]+;base64,/, '')

  // 验证 Base64 格式
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64Pattern.test(pureBase64)) {
    return {
      valid: false,
      error: '无效的 Base64 格式'
    }
  }

  return { valid: true }
}

/**
 * 计算 Base64 对应的文件大小（字节）
 */
export function calculateBase64FileSize(base64: string): number {
  // 移除 Data URI 前缀
  const pureBase64 = base64.replace(/^data:[^;]+;base64,/, '')

  // Base64 编码后大小约为原始大小的 4/3
  // 减去填充字符
  const padding = (pureBase64.match(/=/g) || []).length
  return Math.floor((pureBase64.length * 3) / 4) - padding
}

/**
 * 获取默认转换选项
 */
export function getDefaultImageToBase64Options(): ImageToBase64Options {
  return {
    format: 'data-uri',
    quality: 100
  }
}

/**
 * 批量转换图片为 Base64
 */
export async function imageToBase64Batch(
  files: File[],
  options: ImageToBase64Options
): Promise<ImageToBase64Result[]> {
  const results: ImageToBase64Result[] = []

  for (const file of files) {
    try {
      const result = await imageToBase64(file, options)
      results.push(result)
    } catch (error) {
      console.error(`转换文件 ${file.name} 失败:`, error)
      throw error
    }
  }

  return results
}
