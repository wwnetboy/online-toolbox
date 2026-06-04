/**
 * 图片转PDF处理器
 * 实现图片验证、排序、PDF生成
 * 需求: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { PDFDocument } from 'pdf-lib'
import type { ValidationResult, ProcessResult } from './types'

/**
 * 页面尺寸类型
 */
export type PageSize = 'A4' | 'A3' | 'Letter' | 'original'

/**
 * 页面方向
 */
export type PageOrientation = 'portrait' | 'landscape'

/**
 * 图片质量
 */
export type ImageQuality = 'high' | 'medium' | 'low'

/**
 * 图片转PDF选项
 */
export interface ImageToPdfOptions {
  pageSize: PageSize
  orientation: PageOrientation
  margin: number // 边距(mm)
  quality: ImageQuality
}

/**
 * 图片转PDF结果
 */
export interface ImageToPdfResult {
  file: Blob
  pageCount: number
  fileSize: number
}

// 页面尺寸定义（单位：点，1点 = 1/72英寸）
const PAGE_SIZES: Record<Exclude<PageSize, 'original'>, { width: number; height: number }> = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  Letter: { width: 612, height: 792 }
}

// 质量对应的JPEG压缩比
const QUALITY_MAP: Record<ImageQuality, number> = {
  high: 0.95,
  medium: 0.8,
  low: 0.6
}

// 支持的图片格式
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp'
]
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']

/**
 * 图片转PDF处理器类
 */
export class ImageToPdfProcessor {
  /**
   * 验证文件列表
   * 需求 4.1: 验证上传的图片文件
   */
  validate(files: File[]): ValidationResult {
    const errors: string[] = []

    if (!files || files.length === 0) {
      errors.push('请至少选择一张图片')
      return { valid: false, errors }
    }

    for (const file of files) {
      const isValidType = SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase())
      const isValidExtension = SUPPORTED_EXTENSIONS.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      )

      if (!isValidType && !isValidExtension) {
        errors.push(`文件 ${file.name} 不是支持的图片格式`)
      }

      // 检查文件大小（限制50MB）
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`文件 ${file.name} 超过50MB大小限制`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取默认选项
   */
  getDefaultOptions(): ImageToPdfOptions {
    return {
      pageSize: 'A4',
      orientation: 'portrait',
      margin: 10,
      quality: 'high'
    }
  }

  /**
   * 重新排序图片
   * 需求 4.3: 允许用户在转换前重新排序图片
   */
  reorderImages(files: File[], newOrder: number[]): File[] {
    if (newOrder.length !== files.length) {
      throw new Error('排序数组长度与文件数量不匹配')
    }

    // 验证排序数组包含所有有效索引
    const sortedOrder = [...newOrder].sort((a, b) => a - b)
    for (let i = 0; i < sortedOrder.length; i++) {
      if (sortedOrder[i] !== i) {
        throw new Error('排序数组包含无效索引')
      }
    }

    return newOrder.map((index) => files[index])
  }

  /**
   * 处理图片转PDF
   * 需求 4.1: 将图片合并为单个PDF文件
   * 需求 4.2: 保持原始图片质量
   * 需求 4.4: 应用指定的页面尺寸
   * 需求 4.5: 支持批量转换多张图片
   */
  async process(
    files: File[],
    options: ImageToPdfOptions,
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<ProcessResult<ImageToPdfResult>> {
    try {
      // 验证文件
      const validation = this.validate(files)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      // 创建PDF文档
      const pdfDoc = await PDFDocument.create()
      let processedCount = 0
      const skippedFiles: string[] = []

      // 处理每张图片
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        try {
          // 更新进度
          if (onProgress) {
            const progress = Math.round((i / files.length) * 100)
            onProgress(progress, file.name)
          }

          // 添加图片到PDF
          await this.addImageToPage(pdfDoc, file, options)
          processedCount++
        } catch (error) {
          console.warn(`跳过无法处理的图片: ${file.name}`, error)
          skippedFiles.push(file.name)
          continue
        }
      }

      // 完成进度
      if (onProgress) {
        onProgress(100, '转换完成')
      }

      // 如果所有文件都失败了
      if (processedCount === 0) {
        return {
          success: false,
          error: '所有图片都无法处理，请检查文件是否损坏'
        }
      }

      // 保存PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      // 如果有跳过的文件，在结果中提示
      let warningMessage = ''
      if (skippedFiles.length > 0) {
        warningMessage = `已跳过 ${skippedFiles.length} 个无法处理的图片: ${skippedFiles.join(', ')}`
      }

      return {
        success: true,
        data: {
          file: blob,
          pageCount: pdfDoc.getPageCount(),
          fileSize: blob.size
        },
        error: warningMessage || undefined,
        progress: 100
      }
    } catch (error) {
      console.error('图片转PDF失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '转换失败，请重试'
      }
    }
  }

