import { PDFDocument } from 'pdf-lib'

/**
 * PDF拆分模式
 */
export type PdfSplitMode = 'range' | 'equal' | 'bookmark'

/**
 * PDF拆分选项
 */
export interface PdfSplitOptions {
  mode: PdfSplitMode
  ranges?: string // "1-3,5,7-10" 格式
  equalParts?: number // 均分份数
}

/**
 * PDF拆分结果
 */
export interface PdfSplitResult {
  files: Array<{
    name: string
    blob: Blob
    pageCount: number
  }>
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
 * PDF拆分处理器
 * 实现按页码范围、按页数均分、按书签拆分
 * 需求: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class PdfSplitProcessor {
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
      errors.push('一次只能拆分一个PDF文件')
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
  getDefaultOptions(): PdfSplitOptions {
    return {
      mode: 'range',
      ranges: '1-10'
    }
  }

  /**
   * 解析页码范围字符串
   * 例如: "1-3,5,7-10" => [1,2,3,5,7,8,9,10]
   */
  private parseRanges(rangeStr: string, maxPage: number): number[][] {
    const ranges: number[][] = []
    const parts = rangeStr.split(',').map((s) => s.trim())

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((s) => parseInt(s.trim()))
        if (isNaN(start) || isNaN(end) || start < 1 || end > maxPage || start > end) {
          throw new Error(`无效的页码范围: ${part}`)
        }
        const range: number[] = []
        for (let i = start; i <= end; i++) {
          range.push(i)
        }
        ranges.push(range)
      } else {
        const page = parseInt(part)
        if (isNaN(page) || page < 1 || page > maxPage) {
          throw new Error(`无效的页码: ${part}`)
        }
        ranges.push([page])
      }
    }

    return ranges
  }

  /**
   * 按页数均分
   */
  private splitEqually(totalPages: number, parts: number): number[][] {
    if (parts < 1) {
      throw new Error('均分份数必须大于0')
    }

    if (parts > totalPages) {
      throw new Error('均分份数不能大于总页数')
    }

    const ranges: number[][] = []
    const pagesPerPart = Math.floor(totalPages / parts)
    const remainder = totalPages % parts

    let currentPage = 1
    for (let i = 0; i < parts; i++) {
      const range: number[] = []
      // 前 remainder 个部分多分配一页
      const pagesInThisPart = pagesPerPart + (i < remainder ? 1 : 0)

      for (let j = 0; j < pagesInThisPart; j++) {
        range.push(currentPage++)
      }
      ranges.push(range)
    }

    return ranges
  }

  /**
   * 拆分PDF文件
   * 需求 5.1: 按页码范围拆分
   * 需求 5.2: 按页数均分
   * 需求 5.3: 按书签拆分
   * 需求 5.4: 自动命名为"原文件名_第X部分"
   * 需求 5.5: 批量导出所有拆分结果
   */
  async process(
    files: File[],
    options: PdfSplitOptions,
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<ProcessResult<PdfSplitResult>> {
    try {
      // 验证文件
      const validation = this.validate(files)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      const file = files[0]
      const originalName = file.name.replace(/\.pdf$/i, '')

      // 读取PDF文件
      if (onProgress) {
        onProgress(10, '正在读取PDF文件...')
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer)
      const totalPages = pdfDoc.getPageCount()

      // 根据模式确定拆分范围
      let ranges: number[][] = []

      if (options.mode === 'range') {
        // 需求 5.1: 按页码范围拆分
        if (!options.ranges) {
          return {
            success: false,
            error: '请指定页码范围'
          }
        }
        ranges = this.parseRanges(options.ranges, totalPages)
      } else if (options.mode === 'equal') {
        // 需求 5.2: 按页数均分
        if (!options.equalParts || options.equalParts < 1) {
          return {
            success: false,
            error: '请指定均分份数'
          }
        }
        ranges = this.splitEqually(totalPages, options.equalParts)
      } else if (options.mode === 'bookmark') {
        // 需求 5.3: 按书签拆分
        // 注意: pdf-lib 对书签的支持有限
        // 这里提供一个简单的实现，实际项目中可能需要使用其他库
        return {
          success: false,
          error: '按书签拆分功能暂未实现，请使用其他拆分模式'
        }
      }

      // 创建拆分后的PDF文件
      const results: Array<{
        name: string
        blob: Blob
        pageCount: number
      }> = []

      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i]

        if (onProgress) {
          const progress = 10 + Math.round((i / ranges.length) * 80)
          onProgress(progress, `正在拆分第 ${i + 1} 部分...`)
        }

        // 创建新的PDF文档
        const newPdf = await PDFDocument.create()

        // 复制指定页面
        for (const pageNum of range) {
          const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1])
          newPdf.addPage(copiedPage)
        }

        // 保存PDF
        const pdfBytes = await newPdf.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })

        // 需求 5.4: 自动命名为"原文件名_第X部分"
        const fileName = `${originalName}_第${i + 1}部分.pdf`

        results.push({
          name: fileName,
          blob,
          pageCount: range.length
        })
      }

      if (onProgress) {
        onProgress(100, '拆分完成')
      }

      // 需求 5.5: 批量导出所有拆分结果
      return {
        success: true,
        data: {
          files: results
        },
        progress: 100
      }
    } catch (error) {
      console.error('PDF拆分失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '拆分失败，请重试'
      }
    }
  }
}

/**
 * 创建PDF拆分处理器实例
 */
export function createPdfSplitProcessor(): PdfSplitProcessor {
  return new PdfSplitProcessor()
}
