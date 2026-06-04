/**
 * PDF转图片处理器
 * 使用pdfjs-dist渲染PDF页面为图片
 * 需求: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { pdfjsLib, getDocumentOptions } from '@/utils/pdfjs-config'
import JSZip from 'jszip'
import type { ValidationResult, ProcessResult } from './types'

/**
 * 输出图片格式
 */
export type ImageFormat = 'jpg' | 'png'

/**
 * DPI设置
 */
export type DpiSetting = 72 | 150 | 300

/**
 * 页面选择类型
 */
export type PageSelection = 'all' | number[]

/**
 * PDF转图片选项
 */
export interface PdfToImageOptions {
  format: ImageFormat
  dpi: DpiSetting
  pages: PageSelection
  quality: number // 1-100
}

/**
 * 单页转换结果
 */
export interface PageImageResult {
  pageIndex: number
  blob: Blob
  width: number
  height: number
  fileName: string
}

/**
 * PDF转图片结果
 */
export interface PdfToImageResult {
  images: PageImageResult[]
  totalPages: number
  convertedPages: number
}

/**
 * PDF页面信息
 */
export interface PdfPageInfo {
  pageIndex: number
  width: number
  height: number
  rotation: number
}

// DPI对应的缩放比例（基于72 DPI）
const DPI_SCALE_MAP: Record<DpiSetting, number> = {
  72: 1,
  150: 150 / 72,
  300: 300 / 72
}

// 支持的PDF MIME类型
const SUPPORTED_PDF_TYPES = ['application/pdf']
const SUPPORTED_EXTENSIONS = ['.pdf']

/**
 * PDF转图片处理器类
 */
export class PdfToImageProcessor {
  private pdfDocument: pdfjsLib.PDFDocumentProxy | null = null

  /**
   * 验证PDF文件
   * 需求 9.1: 验证上传的PDF文件
   */
  validate(file: File): ValidationResult {
    const errors: string[] = []

    if (!file) {
      errors.push('请选择一个PDF文件')
      return { valid: false, errors }
    }

    const isValidType = SUPPORTED_PDF_TYPES.includes(file.type.toLowerCase())
    const isValidExtension = SUPPORTED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    )

    if (!isValidType && !isValidExtension) {
      errors.push('请选择有效的PDF文件')
    }

