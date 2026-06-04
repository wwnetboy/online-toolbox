/**
 * PDF修复处理器
 * 实现PDF文件诊断和结构修复功能
 * 需求: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { PDFDocument } from 'pdf-lib'
import type { ValidationResult, ProcessResult } from './types'

/**
 * 修复级别
 */
export type RepairLevel = 'light' | 'deep'

/**
 * 修复选项
 */
export interface RepairOptions {
  repairLevel: RepairLevel // 修复级别
  preserveAnnotations: boolean // 保留批注
}

/**
 * 诊断问题类型
 */
export type DiagnosisIssueType =
  | 'corrupted_header'
  | 'invalid_xref'
  | 'missing_pages'
  | 'damaged_objects'
  | 'invalid_stream'
  | 'missing_trailer'
  | 'encoding_error'
  | 'font_error'
  | 'image_error'
  | 'annotation_error'

/**
 * 诊断问题严重程度
 */
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * 诊断问题
 */
export interface DiagnosisIssue {
  type: DiagnosisIssueType
  severity: IssueSeverity
  description: string
  location?: string
  repairable: boolean
}

/**
 * 诊断结果
 */
export interface DiagnosisResult {
  isCorrupted: boolean
  canRepair: boolean
  issues: DiagnosisIssue[]
  pageCount: number
  fileSize: number
  pdfVersion?: string
  hasEncryption: boolean
  summary: string
}

/**
 * 修复结果
 */
export interface RepairResult {
  file: Blob
  repairLog: string[] // 修复日志
  recoveredPages: number // 恢复的页面数
  lostContent: string[] // 无法恢复的内容描述
  originalSize: number
  repairedSize: number
}

/**
 * PDF修复处理器
 * 需求 2.1: 尝试恢复文件结构和内容
 * 需求 2.2: 提供可下载的修复后PDF文件
 * 需求 2.3: 显示清晰的错误提示说明失败原因
 * 需求 2.4: 显示进度指示器
 * 需求 2.5: 尽可能保留原始内容
 */
export class RepairProcessor {
  /**
   * 验证文件
   */
  validate(file: File): ValidationResult {
    const errors: string[] = []

    if (!file) {
      errors.push('请选择一个PDF文件')
      return { valid: false, errors }
    }

    // 允许任何文件类型，因为损坏的PDF可能无法被正确识别
    // 但仍然检查文件扩展名
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      errors.push('文件扩展名不是.pdf')
    }

    // 文件大小限制 200MB
    const maxSize = 200 * 1024 * 1024
    if (file.size > maxSize) {
      errors.push('文件大小不能超过200MB')
    }

    // 文件不能为空
    if (file.size === 0) {
      errors.push('文件为空')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 诊断PDF文件
   * 需求 2.1: 检测PDF文件的损坏情况
   */
  async diagnose(
    file: File,
    onProgress?: (progress: number, message: string) => void
  ): Promise<DiagnosisResult> {
    const issues: DiagnosisIssue[] = []
    let pageCount = 0
    let pdfVersion: string | undefined
    let hasEncryption = false
    let canRepair = true

    if (onProgress) {
      onProgress(10, '正在读取文件...')
    }

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    if (onProgress) {
      onProgress(20, '正在检查PDF头部...')
    }

    // 检查PDF头部
    const headerCheck = this.checkPdfHeader(uint8Array)
    if (!headerCheck.valid) {
      issues.push({
        type: 'corrupted_header',
        severity: 'critical',
        description: headerCheck.error || 'PDF头部损坏或无效',
        repairable: headerCheck.repairable
      })
      if (!headerCheck.repairable) {
        canRepair = false
      }
    } else {
      pdfVersion = headerCheck.version
    }

    if (onProgress) {
      onProgress(40, '正在检查文件结构...')
    }

    // 检查文件尾部和交叉引用表
    const trailerCheck = this.checkTrailer(uint8Array)
    if (!trailerCheck.valid) {
      issues.push({
        type: 'missing_trailer',
        severity: 'high',
        description: trailerCheck.error || '文件尾部或交叉引用表损坏',
        repairable: true
      })
    }

    // 检查xref表
    const xrefCheck = this.checkXref(uint8Array)
    if (!xrefCheck.valid) {
      issues.push({
        type: 'invalid_xref',
        severity: 'high',
        description: xrefCheck.error || '交叉引用表无效',
        repairable: true
      })
    }

    if (onProgress) {
      onProgress(60, '正在尝试加载PDF...')
    }

    // 尝试使用pdf-lib加载
    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        updateMetadata: false
      })

