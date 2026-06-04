import { PDFDocument, rgb, degrees, StandardFonts, PDFArray, PDFName, type PDFPage } from 'pdf-lib'
import {
  submitConversion,
  pollTaskUntilComplete,
  downloadResult as downloadConversionResult,
  ConversionType,
  TaskStatus
} from '@/api/pdf-convert'

/**
 * 水印类型
 */
export type WatermarkType = 'text' | 'image'

/**
 * 检测文本是否包含非ASCII字符（如中文、日文等）
 */
function containsNonAscii(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(text)
}

/**
 * 将文字渲染为PNG图片（用于支持中文等非ASCII字符）
 */
async function renderTextToImage(
  text: string,
  fontSize: number,
  color: string,
  fontFamily: string
): Promise<Uint8Array> {
  // 创建canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // 设置字体并测量文字
  await document.fonts?.load(`${fontSize}px ${fontFamily}`)
  ctx.font = `${fontSize}px ${fontFamily}`
  const metrics = ctx.measureText(text)
  const textWidth = Math.ceil(metrics.width)
  const textHeight = Math.ceil(fontSize * 1.2)

  // 设置canvas大小（添加一些padding）
  const padding = 10
  canvas.width = textWidth + padding * 2
  canvas.height = textHeight + padding * 2

  // 清除背景（透明）
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 绘制文字
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, padding, canvas.height / 2)

  // 转换为PNG
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          blob.arrayBuffer().then((buffer) => {
            resolve(new Uint8Array(buffer))
          })
        } else {
          reject(new Error('Failed to create image from text'))
        }
      },
      'image/png',
      1.0
    )
  })
}

/**
 * 水印位置
 */
export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type WatermarkPositionMode = 'grid' | 'custom'

export type WatermarkLayer = 'foreground' | 'background'

export type WatermarkApplyMode = 'all' | 'range'

export type WatermarkLayout = 'tile' | 'single'

export type WatermarkOutputStandard = 'pdf' | 'pdfa-1b'

/**
 * PDF水印选项
 */
export interface PdfWatermarkOptions {
  type: WatermarkType
  content: string // 文字内容或图片URL
  position?: WatermarkPosition
  positionMode?: WatermarkPositionMode
  positionX?: number
  positionY?: number
  opacity?: number // 0-100
  rotation?: number // 旋转角度
  fontSize?: number // 文字大小
  color?: string // 文字颜色 (hex格式)
  fontFamily?: string
  template?: 'confidential' | 'internal' | 'custom' // 企业模板
  layout?: WatermarkLayout
  layer?: WatermarkLayer
  applyTo?: WatermarkApplyMode
  pageRange?: string
  imageScale?: number
  outputStandard?: WatermarkOutputStandard
  imageFile?: File
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
 * PDF水印处理器
 * 实现文字水印、图片水印、透明度旋转设置
 * 需求: 8.1, 8.2, 8.3, 8.6
 */
export class PdfWatermarkProcessor {
  private readonly standardFontMap: Record<string, StandardFonts> = {
    Helvetica: StandardFonts.Helvetica,
    'Helvetica Bold': StandardFonts.HelveticaBold,
    'Times New Roman': StandardFonts.TimesRoman,
    'Times New Roman Bold': StandardFonts.TimesBold,
    'Courier New': StandardFonts.Courier,
    'Courier New Bold': StandardFonts.CourierBold
  }

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
      errors.push('一次只能为一个PDF文件添加水印')
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
  getDefaultOptions(): PdfWatermarkOptions {
    return {
      type: 'text',
      content: '水印',
      position: 'center',
      positionMode: 'grid',
      positionX: 20,
      positionY: 20,
      opacity: 30,
      rotation: 45,
      fontSize: 48,
      color: '#000000',
      fontFamily: 'Helvetica',
      layout: 'single',
      layer: 'foreground',
      applyTo: 'all',
      pageRange: '',
      imageScale: 0.5,
      outputStandard: 'pdfa-1b'
    }
  }

  /**
   * 获取企业水印模板
   * 需求 8.6: 提供"内部保密"和"仅限办公使用"预设模板
   */
  getTemplate(template: 'confidential' | 'internal'): Partial<PdfWatermarkOptions> {
    switch (template) {
      case 'confidential':
        return {
          type: 'text',
          content: '内部保密',
          position: 'center',
          opacity: 20,
          rotation: 45,
          fontSize: 60,
          color: '#FF0000'
        }
      case 'internal':
        return {
          type: 'text',
          content: '仅限办公使用',
          position: 'center',
          opacity: 15,
          rotation: 45,
          fontSize: 48,
          color: '#666666'
        }
    }
  }

