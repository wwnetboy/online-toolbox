import { PDFDocument, degrees } from 'pdf-lib'

/**
 * PDF页面操作类型
 */
export type PdfPageOperation = 'extract' | 'delete' | 'rotate' | 'reorder'

/**
 * 页面旋转角度
 */
export type RotationAngle = 90 | 180 | 270 | -90

/**
 * PDF页面提取选项
 */
export interface PdfExtractOptions {
  pages: number[] // 要提取的页码数组
  outputName?: string
}

/**
 * PDF页面删除选项
 */
export interface PdfDeleteOptions {
  pages: number[] // 要删除的页码数组
}

/**
 * PDF页面旋转选项
 */
export interface PdfRotateOptions {
  pages: number[] // 要旋转的页码数组，空数组表示全部页面
  angle: RotationAngle // 旋转角度
}

/**
 * PDF页面重排选项
 */
export interface PdfReorderOptions {
  newOrder: number[] // 新的页面顺序数组
}

/**
 * PDF页面信息
 */
export interface PdfPageInfo {
  pageNumber: number
  width: number
  height: number
  rotation: number
}

/**
 * 文件验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 处理结果
 */
export interface ProcessResult<T> {
  success: boolean
  data?: T
  error?: string
  progress?: number
}

/**
 * PDF页面操作处理器
 * 实现页面提取、删除、旋转、重排
 * 需求: 25.1-25.5, 26.1-26.5, 27.1-27.5, 28.1-28.5
 */
export class PdfPageProcessor {
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
      errors.push('一次只能处理一个PDF文件')
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
   * 获取PDF页面信息
   * 需求 25.1, 26.1, 27.1, 28.1: 显示PDF页面缩略图预览
   */
  async getPageInfo(file: File): Promise<PdfPageInfo[]> {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const pages = pdfDoc.getPages()

    return pages.map((page, index) => ({
      pageNumber: index + 1,
      width: page.getWidth(),
      height: page.getHeight(),
      rotation: page.getRotation().angle
    }))
  }

