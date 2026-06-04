import { PDFDocument, rgb, degrees } from 'pdf-lib'
import type { ValidationResult, ProcessResult } from './types'

/**
 * 签名类型
 */
export type SignatureType = 'draw' | 'image' | 'text'

/**
 * 签名数据
 */
export interface SignatureData {
  type: SignatureType
  drawData?: string // 绘制签名的base64 (data URL)
  imageData?: Blob // 上传的签名图片
  text?: string // 文字签名
  font?: string // 文字签名字体
  fontSize?: number // 文字大小
  color?: string // 签名颜色 (hex)
}

/**
 * 签名位置
 */
export interface SignaturePlacement {
  pageIndex: number // 页面索引 (0-based)
  x: number // X坐标 (百分比 0-100)
  y: number // Y坐标 (百分比 0-100)
  width: number // 宽度 (百分比 0-100)
  height: number // 高度 (百分比 0-100)
}

/**
 * 单个签名配置
 */
export interface SignatureItem {
  id: string // 唯一标识
  data: SignatureData
  placement: SignaturePlacement
}

/**
 * 签名选项
 */
export interface SignatureOptions {
  signatures: SignatureItem[]
}

/**
 * 页面信息
 */
export interface PageInfo {
  index: number
  width: number
  height: number
}

/**
 * 默认签名选项
 */
export const defaultSignatureOptions: SignatureOptions = {
  signatures: []
}

/**
 * 默认签名数据
 */
export const defaultSignatureData: SignatureData = {
  type: 'draw',
  fontSize: 24,
  color: '#000000'
}

/**
 * 默认签名位置
 */
export const defaultSignaturePlacement: SignaturePlacement = {
  pageIndex: 0,
  x: 50,
  y: 10,
  width: 20,
  height: 10
}

/**
 * PDF签名处理器
 * 实现绘制签名、文字签名、图片签名嵌入PDF
 * 需求: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6
 */
export class SignatureProcessor {
  /**
   * 验证文件
   */
  validate(file: File): ValidationResult {
    const errors: string[] = []

    if (!file) {
      errors.push('请选择一个PDF文件')
      return { valid: false, errors }
    }

    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      errors.push('文件不是PDF格式')
    }

