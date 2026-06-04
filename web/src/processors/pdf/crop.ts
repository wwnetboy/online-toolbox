import { PDFDocument } from 'pdf-lib'
import type { ValidationResult, ProcessResult } from './types'

/**
 * 裁剪区域定义
 * 需求 15.2: 允许用户通过可视化方式或输入尺寸来定义裁剪边界
 */
export interface CropArea {
  x: number // 左上角X坐标(pt)
  y: number // 左上角Y坐标(pt)
  width: number // 宽度(pt)
  height: number // 高度(pt)
}

/**
 * 裁剪模式
 * 需求 15.3: 支持对所有页面应用相同裁剪或单独页面裁剪
 */
export type CropMode = 'same' | 'individual'

/**
 * 裁剪选项
 */
export interface CropOptions {
  mode: CropMode // 裁剪模式
  cropArea: CropArea // 统一裁剪区域（mode='same'时使用）
  pageCrops?: Map<number, CropArea> // 单独页面裁剪区域（mode='individual'时使用，key为页码1-based）
}

/**
 * 页面尺寸信息
 */
export interface PageDimension {
  pageNumber: number // 页码（1-based）
  width: number // 宽度(pt)
  height: number // 高度(pt)
  rotation: number // 旋转角度
}

/**
 * 默认裁剪选项
 */
export const defaultCropOptions: CropOptions = {
  mode: 'same',
  cropArea: {
    x: 0,
    y: 0,
    width: 595, // A4 width in pt
    height: 842 // A4 height in pt
  }
}

/**
 * 验证裁剪区域是否有效
 */
export function validateCropArea(
  cropArea: CropArea,
  pageWidth: number,
  pageHeight: number
): { valid: boolean; error?: string } {
  if (cropArea.x < 0) {
    return { valid: false, error: 'X坐标不能为负数' }
  }
  if (cropArea.y < 0) {
    return { valid: false, error: 'Y坐标不能为负数' }
  }
  if (cropArea.width <= 0) {
    return { valid: false, error: '宽度必须大于0' }
  }
  if (cropArea.height <= 0) {
    return { valid: false, error: '高度必须大于0' }
  }
  if (cropArea.x + cropArea.width > pageWidth) {
    return { valid: false, error: '裁剪区域超出页面右边界' }
  }
  if (cropArea.y + cropArea.height > pageHeight) {
    return { valid: false, error: '裁剪区域超出页面上边界' }
  }
  return { valid: true }
}

function normalizeRotation(rotation: number): 0 | 90 | 180 | 270 {
  const rounded = Math.round(rotation / 90) * 90
  const normalized = ((rounded % 360) + 360) % 360
  if (normalized === 90 || normalized === 180 || normalized === 270) return normalized
  return 0
}

export function getVisualPageSize(
  pageWidth: number,
  pageHeight: number,
  rotation: number
): { width: number; height: number; rotation: 0 | 90 | 180 | 270 } {
  const r = normalizeRotation(rotation)
  if (r === 90 || r === 270) {
    return { width: pageHeight, height: pageWidth, rotation: r }
  }
  return { width: pageWidth, height: pageHeight, rotation: r }
}

export function cropAreaToPdfCropBox(
  cropArea: CropArea,
  pageWidth: number,
  pageHeight: number,
  rotation: number
): { x: number; y: number; width: number; height: number } {
  const { rotation: r } = getVisualPageSize(pageWidth, pageHeight, rotation)

  let x = cropArea.x
  let y = cropArea.y
  let w = cropArea.width
  let h = cropArea.height

  if (r === 90) {
    x = cropArea.y
    y = pageHeight - cropArea.x - cropArea.width
    w = cropArea.height
    h = cropArea.width
  } else if (r === 180) {
    x = pageWidth - cropArea.x - cropArea.width
    y = pageHeight - cropArea.y - cropArea.height
  } else if (r === 270) {
    x = pageWidth - cropArea.y - cropArea.height
    y = cropArea.x
    w = cropArea.height
    h = cropArea.width
  }

  const bottomY = pageHeight - y - h
  return { x, y: bottomY, width: w, height: h }
}

/**
 * PDF裁剪处理器
 * 实现PDF页面裁剪功能
 * 需求: 15.1, 15.2, 15.3, 15.5
 */