      pageCount = pdfDoc.getPageCount()

      // 检查每个页面
      if (onProgress) {
        onProgress(70, '正在检查页面...')
      }

      for (let i = 0; i < pageCount; i++) {
        try {
          const page = pdfDoc.getPage(i)
          // 尝试获取页面尺寸来验证页面有效性
          page.getSize()
        } catch (pageError) {
          issues.push({
            type: 'missing_pages',
            severity: 'medium',
            description: `第 ${i + 1} 页可能损坏`,
            location: `页面 ${i + 1}`,
            repairable: true
          })
        }
      }
    } catch (loadError: any) {
      // 加载失败，检查具体原因
      const errorMessage = loadError.message || ''

      if (errorMessage.includes('encrypt')) {
        hasEncryption = true
        issues.push({
          type: 'encoding_error',
          severity: 'medium',
          description: 'PDF文件已加密，需要先解密',
          repairable: false
        })
      } else if (errorMessage.includes('stream')) {
        issues.push({
          type: 'invalid_stream',
          severity: 'high',
          description: '数据流损坏',
          repairable: true
        })
      } else {
        issues.push({
          type: 'damaged_objects',
          severity: 'high',
          description: `PDF对象损坏: ${errorMessage}`,
          repairable: true
        })
      }
    }

    if (onProgress) {
      onProgress(90, '正在生成诊断报告...')
    }

    // 生成摘要
    const isCorrupted = issues.length > 0
    const criticalIssues = issues.filter((i) => i.severity === 'critical')
    const unreparableIssues = issues.filter((i) => !i.repairable)

    let summary: string
    if (!isCorrupted) {
      summary = 'PDF文件结构完整，无需修复'
    } else if (criticalIssues.length > 0 || unreparableIssues.length > 0) {
      summary = `发现 ${issues.length} 个问题，其中 ${criticalIssues.length + unreparableIssues.length} 个无法修复`
      canRepair = unreparableIssues.length === 0
    } else {
      summary = `发现 ${issues.length} 个问题，可以尝试修复`
    }

    if (onProgress) {
      onProgress(100, '诊断完成')
    }

    return {
      isCorrupted,
      canRepair,
      issues,
      pageCount,
      fileSize: file.size,
      pdfVersion,
      hasEncryption,
      summary
    }
  }

  /**
   * 检查PDF头部
   */
  private checkPdfHeader(data: Uint8Array): {
    valid: boolean
    version?: string
    error?: string
    repairable: boolean
  } {
    // PDF文件应该以 %PDF- 开头
    const header = String.fromCharCode(...data.slice(0, 8))

    if (header.startsWith('%PDF-')) {
      const version = header.substring(5, 8)
      return { valid: true, version, repairable: true }
    }

    // 检查是否在前1024字节内有PDF签名（某些文件可能有前导数据）
    const searchRange = Math.min(data.length, 1024)
    const searchStr = String.fromCharCode(...data.slice(0, searchRange))
    const pdfIndex = searchStr.indexOf('%PDF-')

    if (pdfIndex !== -1) {
      const version = searchStr.substring(pdfIndex + 5, pdfIndex + 8)
      return {
        valid: false,
        version,
        error: `PDF头部位置异常（偏移 ${pdfIndex} 字节）`,
        repairable: true
      }
    }

    return {
      valid: false,
      error: '未找到有效的PDF头部签名',
      repairable: false
    }
  }

  /**
   * 检查文件尾部
   */
  private checkTrailer(data: Uint8Array): { valid: boolean; error?: string } {
    // 检查文件末尾是否有 %%EOF 标记
    const tailSize = Math.min(data.length, 1024)
    const tail = String.fromCharCode(...data.slice(-tailSize))

    if (tail.includes('%%EOF')) {
      return { valid: true }
    }

    return {
      valid: false,
      error: '未找到文件结束标记 (%%EOF)'
    }
  }

  /**
   * 检查交叉引用表
   */
  private checkXref(data: Uint8Array): { valid: boolean; error?: string } {
    const content = String.fromCharCode(...data.slice(0, Math.min(data.length, 100000)))

    // 检查是否有xref表或xref流
    if (content.includes('xref') || content.includes('/XRef')) {
      return { valid: true }
    }

    // 检查是否有startxref
    if (content.includes('startxref')) {
      return { valid: true }
    }

    return {
      valid: false,
      error: '未找到交叉引用表'
    }
  }

  /**
   * 修复PDF文件
   * 需求 2.1: 尝试恢复文件结构和内容
   * 需求 2.2: 提供可下载的修复后PDF文件
   * 需求 2.5: 尽可能保留原始内容
   */
  async repair(
    file: File,
    options: RepairOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<RepairResult>> {
    const repairLog: string[] = []
    const lostContent: string[] = []
    let recoveredPages = 0

    try {
      // 验证文件
      const validation = this.validate(file)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      if (onProgress) {
        onProgress(5, '正在诊断文件...')
      }

      // 先进行诊断
      const diagnosis = await this.diagnose(file)

      if (!diagnosis.isCorrupted) {
        repairLog.push('文件无损坏，无需修复')
        // 直接返回原文件
        const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' })
        return {
          success: true,
          data: {
            file: blob,
            repairLog,
            recoveredPages: diagnosis.pageCount,
            lostContent: [],
            originalSize: file.size,
            repairedSize: file.size
          }
        }
      }

      if (!diagnosis.canRepair) {
        return {
          success: false,
          error: '文件损坏严重，无法修复: ' + diagnosis.summary
        }
      }

      repairLog.push(`诊断发现 ${diagnosis.issues.length} 个问题`)
      diagnosis.issues.forEach((issue) => {
        repairLog.push(`- ${issue.description} (${this.getSeverityText(issue.severity)})`)
      })

      if (onProgress) {
        onProgress(20, '正在读取文件内容...')
      }

      const arrayBuffer = await file.arrayBuffer()

      if (onProgress) {
        onProgress(30, '正在尝试修复...')
      }

      // 尝试不同的修复策略
      let pdfDoc: PDFDocument | null = null
      let repairMethod = ''

      // 策略1: 使用ignoreEncryption和宽松模式加载
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true,
          updateMetadata: false
        })
        repairMethod = '标准修复'
        repairLog.push('使用标准模式成功加载PDF')
      } catch (e) {
        repairLog.push('标准模式加载失败，尝试其他方法...')
      }

      // 策略2: 尝试修复头部后加载
      if (!pdfDoc) {
        try {
          const repairedData = this.repairHeader(new Uint8Array(arrayBuffer))
          pdfDoc = await PDFDocument.load(new Uint8Array(repairedData), {
            ignoreEncryption: true,
            updateMetadata: false
          })
          repairMethod = '头部修复'
          repairLog.push('修复PDF头部后成功加载')
        } catch (e) {
          repairLog.push('头部修复后加载失败')
        }
      }

      // 策略3: 深度修复 - 尝试重建PDF结构
      if (!pdfDoc && options.repairLevel === 'deep') {
        if (onProgress) {
          onProgress(50, '正在进行深度修复...')
        }

        try {
          const rebuiltData = await this.rebuildPdfStructure(new Uint8Array(arrayBuffer))
          if (rebuiltData) {
            pdfDoc = await PDFDocument.load(new Uint8Array(rebuiltData), {
              ignoreEncryption: true,
              updateMetadata: false
            })
            repairMethod = '深度重建'
            repairLog.push('通过深度重建成功恢复PDF')
          }
        } catch (e) {
          repairLog.push('深度重建失败')
        }
      }

      if (!pdfDoc) {
        return {
          success: false,
          error: '无法修复此PDF文件，文件可能损坏过于严重'
        }
      }

      if (onProgress) {
        onProgress(70, '正在重建文档...')
      }

      // 创建新的PDF文档并复制内容
      const newPdfDoc = await PDFDocument.create()
      const pageCount = pdfDoc.getPageCount()

      for (let i = 0; i < pageCount; i++) {
        try {
          const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i])
          newPdfDoc.addPage(copiedPage)
          recoveredPages++
        } catch (pageError) {
          lostContent.push(`第 ${i + 1} 页无法恢复`)
          repairLog.push(`警告: 第 ${i + 1} 页复制失败`)
        }
      }

      if (recoveredPages === 0) {
        return {
          success: false,
          error: '无法恢复任何页面内容'
        }
      }

      if (onProgress) {
        onProgress(90, '正在保存修复后的文件...')
      }

      // 保存修复后的PDF
      const pdfBytes = await newPdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      repairLog.push(`修复完成，使用方法: ${repairMethod}`)
      repairLog.push(`成功恢复 ${recoveredPages}/${pageCount} 页`)

      if (onProgress) {
        onProgress(100, '修复完成')
      }

      return {
        success: true,
        data: {
          file: blob,
          repairLog,
          recoveredPages,
          lostContent,
          originalSize: file.size,
          repairedSize: pdfBytes.length
        },
        progress: 100
      }
    } catch (error) {
      console.error('PDF修复失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '修复失败，请重试'
      }
    }
  }

  /**
   * 修复PDF头部
   */
  private repairHeader(data: Uint8Array): Uint8Array {
    const header = String.fromCharCode(...data.slice(0, 1024))
    const pdfIndex = header.indexOf('%PDF-')

    if (pdfIndex > 0) {
      // 移除头部之前的垃圾数据
      return data.slice(pdfIndex)
    }

    if (pdfIndex === -1) {
      // 添加PDF头部
      const pdfHeader = new TextEncoder().encode('%PDF-1.4\n')
      const result = new Uint8Array(pdfHeader.length + data.length)
      result.set(pdfHeader, 0)
      result.set(data, pdfHeader.length)
      return result
    }

    return data
  }

  /**
   * 尝试重建PDF结构
   * 这是一个简化的实现，实际的PDF重建需要更复杂的解析
   */
  private async rebuildPdfStructure(data: Uint8Array): Promise<Uint8Array | null> {
    try {
      // 确保有正确的头部
      let repairedData = this.repairHeader(data)

      // 确保有正确的尾部
      const tail = String.fromCharCode(...repairedData.slice(-100))
      if (!tail.includes('%%EOF')) {
        const eofMarker = new TextEncoder().encode('\n%%EOF\n')
        const result = new Uint8Array(repairedData.length + eofMarker.length)
        result.set(repairedData, 0)
        result.set(eofMarker, repairedData.length)
        repairedData = result
      }

      return repairedData
    } catch (e) {
      return null
    }
  }

  /**
   * 获取严重程度文本
   */
  private getSeverityText(severity: IssueSeverity): string {
    const texts: Record<IssueSeverity, string> = {
      low: '轻微',
      medium: '中等',
      high: '严重',
      critical: '致命'
    }
    return texts[severity]
  }

  /**
   * 处理PDF修复
   * 统一的处理入口
   */
  async process(
    files: File[],
    options: RepairOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<RepairResult>> {
    if (!files || files.length === 0) {
      return {
        success: false,
        error: '请选择一个PDF文件'
      }
    }

    const file = files[0]
    return this.repair(file, options, onProgress)
  }
}

/**
 * 创建PDF修复处理器实例
 */
export function createRepairProcessor(): RepairProcessor {
  return new RepairProcessor()
}

/**
 * 默认修复选项
 */
export const defaultRepairOptions: RepairOptions = {
  repairLevel: 'light',
  preserveAnnotations: true
}