  /**
   * 提取PDF页面
   * 需求 25.1: 显示PDF页面缩略图预览
   * 需求 25.2: 支持单选和多选页面
   * 需求 25.3: 支持"1,3,5-10"格式的页码输入
   * 需求 25.4: 将选中页面生成新的PDF文件
   * 需求 25.5: 支持自定义输出文件名
   */
  async extractPages(
    file: File,
    options: PdfExtractOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<Blob>> {
    try {
      const validation = this.validate([file])
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      if (!options.pages || options.pages.length === 0) {
        return {
          success: false,
          error: '请选择要提取的页面'
        }
      }

      if (onProgress) {
        onProgress(10, '正在读取PDF文件...')
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const totalPages = pdfDoc.getPageCount()

      // 验证页码
      for (const pageNum of options.pages) {
        if (pageNum < 1 || pageNum > totalPages) {
          return {
            success: false,
            error: `页码 ${pageNum} 超出范围 (1-${totalPages})`
          }
        }
      }

      if (onProgress) {
        onProgress(30, '正在提取页面...')
      }

      // 创建新的PDF文档
      const newPdf = await PDFDocument.create()

      // 复制选中的页面
      const pageIndices = options.pages.map((p) => p - 1)
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices)

      copiedPages.forEach((page) => {
        newPdf.addPage(page)
      })

      if (onProgress) {
        onProgress(80, '正在保存文件...')
      }

      // 保存PDF
      const pdfBytes = await newPdf.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (onProgress) {
        onProgress(100, '提取完成')
      }

      return {
        success: true,
        data: blob,
        progress: 100
      }
    } catch (error) {
      console.error('PDF页面提取失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '提取失败，请重试'
      }
    }
  }

  /**
   * 删除PDF页面
   * 需求 26.1: 显示PDF页面缩略图预览
   * 需求 26.2: 支持单选和多选页面
   * 需求 26.3: 移除选中页面并生成新PDF
   * 需求 26.4: 显示删除前后的页数对比
   * 需求 26.5: 至少保留一页
   */
  async deletePages(
    file: File,
    options: PdfDeleteOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<{ blob: Blob; originalPageCount: number; newPageCount: number }>> {
    try {
      const validation = this.validate([file])
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      if (!options.pages || options.pages.length === 0) {
        return {
          success: false,
          error: '请选择要删除的页面'
        }
      }

      if (onProgress) {
        onProgress(10, '正在读取PDF文件...')
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const totalPages = pdfDoc.getPageCount()

      // 需求 26.5: 至少保留一页
      if (options.pages.length >= totalPages) {
        return {
          success: false,
          error: '至少保留一页，不能删除所有页面'
        }
      }

      // 验证页码
      for (const pageNum of options.pages) {
        if (pageNum < 1 || pageNum > totalPages) {
          return {
            success: false,
            error: `页码 ${pageNum} 超出范围 (1-${totalPages})`
          }
        }
      }

      if (onProgress) {
        onProgress(30, '正在删除页面...')
      }

      // 创建新的PDF文档，只包含未删除的页面
      const newPdf = await PDFDocument.create()
      const pagesToKeep: number[] = []

      for (let i = 1; i <= totalPages; i++) {
        if (!options.pages.includes(i)) {
          pagesToKeep.push(i - 1)
        }
      }

      const copiedPages = await newPdf.copyPages(pdfDoc, pagesToKeep)
      copiedPages.forEach((page) => {
        newPdf.addPage(page)
      })

      if (onProgress) {
        onProgress(80, '正在保存文件...')
      }

      // 保存PDF
      const pdfBytes = await newPdf.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (onProgress) {
        onProgress(100, '删除完成')
      }

      // 需求 26.4: 显示删除前后的页数对比
      return {
        success: true,
        data: {
          blob,
          originalPageCount: totalPages,
          newPageCount: pagesToKeep.length
        },
        progress: 100
      }
    } catch (error) {
      console.error('PDF页面删除失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败，请重试'
      }
    }
  }

  /**
   * 旋转PDF页面
   * 需求 27.1: 显示PDF页面缩略图预览
   * 需求 27.2: 支持顺时针90度旋转
   * 需求 27.3: 支持逆时针90度旋转
   * 需求 27.4: 对所有页面应用相同旋转
   * 需求 27.5: 生成新的PDF文件供下载
   */
  async rotatePages(
    file: File,
    options: PdfRotateOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<Blob>> {
    try {
      const validation = this.validate([file])
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      if (onProgress) {
        onProgress(10, '正在读取PDF文件...')
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const pages = pdfDoc.getPages()
      const totalPages = pdfDoc.getPageCount()

      // 确定要旋转的页面
      let pagesToRotate: number[]
      if (!options.pages || options.pages.length === 0) {
        // 需求 27.4: 全部旋转
        pagesToRotate = Array.from({ length: totalPages }, (_, i) => i + 1)
      } else {
        pagesToRotate = options.pages
      }

      // 验证页码
      for (const pageNum of pagesToRotate) {
        if (pageNum < 1 || pageNum > totalPages) {
          return {
            success: false,
            error: `页码 ${pageNum} 超出范围 (1-${totalPages})`
          }
        }
      }

      if (onProgress) {
        onProgress(30, '正在旋转页面...')
      }

      // 旋转页面
      for (const pageNum of pagesToRotate) {
        const page = pages[pageNum - 1]
        const currentRotation = page.getRotation().angle
        const newRotation = (currentRotation + options.angle) % 360
        page.setRotation(degrees(newRotation))
      }

      if (onProgress) {
        onProgress(80, '正在保存文件...')
      }

      // 保存PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (onProgress) {
        onProgress(100, '旋转完成')
      }

      return {
        success: true,
        data: blob,
        progress: 100
      }
    } catch (error) {
      console.error('PDF页面旋转失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '旋转失败，请重试'
      }
    }
  }

  /**
   * 重排PDF页面
   * 需求 28.1: 显示PDF页面缩略图预览
   * 需求 28.2: 支持拖拽调整页面顺序
   * 需求 28.3: 按新顺序生成PDF文件
   * 需求 28.4: 支持重置为原始顺序
   * 需求 28.5: 提供下载按钮
   */
  async reorderPages(
    file: File,
    options: PdfReorderOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<Blob>> {
    try {
      const validation = this.validate([file])
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      if (!options.newOrder || options.newOrder.length === 0) {
        return {
          success: false,
          error: '请指定新的页面顺序'
        }
      }

      if (onProgress) {
        onProgress(10, '正在读取PDF文件...')
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const totalPages = pdfDoc.getPageCount()

      // 验证新顺序
      if (options.newOrder.length !== totalPages) {
        return {
          success: false,
          error: `页面数量不匹配: 期望 ${totalPages} 页，实际 ${options.newOrder.length} 页`
        }
      }

      // 验证页码
      const uniquePages = new Set(options.newOrder)
      if (uniquePages.size !== totalPages) {
        return {
          success: false,
          error: '页码重复或缺失'
        }
      }

      for (const pageNum of options.newOrder) {
        if (pageNum < 1 || pageNum > totalPages) {
          return {
            success: false,
            error: `页码 ${pageNum} 超出范围 (1-${totalPages})`
          }
        }
      }

      if (onProgress) {
        onProgress(30, '正在重排页面...')
      }

      // 创建新的PDF文档
      const newPdf = await PDFDocument.create()

      // 按新顺序复制页面
      const pageIndices = options.newOrder.map((p) => p - 1)
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices)

      copiedPages.forEach((page) => {
        newPdf.addPage(page)
      })

      if (onProgress) {
        onProgress(80, '正在保存文件...')
      }

      // 保存PDF
      const pdfBytes = await newPdf.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (onProgress) {
        onProgress(100, '重排完成')
      }

      return {
        success: true,
        data: blob,
        progress: 100
      }
    } catch (error) {
      console.error('PDF页面重排失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '重排失败，请重试'
      }
    }
  }
}

/**
 * 创建PDF页面操作处理器实例
 */
export function createPdfPageProcessor(): PdfPageProcessor {
  return new PdfPageProcessor()
}