    // 检查文件大小 (100MB限制)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      errors.push('文件大小不能超过100MB')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证签名数据
   */
  validateSignature(signature: SignatureItem): ValidationResult {
    const errors: string[] = []

    if (!signature.data) {
      errors.push('签名数据不能为空')
      return { valid: false, errors }
    }

    const { type, drawData, imageData, text } = signature.data

    switch (type) {
      case 'draw':
        if (!drawData) {
          errors.push('请绘制签名')
        }
        break
      case 'image':
        if (!imageData) {
          errors.push('请上传签名图片')
        }
        break
      case 'text':
        if (!text || text.trim() === '') {
          errors.push('请输入签名文字')
        }
        break
      default:
        errors.push('无效的签名类型')
    }

    // 验证位置
    const { placement } = signature
    if (placement.pageIndex < 0) {
      errors.push('页面索引无效')
    }
    if (placement.x < 0 || placement.x > 100) {
      errors.push('X坐标必须在0-100之间')
    }
    if (placement.y < 0 || placement.y > 100) {
      errors.push('Y坐标必须在0-100之间')
    }
    if (placement.width <= 0 || placement.width > 100) {
      errors.push('宽度必须在0-100之间')
    }
    if (placement.height <= 0 || placement.height > 100) {
      errors.push('高度必须在0-100之间')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取PDF页面信息
   */
  async getPageInfo(file: File): Promise<PageInfo[]> {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const pages = pdfDoc.getPages()

    return pages.map((page, index) => {
      const { width, height } = page.getSize()
      return { index, width, height }
    })
  }

  /**
   * 将绘制的签名(canvas data URL)转换为图片Blob
   * 需求 18.2: 支持使用鼠标或触摸绘制签名
   */
  async createSignatureFromDraw(canvasDataUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // 验证data URL格式
      if (!canvasDataUrl.startsWith('data:image/')) {
        reject(new Error('无效的签名数据格式'))
        return
      }

      // 从data URL提取base64数据
      const parts = canvasDataUrl.split(',')
      if (parts.length !== 2) {
        reject(new Error('无效的签名数据格式'))
        return
      }

      const mimeMatch = parts[0].match(/data:([^;]+)/)
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'
      const base64Data = parts[1]

      try {
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: mimeType })
        resolve(blob)
      } catch (e) {
        reject(new Error('签名数据解析失败'))
      }
    })
  }

  /**
   * 从文字生成签名图片
   * 需求 18.4: 支持使用可自定义字体输入签名
   */
  async createSignatureFromText(
    text: string,
    options: { font?: string; fontSize?: number; color?: string } = {}
  ): Promise<Blob> {
    const { fontSize = 32, color = '#000000' } = options

    return new Promise((resolve, reject) => {
      try {
        // 创建canvas来渲染文字
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建Canvas上下文'))
          return
        }

        // 设置字体
        const fontFamily = options.font || 'cursive, "Brush Script MT", "Segoe Script", sans-serif'
        ctx.font = `${fontSize}px ${fontFamily}`

        // 测量文字宽度
        const metrics = ctx.measureText(text)
        const textWidth = metrics.width
        const textHeight = fontSize * 1.2

        // 设置canvas尺寸 (添加padding)
        const padding = 20
        canvas.width = textWidth + padding * 2
        canvas.height = textHeight + padding * 2

        // 清除背景 (透明)
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 重新设置字体 (canvas尺寸改变后需要重新设置)
        ctx.font = `${fontSize}px ${fontFamily}`
        ctx.fillStyle = color
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'

        // 绘制文字
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)

        // 转换为Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('生成签名图片失败'))
            }
          },
          'image/png',
          1.0
        )
      } catch (e) {
        reject(new Error('生成文字签名失败'))
      }
    })
  }

  /**
   * 解析颜色
   */
  private parseColor(hexColor: string): { r: number; g: number; b: number } {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255
    return { r, g, b }
  }

  /**
   * 将签名嵌入PDF
   * 需求 18.5: 允许在任意页面定位签名
   * 需求 18.6: 支持在文档中添加多个签名
   */
  async process(
    file: File,
    options: SignatureOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<Blob>> {
    try {
      // 验证文件
      const validation = this.validate(file)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      // 验证签名
      if (!options.signatures || options.signatures.length === 0) {
        return {
          success: false,
          error: '请至少添加一个签名'
        }
      }

      // 验证每个签名
      for (const sig of options.signatures) {
        const sigValidation = this.validateSignature(sig)
        if (!sigValidation.valid) {
          return {
            success: false,
            error: sigValidation.errors.join('; ')
          }
        }
      }

      if (onProgress) {
        onProgress(10, '正在读取PDF文件...')
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()
      const totalSignatures = options.signatures.length

      if (onProgress) {
        onProgress(20, '正在处理签名...')
      }

      // 处理每个签名
      for (let i = 0; i < options.signatures.length; i++) {
        const signature = options.signatures[i]
        const { data, placement } = signature

        if (onProgress) {
          const progress = 20 + ((i + 1) / totalSignatures) * 60
          onProgress(progress, `正在添加签名 ${i + 1}/${totalSignatures}...`)
        }

        // 检查页面索引
        if (placement.pageIndex >= pages.length) {
          return {
            success: false,
            error: `签名 ${i + 1} 的页面索引超出范围`
          }
        }

        const page = pages[placement.pageIndex]
        const { width: pageWidth, height: pageHeight } = page.getSize()

        // 计算实际位置和尺寸 (从百分比转换为点)
        const x = (placement.x / 100) * pageWidth
        const y = (placement.y / 100) * pageHeight
        const width = (placement.width / 100) * pageWidth
        const height = (placement.height / 100) * pageHeight

        // 根据签名类型处理
        let imageBlob: Blob | null = null

        switch (data.type) {
          case 'draw':
            if (data.drawData) {
              imageBlob = await this.createSignatureFromDraw(data.drawData)
            }
            break
          case 'image':
            if (data.imageData) {
              imageBlob = data.imageData
            }
            break
          case 'text':
            if (data.text) {
              imageBlob = await this.createSignatureFromText(data.text, {
                font: data.font,
                fontSize: data.fontSize,
                color: data.color
              })
            }
            break
        }

        if (!imageBlob) {
          return {
            success: false,
            error: `签名 ${i + 1} 数据无效`
          }
        }

        // 嵌入图片到PDF
        const imageBytes = await imageBlob.arrayBuffer()
        let image

        // 尝试作为PNG嵌入，如果失败则尝试JPG
        try {
          image = await pdfDoc.embedPng(imageBytes)
        } catch {
          try {
            image = await pdfDoc.embedJpg(imageBytes)
          } catch {
            return {
              success: false,
              error: `签名 ${i + 1} 图片格式不支持，请使用PNG或JPG格式`
            }
          }
        }

        // 绘制签名到页面
        page.drawImage(image, {
          x: x,
          y: y,
          width: width,
          height: height
        })
      }

      if (onProgress) {
        onProgress(90, '正在保存文件...')
      }

      // 保存PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (onProgress) {
        onProgress(100, '签名添加完成')
      }

      return {
        success: true,
        data: blob,
        progress: 100
      }
    } catch (error) {
      console.error('PDF签名添加失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加签名失败，请重试'
      }
    }
  }
}

/**
 * 创建PDF签名处理器实例
 */
export function createSignatureProcessor(): SignatureProcessor {
  return new SignatureProcessor()
}
