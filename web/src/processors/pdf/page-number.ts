import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { ValidationResult, ProcessResult } from './types'

/**
 * 页码位置
 */
export type PageNumberPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/**
 * 页码格式
 */
export type PageNumberFormat = 'numeric' | 'roman' | 'chinese' | 'custom'

/**
 * 页码选项
 * 需求 14.1-14.6
 */
export interface PageNumberOptions {
  position: PageNumberPosition // 页码位置
  format: PageNumberFormat // 页码格式
  customFormat?: string // 自定义格式，如 "第{n}页/共{total}页"
  startNumber: number // 起始页码
  excludePages: number[] // 排除的页面（1-based）
  fontSize: number // 字号
  color: string // 颜色(hex)
  margin: number // 边距(pt)
}

/**
 * 默认页码选项
 */
export const defaultPageNumberOptions: PageNumberOptions = {
  position: 'bottom-center',
  format: 'numeric',
  customFormat: '第{n}页/共{total}页',
  startNumber: 1,
  excludePages: [],
  fontSize: 12,
  color: '#000000',
  margin: 30
}

/**
 * 将数字转换为罗马数字
 */
export function toRomanNumeral(num: number): string {
  if (num <= 0 || num > 3999) return String(num)

  const romanNumerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ]

  let result = ''
  let remaining = num

  for (const [value, symbol] of romanNumerals) {
    while (remaining >= value) {
      result += symbol
      remaining -= value
    }
  }

  return result
}

/**
 * 将数字转换为中文数字
 */
export function toChineseNumeral(num: number): string {
  if (num <= 0) return String(num)

  const chineseDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  const chineseUnits = ['', '十', '百', '千', '万', '十', '百', '千', '亿']

  if (num < 10) return chineseDigits[num]
  if (num < 100) {
    const tens = Math.floor(num / 10)
    const ones = num % 10
    if (tens === 1) {
      return ones === 0 ? '十' : `十${chineseDigits[ones]}`
    }
    return ones === 0
      ? `${chineseDigits[tens]}十`
      : `${chineseDigits[tens]}十${chineseDigits[ones]}`
  }

  // For larger numbers, use simple conversion
  const str = String(num)
  let result = ''
  let zeroFlag = false

  for (let i = 0; i < str.length; i++) {
    const digit = parseInt(str[i])
    const unitIndex = str.length - 1 - i

    if (digit === 0) {
      zeroFlag = true
    } else {
      if (zeroFlag) {
        result += chineseDigits[0]
        zeroFlag = false
      }
      result += chineseDigits[digit] + (chineseUnits[unitIndex] || '')
    }
  }

  return result
}

/**
 * 格式化页码
 */
export function formatPageNumber(
  pageNum: number,
  totalPages: number,
  format: PageNumberFormat,
  customFormat?: string
): string {
  switch (format) {
    case 'numeric':
      return String(pageNum)
    case 'roman':
      return toRomanNumeral(pageNum)
    case 'chinese':
      return toChineseNumeral(pageNum)
    case 'custom':
      if (customFormat) {
        return customFormat.replace(/{n}/g, String(pageNum)).replace(/{total}/g, String(totalPages))
      }
      return String(pageNum)
    default:
      return String(pageNum)
  }
}

/**
 * 解析颜色
 */
function parseColor(hexColor: string): { r: number; g: number; b: number } {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  return { r, g, b }
}

/**
 * 计算页码位置
 */
function calculatePosition(
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  textHeight: number,
  position: PageNumberPosition,
  margin: number
): { x: number; y: number } {
  let x: number
  let y: number

  // Calculate horizontal position
  switch (position) {
    case 'top-left':
    case 'bottom-left':
      x = margin
      break
    case 'top-center':
    case 'bottom-center':
      x = (pageWidth - textWidth) / 2
      break
    case 'top-right':
    case 'bottom-right':
      x = pageWidth - textWidth - margin
      break
    default:
      x = (pageWidth - textWidth) / 2
  }

  // Calculate vertical position
  switch (position) {
    case 'top-left':
    case 'top-center':
    case 'top-right':
      y = pageHeight - margin - textHeight
      break
    case 'bottom-left':
    case 'bottom-center':
    case 'bottom-right':
      y = margin
      break
    default:
      y = margin
  }

  return { x, y }
}