  /**
   * 添加图片到PDF页面
   */
  private async addImageToPage(
    pdfDoc: PDFDocument,
    file: File,
    options: ImageToPdfOptions
  ): Promise<void> {
    // 读取图片数据
    const imageBytes = await file.arrayBuffer()

    // 嵌入图片
    let image
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()

    if (fileType === 'image/png' || fileName.endsWith('.png')) {
      image = await pdfDoc.embedPng(imageBytes)
    } else if (
      fileType === 'image/jpeg' ||
      fileType === 'image/jpg' ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg')
    ) {
      image = await pdfDoc.embedJpg(imageBytes)
    } else {
      // 其他格式需要先转换为JPEG
      const convertedImage = await this.convertImageToJpeg(file, options.quality)
      const convertedBytes = await convertedImage.arrayBuffer()
      image = await pdfDoc.embedJpg(convertedBytes)
    }

    // 计算页面尺寸
    const pageSize = this.calculatePageSize(image.width, image.height, options)

    // 创建新页面
    const page = pdfDoc.addPage([pageSize.width, pageSize.height])

    // 计算图片尺寸和位置
    const marginPt = this.mmToPoints(options.margin)
    const imageDimensions = this.calculateImageDimensions(
      image.width,
      image.height,
      pageSize.width,
      pageSize.height,
      marginPt
    )

    // 绘制图片（居中）
    const x = (pageSize.width - imageDimensions.width) / 2
    const y = (pageSize.height - imageDimensions.height) / 2

    page.drawImage(image, {
      x,
      y,
      width: imageDimensions.width,
      height: imageDimensions.height
    })
  }

  /**
   * 计算页面尺寸
   * 需求 4.4: 应用指定的页面尺寸设置
   */
  private calculatePageSize(
    imageWidth: number,
    imageHeight: number,
    options: ImageToPdfOptions
  ): { width: number; height: number } {
    // 如果选择原始尺寸，使用图片尺寸
    if (options.pageSize === 'original') {
      const marginPt = this.mmToPoints(options.margin) * 2
      return {
        width: imageWidth + marginPt,
        height: imageHeight + marginPt
      }
    }

    // 获取预设页面尺寸
    const dimensions = PAGE_SIZES[options.pageSize]

    // 根据方向调整
    if (options.orientation === 'landscape') {
      return {
        width: dimensions.height,
        height: dimensions.width
      }
    }

    return { ...dimensions }
  }

  /**
   * 计算图片在页面上的尺寸
   */
  private calculateImageDimensions(
    imageWidth: number,
    imageHeight: number,
    pageWidth: number,
    pageHeight: number,
    margin: number
  ): { width: number; height: number } {
    // 可用空间
    const availableWidth = pageWidth - margin * 2
    const availableHeight = pageHeight - margin * 2

    // 计算缩放比例，保持宽高比
    const imageRatio = imageWidth / imageHeight
    const availableRatio = availableWidth / availableHeight

    if (imageRatio > availableRatio) {
      // 图片更宽，以宽度为准
      return {
        width: availableWidth,
        height: availableWidth / imageRatio
      }
    } else {
      // 图片更高，以高度为准
      return {
        width: availableHeight * imageRatio,
        height: availableHeight
      }
    }
  }

  /**
   * 将图片转换为JPEG格式
   */
  private async convertImageToJpeg(file: File, quality: ImageQuality): Promise<Blob> {
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
            reject(new Error('无法创建Canvas上下文'))
            return
          }

          ctx.drawImage(img, 0, 0)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片转换失败'))
                return
              }
              resolve(blob)
            },
            'image/jpeg',
            QUALITY_MAP[quality]
          )
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
   * 毫米转换为点
   */
  private mmToPoints(mm: number): number {
    // 1英寸 = 25.4毫米，1英寸 = 72点
    return (mm / 25.4) * 72
  }
}

/**
 * 创建图片转PDF处理器实例
 */
export function createImageToPdfProcessor(): ImageToPdfProcessor {
  return new ImageToPdfProcessor()
}