  /**
   * 计算水印位置
   */
  private calculatePosition(
    pageWidth: number,
    pageHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    position: WatermarkPosition
  ): { x: number; y: number } {
    const padding = 20

    switch (position) {
      case 'top-left':
        return { x: padding, y: pageHeight - watermarkHeight - padding }
      case 'top-center':
        return { x: (pageWidth - watermarkWidth) / 2, y: pageHeight - watermarkHeight - padding }
      case 'top-right':
        return {
          x: pageWidth - watermarkWidth - padding,
          y: pageHeight - watermarkHeight - padding
        }
      case 'center-left':
        return { x: padding, y: (pageHeight - watermarkHeight) / 2 }
      case 'center':
        return { x: (pageWidth - watermarkWidth) / 2, y: (pageHeight - watermarkHeight) / 2 }
      case 'center-right':
        return { x: pageWidth - watermarkWidth - padding, y: (pageHeight - watermarkHeight) / 2 }
      case 'bottom-left':
        return { x: padding, y: padding }
      case 'bottom-center':
        return { x: (pageWidth - watermarkWidth) / 2, y: padding }
      case 'bottom-right':
        return { x: pageWidth - watermarkWidth - padding, y: padding }
      default:
        return { x: (pageWidth - watermarkWidth) / 2, y: (pageHeight - watermarkHeight) / 2 }
    }
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

  private parsePageRange(rangeStr: string, maxPage: number): number[] {
    const normalized = rangeStr.trim()
    if (!normalized) return []
    const pages = new Set<number>()
    const parts = normalized.split(',').map((s) => s.trim())

    for (const part of parts) {
      if (!part) continue
      if (part.includes('-')) {
        const [startRaw, endRaw] = part.split('-')
        const start = parseInt(startRaw.trim())
        const end = parseInt(endRaw.trim())
        if (Number.isNaN(start) || Number.isNaN(end) || start < 1 || end > maxPage || start > end) {
          throw new Error(`无效的页码范围: ${part}`)
        }
        for (let i = start; i <= end; i++) {
          pages.add(i)
        }
      } else {
        const page = parseInt(part)
        if (Number.isNaN(page) || page < 1 || page > maxPage) {
          throw new Error(`无效的页码: ${part}`)
        }
        pages.add(page)
      }
    }

    return Array.from(pages).sort((a, b) => a - b)
  }

  private resolveTargetPages(
    pdfDoc: PDFDocument,
    options: PdfWatermarkOptions
  ): { pageIndexes: number[]; totalPages: number } {
    const totalPages = pdfDoc.getPageCount()
    if (options.applyTo === 'range') {
      const pages = this.parsePageRange(options.pageRange || '', totalPages)
      if (pages.length === 0) {
        return { pageIndexes: [], totalPages }
      }
      return {
        pageIndexes: pages.map((page) => page - 1),
        totalPages
      }
    }
    return {
      pageIndexes: Array.from({ length: totalPages }, (_, index) => index),
      totalPages
    }
  }

  private resolvePosition(
    pageWidth: number,
    pageHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    options: PdfWatermarkOptions
  ): { x: number; y: number } {
    if (options.positionMode === 'custom') {
      const x = Math.max(0, options.positionX || 0)
      const yTop = Math.max(0, options.positionY || 0)
      const y = pageHeight - yTop - watermarkHeight
      return { x, y }
    }

    return this.calculatePosition(
      pageWidth,
      pageHeight,
      watermarkWidth,
      watermarkHeight,
      options.position || 'center'
    )
  }

  private resolveFontFamily(fontFamily?: string): string {
    return fontFamily || 'Helvetica'
  }

  private resolveStandardFont(fontFamily?: string): StandardFonts | null {
    const resolved = this.resolveFontFamily(fontFamily)
    return this.standardFontMap[resolved] || null
  }

  private shouldRenderTextAsImage(content: string, fontFamily?: string): boolean {
    if (containsNonAscii(content)) return true
    return !this.resolveStandardFont(fontFamily)
  }

  private async loadImageBytes(imageFile: File): Promise<Uint8Array> {
    const fileType = imageFile.type.toLowerCase()
    const fileName = imageFile.name.toLowerCase()

    if (fileType.includes('svg') || fileName.endsWith('.svg')) {
      const svgText = await imageFile.text()
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
      const svgUrl = URL.createObjectURL(svgBlob)
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('SVG解析失败'))
        img.src = svgUrl
      })
      const canvas = document.createElement('canvas')
      canvas.width = image.width || 300
      canvas.height = image.height || 300
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(svgUrl)
        throw new Error('无法创建Canvas上下文')
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)
      URL.revokeObjectURL(svgUrl)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (!result) {
            reject(new Error('SVG转PNG失败'))
            return
          }
          resolve(result)
        }, 'image/png')
      })
      const buffer = await blob.arrayBuffer()
      return new Uint8Array(buffer)
    }

    const buffer = await imageFile.arrayBuffer()
    return new Uint8Array(buffer)
  }

  /**
   * 添加文字水印
   * 需求 8.1: 在PDF每页添加指定文字水印
   * 需求 8.3: 支持设置透明度和旋转角度
   */
  private async addTextWatermark(pdfDoc: PDFDocument, options: PdfWatermarkOptions): Promise<void> {
    const fontSize = options.fontSize || 48
    const opacity = (options.opacity || 30) / 100
    const rotation = options.rotation || 0
    const color = this.parseColor(options.color || '#000000')
    const content = options.content
    const layout = options.layout || 'single'
    const { pageIndexes } = this.resolveTargetPages(pdfDoc, options)
    const layer = options.layer || 'foreground'
    const pages = pdfDoc.getPages()

    if (this.shouldRenderTextAsImage(content, options.fontFamily)) {
      const colorHex = options.color || '#000000'
      const fontFamily = this.resolveFontFamily(options.fontFamily)
      const imageBytes = await renderTextToImage(content, fontSize, colorHex, fontFamily)
      const image = await pdfDoc.embedPng(imageBytes)
      const imageDims = image.scale(1)

      for (const pageIndex of pageIndexes) {
        const page = pages[pageIndex]
        const { width, height } = page.getSize()

        if (layout === 'tile') {
          const spacing = 100
          const startX = -width
          const startY = -height
          const endX = width * 2
          const endY = height * 2

          for (let y = startY; y < endY; y += imageDims.height + spacing) {
            for (let x = startX; x < endX; x += imageDims.width + spacing) {
              page.drawImage(image, {
                x: x,
                y: y,
                width: imageDims.width,
                height: imageDims.height,
                opacity: opacity,
                rotate: degrees(rotation)
              })
            }
          }
        } else {
          const position = this.resolvePosition(
            width,
            height,
            imageDims.width,
            imageDims.height,
            options
          )

          page.drawImage(image, {
            x: position.x,
            y: position.y,
            width: imageDims.width,
            height: imageDims.height,
            opacity: opacity,
            rotate: degrees(rotation)
          })
        }
        if (layer === 'background') {
          this.placeWatermarkBehind(page)
        }
      }
    } else {
      const standardFont = this.resolveStandardFont(options.fontFamily) || StandardFonts.Helvetica
      const font = await pdfDoc.embedFont(standardFont)

      for (const pageIndex of pageIndexes) {
        const page = pages[pageIndex]
        const { width, height } = page.getSize()
        const textWidth = font.widthOfTextAtSize(content, fontSize)
        const textHeight = fontSize

        if (layout === 'tile') {
          const spacing = 100
          const startX = -width
          const startY = -height
          const endX = width * 2
          const endY = height * 2

          for (let y = startY; y < endY; y += textHeight + spacing) {
            for (let x = startX; x < endX; x += textWidth + spacing) {
              page.drawText(content, {
                x: x,
                y: y,
                size: fontSize,
                font: font,
                color: rgb(color.r, color.g, color.b),
                opacity: opacity,
                rotate: degrees(rotation)
              })
            }
          }
        } else {
          const position = this.resolvePosition(width, height, textWidth, textHeight, options)

          page.drawText(content, {
            x: position.x,
            y: position.y,
            size: fontSize,
            font: font,
            color: rgb(color.r, color.g, color.b),
            opacity: opacity,
            rotate: degrees(rotation)
          })
        }
        if (layer === 'background') {
          this.placeWatermarkBehind(page)
        }
      }
    }
  }

  /**
   * 添加图片水印
   * 需求 8.2: 在PDF每页添加指定图片水印
   * 需求 8.3: 支持设置透明度和旋转角度
   */
  private async addImageWatermark(
    pdfDoc: PDFDocument,
    options: PdfWatermarkOptions
  ): Promise<void> {
    const opacity = (options.opacity || 30) / 100
    const layout = options.layout || 'single'
    const scale = options.imageScale || 0.5
    const { pageIndexes } = this.resolveTargetPages(pdfDoc, options)
    const layer = options.layer || 'foreground'
    const pages = pdfDoc.getPages()
    const imageFile = options.imageFile

    if (!imageFile) {
      throw new Error('请选择水印图片')
    }

    const imageBytes = await this.loadImageBytes(imageFile)
    const fileType = imageFile.type.toLowerCase()
    const fileName = imageFile.name.toLowerCase()
    let image

    if (fileType.includes('png') || fileName.endsWith('.png') || fileType.includes('svg')) {
      image = await pdfDoc.embedPng(imageBytes)
    } else if (
      fileType.includes('jpg') ||
      fileType.includes('jpeg') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg')
    ) {
      image = await pdfDoc.embedJpg(imageBytes)
    } else {
      throw new Error('不支持的图片格式，请使用 PNG、JPG 或 SVG')
    }

    const imageDims = image.scale(scale)

    for (const pageIndex of pageIndexes) {
      const page = pages[pageIndex]
      const { width, height } = page.getSize()

      if (layout === 'tile') {
        const spacing = 50
        const startX = 0
        const startY = 0
        const endX = width
        const endY = height

        for (let y = startY; y < endY; y += imageDims.height + spacing) {
          for (let x = startX; x < endX; x += imageDims.width + spacing) {
            page.drawImage(image, {
              x: x,
              y: y,
              width: imageDims.width,
              height: imageDims.height,
              opacity: opacity,
              rotate: degrees(options.rotation || 0)
            })
          }
        }
      } else {
        const position = this.resolvePosition(
          width,
          height,
          imageDims.width,
          imageDims.height,
          options
        )

        page.drawImage(image, {
          x: position.x,
          y: position.y,
          width: imageDims.width,
          height: imageDims.height,
          opacity: opacity,
          rotate: degrees(options.rotation || 0)
        })
      }
      if (layer === 'background') {
        this.placeWatermarkBehind(page)
      }
    }
  }

  /**
   * 添加PDF水印
   * 需求 8.1: 添加文字水印
   * 需求 8.2: 添加图片水印
   * 需求 8.3: 设置透明度和旋转角度
   * 需求 8.6: 企业水印模板
   */
  async process(
    files: File[],
    options: PdfWatermarkOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<Blob>> {
    try {
      // 验证文件
      const validation = this.validate(files)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      // 应用模板
      if (options.template && options.template !== 'custom') {
        const templateOptions = this.getTemplate(options.template)
        options = { ...options, ...templateOptions }
      }

      if (onProgress) {
        onProgress(10, '正在读取PDF文件...')
      }

      const file = files[0]
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)

      if (onProgress) {
        onProgress(30, '正在添加水印...')
      }

      // 根据类型添加水印
      if (options.applyTo === 'range' && !options.pageRange?.trim()) {
        return {
          success: false,
          error: '请填写页码范围'
        }
      }

      if (options.type === 'text') {
        await this.addTextWatermark(pdfDoc, options)
      } else if (options.type === 'image') {
        await this.addImageWatermark(pdfDoc, options)
      }

      if (onProgress) {
        onProgress(70, '正在保存文件...')
      }

      const pdfBytes = await pdfDoc.save()
      let blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (options.outputStandard === 'pdfa-1b') {
        if (onProgress) {
          onProgress(85, '正在转换为PDF/A-1b...')
        }
        const converted = await this.convertToPdfa(blob)
        blob = converted
      }

      if (onProgress) {
        onProgress(100, '水印添加完成')
      }

      return {
        success: true,
        data: blob,
        progress: 100
      }
    } catch (error) {
      console.error('PDF水印添加失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加水印失败，请重试'
      }
    }
  }

  private async convertToPdfa(blob: Blob): Promise<Blob> {
    const file = new File([blob], 'watermarked.pdf', { type: 'application/pdf' })
    const task = await submitConversion(file, ConversionType.PDF_TO_PDFA, {
      pdfaVersion: '1b'
    })
    const completedTask = await pollTaskUntilComplete(task.taskId)
    if (completedTask.status !== TaskStatus.COMPLETED) {
      throw new Error(completedTask.error || 'PDF/A转换失败')
    }
    return await downloadConversionResult(completedTask.taskId)
  }

  private placeWatermarkBehind(page: PDFPage): void {
    const contents = page.node.get(PDFName.of('Contents'))
    if (!(contents instanceof PDFArray)) {
      return
    }
    if (contents.size() < 2) {
      return
    }
    const lastIndex = contents.size() - 1
    const last = contents.get(lastIndex)
    contents.remove(lastIndex)
    contents.insert(0, last)
  }
}

/**
 * 创建PDF水印处理器实例
 */
export function createPdfWatermarkProcessor(): PdfWatermarkProcessor {
  return new PdfWatermarkProcessor()
}