/**
 * PDF页码处理器
 * 实现页码添加功能
 * 需求: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */
export class PageNumberProcessor {
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
      errors.push('一次只能为一个PDF文件添加页码')
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
  getDefaultOptions(): PageNumberOptions {
    return { ...defaultPageNumberOptions }
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
   * 预览页码效果（返回指定页面的预览图）
   * 需求 14.7: 预览功能
   */
  async preview(
    file: File,
    options: PageNumberOptions,
    pageIndex: number
  ): Promise<ProcessResult<string>> {
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

      // Add page number to the preview page
      const page = previewDoc.getPages()[0]
      const { width, height } = page.getSize()

      // Calculate the actual page number
      const actualPageNum = pageIndex + 1
      const isExcluded = options.excludePages.includes(actualPageNum)

      if (!isExcluded) {
        // Calculate display page number (accounting for excluded pages before this one)
        let displayNum = options.startNumber
        for (let i = 1; i < actualPageNum; i++) {
          if (!options.excludePages.includes(i)) {
            displayNum++
          }
        }

        // Calculate total non-excluded pages
        const totalNonExcluded = totalPages - options.excludePages.length
        const pageNumberText = formatPageNumber(
          displayNum,
          totalNonExcluded,
          options.format,
          options.customFormat
        )

        const font = await previewDoc.embedFont(StandardFonts.Helvetica)
        const textWidth = font.widthOfTextAtSize(pageNumberText, options.fontSize)
        const textHeight = options.fontSize

        const position = calculatePosition(
          width,
          height,
          textWidth,
          textHeight,
          options.position,
          options.margin
        )

        const color = parseColor(options.color)

        page.drawText(pageNumberText, {
          x: position.x,
          y: position.y,
          size: options.fontSize,
          font: font,
          color: rgb(color.r, color.g, color.b)
        })
      }

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
   * 添加页码
   * 需求 14.1: 为所有或选定页面添加页码
   * 需求 14.2: 支持可自定义的页码位置
   * 需求 14.3: 支持可自定义的页码格式
   * 需求 14.4: 支持可自定义的字体、大小和颜色
   * 需求 14.5: 支持指定起始编号
   * 需求 14.6: 允许排除特定页面不编号
   */
  async process(
    files: File[],
    options: PageNumberOptions,
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
        onProgress(20, '正在准备添加页码...')
      }

      // Embed font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

      // Calculate total non-excluded pages for {total} placeholder
      const totalNonExcluded =
        totalPages - options.excludePages.filter((p) => p >= 1 && p <= totalPages).length

      // Track the current display page number
      let currentDisplayNum = options.startNumber

      // Add page numbers to each page
      for (let i = 0; i < totalPages; i++) {
        const actualPageNum = i + 1
        const isExcluded = options.excludePages.includes(actualPageNum)

        if (!isExcluded) {
          const page = pages[i]
          const { width, height } = page.getSize()

          // Format the page number
          const pageNumberText = formatPageNumber(
            currentDisplayNum,
            totalNonExcluded,
            options.format,
            options.customFormat
          )

          // Calculate text dimensions
          const textWidth = font.widthOfTextAtSize(pageNumberText, options.fontSize)
          const textHeight = options.fontSize

          // Calculate position
          const position = calculatePosition(
            width,
            height,
            textWidth,
            textHeight,
            options.position,
            options.margin
          )

          // Parse color
          const color = parseColor(options.color)

          // Draw page number
          page.drawText(pageNumberText, {
            x: position.x,
            y: position.y,
            size: options.fontSize,
            font: font,
            color: rgb(color.r, color.g, color.b)
          })

          // Increment display number for next non-excluded page
          currentDisplayNum++
        }

        // Update progress
        if (onProgress) {
          const progress = 20 + Math.round((i / totalPages) * 60)
          onProgress(progress, `正在处理第 ${actualPageNum}/${totalPages} 页...`)
        }
      }

      if (onProgress) {
        onProgress(90, '正在保存文件...')
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (onProgress) {
        onProgress(100, '页码添加完成')
      }

      return {
        success: true,
        data: blob,
        progress: 100
      }
    } catch (error) {
      console.error('PDF页码添加失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加页码失败，请重试'
      }
    }
  }
}

/**
 * 创建页码处理器实例
 */
export function createPageNumberProcessor(): PageNumberProcessor {
  return new PageNumberProcessor()
}