    // 检查文件大小（限制100MB）
    if (file.size > 100 * 1024 * 1024) {
      errors.push('文件大小超过100MB限制')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取默认选项
   */
  getDefaultOptions(): PdfToImageOptions {
    return {
      format: 'jpg',
      dpi: 150,
      pages: 'all',
      quality: 85
    }
  }

  /**
   * 加载PDF文档
   */
  async loadDocument(file: File): Promise<number> {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument(getDocumentOptions(arrayBuffer))
    this.pdfDocument = await loadingTask.promise
    return this.pdfDocument.numPages
  }

  /**
   * 获取PDF页面信息列表
   * 需求 9.2: 允许用户选择特定页面进行转换
   */
  async getPageInfoList(file: File): Promise<PdfPageInfo[]> {
    if (!this.pdfDocument) {
      await this.loadDocument(file)
    }

    if (!this.pdfDocument) {
      throw new Error('无法加载PDF文档')
    }

    const pageInfoList: PdfPageInfo[] = []
    const numPages = this.pdfDocument.numPages

    for (let i = 1; i <= numPages; i++) {
      const page = await this.pdfDocument.getPage(i)
      const viewport = page.getViewport({ scale: 1 })

      pageInfoList.push({
        pageIndex: i - 1,
        width: viewport.width,
        height: viewport.height,
        rotation: page.rotate
      })
    }

    return pageInfoList
  }

  /**
   * 渲染单个页面为图片
   * 需求 9.3: 支持可配置的图片质量（DPI设置）
   * 需求 9.5: 保持原始页面的宽高比
   */
  async renderPageToImage(
    pageNumber: number,
    options: PdfToImageOptions
  ): Promise<PageImageResult> {
    if (!this.pdfDocument) {
      throw new Error('PDF文档未加载')
    }

    const page = await this.pdfDocument.getPage(pageNumber)
    const scale = DPI_SCALE_MAP[options.dpi]
    const viewport = page.getViewport({ scale })

    // 创建canvas
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('无法创建Canvas上下文')
    }

    canvas.width = viewport.width
    canvas.height = viewport.height

    // 渲染PDF页面到canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    }

    await page.render(renderContext).promise

    // 转换为图片Blob
    const mimeType = options.format === 'png' ? 'image/png' : 'image/jpeg'
    const quality = options.format === 'png' ? undefined : options.quality / 100

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('图片转换失败'))
          }
        },
        mimeType,
        quality
      )
    })

    // 生成文件名
    const fileName = `page_${pageNumber}.${options.format}`

    return {
      pageIndex: pageNumber - 1,
      blob,
      width: viewport.width,
      height: viewport.height,
      fileName
    }
  }

  /**
   * 处理PDF转图片
   * 需求 9.1: 将每页转换为图片
   * 需求 9.2: 允许用户选择特定页面进行转换
   * 需求 9.3: 支持可配置的图片质量
   * 需求 9.5: 保持原始页面的宽高比
   */
  async process(
    file: File,
    options: PdfToImageOptions,
    onProgress?: (progress: number, currentPage: number, totalPages: number) => void
  ): Promise<ProcessResult<PdfToImageResult>> {
    try {
      // 验证文件
      const validation = this.validate(file)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      // 加载PDF
      const totalPages = await this.loadDocument(file)

      // 确定要转换的页面
      let pagesToConvert: number[]
      if (options.pages === 'all') {
        pagesToConvert = Array.from({ length: totalPages }, (_, i) => i + 1)
      } else {
        // 过滤有效页码
        pagesToConvert = options.pages.filter((p) => p >= 1 && p <= totalPages)
        if (pagesToConvert.length === 0) {
          return {
            success: false,
            error: '没有有效的页面可转换'
          }
        }
      }

      const images: PageImageResult[] = []
      const convertedCount = pagesToConvert.length

      // 逐页转换
      for (let i = 0; i < pagesToConvert.length; i++) {
        const pageNumber = pagesToConvert[i]

        // 更新进度
        if (onProgress) {
          const progress = Math.round((i / convertedCount) * 100)
          onProgress(progress, pageNumber, convertedCount)
        }

        try {
          const result = await this.renderPageToImage(pageNumber, options)
          images.push(result)
        } catch (error) {
          console.warn(`页面 ${pageNumber} 转换失败:`, error)
          // 继续处理其他页面
        }
      }

      // 完成进度
      if (onProgress) {
        onProgress(100, convertedCount, convertedCount)
      }

      if (images.length === 0) {
        return {
          success: false,
          error: '所有页面转换失败'
        }
      }

      return {
        success: true,
        data: {
          images,
          totalPages,
          convertedPages: images.length
        },
        progress: 100
      }
    } catch (error) {
      console.error('PDF转图片失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '转换失败，请重试'
      }
    } finally {
      // 清理资源
      this.cleanup()
    }
  }

  /**
   * 下载单张图片
   */
  downloadImage(image: PageImageResult, customFileName?: string): void {
    const url = URL.createObjectURL(image.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = customFileName || image.fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 打包为ZIP下载
   * 需求 9.4: 提供多页ZIP压缩包下载
   */
  async downloadAsZip(
    images: PageImageResult[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const zip = new JSZip()

    // 添加图片到ZIP
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      zip.file(image.fileName, image.blob)

      if (onProgress) {
        const progress = Math.round(((i + 1) / images.length) * 50)
        onProgress(progress)
      }
    }

    // 生成ZIP文件
    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      },
      (metadata) => {
        if (onProgress) {
          const progress = 50 + Math.round(metadata.percent / 2)
          onProgress(progress)
        }
      }
    )

    return zipBlob
  }

  /**
   * 下载ZIP文件
   */
  downloadZip(zipBlob: Blob, fileName: string = 'pdf_images.zip'): void {
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.pdfDocument) {
      this.pdfDocument.destroy()
      this.pdfDocument = null
    }
  }

  /**
   * 获取页面预览（低分辨率）
   */
  async getPagePreview(file: File, pageNumber: number): Promise<string> {
    if (!this.pdfDocument) {
      await this.loadDocument(file)
    }

    if (!this.pdfDocument) {
      throw new Error('无法加载PDF文档')
    }

    const page = await this.pdfDocument.getPage(pageNumber)
    const scale = 0.5 // 低分辨率预览
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('无法创建Canvas上下文')
    }

    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    }).promise

    return canvas.toDataURL('image/jpeg', 0.7)
  }
}

/**
 * 创建PDF转图片处理器实例
 */
export function createPdfToImageProcessor(): PdfToImageProcessor {
  return new PdfToImageProcessor()
}