export class CropProcessor {
  /**
   * 验证文件
   */
  validate(files: File[]): ValidationResult {
    const errors: string[] = []

    if (!files || files.length === 0) {
      errors.push('请选择一个PDF文件')
      return { valid: false, errors }
    }

    if (files.length > 1) {
      errors.push('一次只能裁剪一个PDF文件')
      return { valid: false, errors }
    }

    const file = files[0]
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      errors.push('文件不是PDF格式')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取默认选项
   */
  getDefaultOptions(): CropOptions {
    return { ...defaultCropOptions }
  }

  /**
   * 获取PDF页面尺寸信息
   * 需求 15.1: 显示带有裁剪区域选择的页面
   */
  async getPageDimensions(file: File): Promise<PageDimension[]> {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const pages = pdfDoc.getPages()

    return pages.map((page, index) => {
      const { width, height } = page.getSize()
      const rotation = page.getRotation().angle

      return {
        pageNumber: index + 1,
        width,
        height,
        rotation
      }
    })
  }

  /**
   * 获取PDF页数
   */
  async getPageCount(file: File): Promise<number> {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    return pdfDoc.getPageCount()
  }

  /**
   * 预览裁剪效果
   * 需求 15.4: 在应用前预览裁剪结果
   */
  async preview(file: File, pageIndex: number, cropArea: CropArea): Promise<ProcessResult<string>> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const totalPages = pdfDoc.getPageCount()

      if (pageIndex < 0 || pageIndex >= totalPages) {
        return {
          success: false,
          error: `页码索引超出范围 (0-${totalPages - 1})`
        }
      }

      // Create a new document with just the preview page
      const previewDoc = await PDFDocument.create()
      const [copiedPage] = await previewDoc.copyPages(pdfDoc, [pageIndex])
      previewDoc.addPage(copiedPage)

      // Get the page and apply crop
      const page = previewDoc.getPages()[0]
      const { width, height } = page.getSize()
      const rotation = page.getRotation().angle

      // Validate crop area
      const visualSize = getVisualPageSize(width, height, rotation)
      const validation = validateCropArea(cropArea, visualSize.width, visualSize.height)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      const cropBox = cropAreaToPdfCropBox(cropArea, width, height, rotation)
      page.setCropBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height)

      const pdfBytes = await previewDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      return {
        success: true,
        data: url
      }
    } catch (error) {
      console.error('预览生成失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '预览生成失败'
      }
    }
  }

  /**
   * 裁剪PDF
   * 需求 15.1: 显示带有裁剪区域选择的页面
   * 需求 15.2: 允许用户通过可视化方式或输入尺寸来定义裁剪边界
   * 需求 15.3: 支持对所有页面应用相同裁剪或单独页面裁剪
   * 需求 15.5: 保留裁剪区域内的内容质量
   */
  async process(
    files: File[],
    options: CropOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<Blob>> {
    try {
      // Validate files
      const validation = this.validate(files)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      if (onProgress) {
        onProgress(10, '正在读取PDF文件...')
      }

      const file = files[0]
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()
      const totalPages = pages.length

      if (onProgress) {
        onProgress(20, '正在准备裁剪...')
      }

      // Apply crop to each page
      for (let i = 0; i < totalPages; i++) {
        const page = pages[i]
        const { width, height } = page.getSize()
        const rotation = page.getRotation().angle
        const pageNumber = i + 1

        // Determine crop area for this page
        let cropArea: CropArea

        if (options.mode === 'individual' && options.pageCrops?.has(pageNumber)) {
          cropArea = options.pageCrops.get(pageNumber)!
        } else {
          cropArea = options.cropArea
        }

        const visualSize = getVisualPageSize(width, height, rotation)
        const cropValidation = validateCropArea(cropArea, visualSize.width, visualSize.height)
        if (!cropValidation.valid) {
          return {
            success: false,
            error: `第 ${pageNumber} 页: ${cropValidation.error}`
          }
        }

        const cropBox = cropAreaToPdfCropBox(cropArea, width, height, rotation)
        page.setCropBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height)

        // Update progress
        if (onProgress) {
          const progress = 20 + Math.round((i / totalPages) * 60)
          onProgress(progress, `正在裁剪第 ${pageNumber}/${totalPages} 页...`)
        }
      }

      if (onProgress) {
        onProgress(90, '正在保存文件...')
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (onProgress) {
        onProgress(100, '裁剪完成')
      }

      return {
        success: true,
        data: blob,
        progress: 100
      }
    } catch (error) {
      console.error('PDF裁剪失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '裁剪失败，请重试'
      }
    }
  }
}

/**
 * 创建裁剪处理器实例
 */
export function createCropProcessor(): CropProcessor {
  return new CropProcessor()
}
