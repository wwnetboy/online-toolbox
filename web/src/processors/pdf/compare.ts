import { PDFDocument } from 'pdf-lib'
import { pdfjsLib, getDocumentOptions } from '@/utils/pdfjs-config'
import type { ValidationResult, ProcessResult } from './types'

/**
 * 变更类型
 */
export type ChangeType = 'addition' | 'deletion' | 'modification'

/**
 * 内容类型
 */
export type ContentType = 'text' | 'image'

/**
 * 单个变更
 */
export interface Change {
  id: string
  pageIndex: number
  type: ContentType
  changeType: ChangeType
  content: string
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * 布局变更
 */
export interface LayoutChange {
  id: string
  pageIndex: number
  description: string
  type: 'page_size' | 'page_count' | 'image_position'
}

/**
 * 比较结果
 */
export interface ComparisonResult {
  totalChanges: number
  additions: Change[]
  deletions: Change[]
  modifications: Change[]
  layoutChanges: LayoutChange[]
  file1PageCount: number
  file2PageCount: number
}

/**
 * 高亮信息
 */
export interface Highlight {
  id: string
  pageIndex: number
  changeType: ChangeType
  x: number
  y: number
  width: number
  height: number
}

/**
 * 并排视图结果
 */
export interface SideBySideView {
  left: string
  right: string
  highlights: Highlight[]
}

/**
 * 页面文字信息
 */
interface PageTextInfo {
  pageIndex: number
  items: TextItem[]
  fullText: string
}

/**
 * 文字项
 */
interface TextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `compare-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 计算两个字符串的差异
 * 使用简单的逐行比较算法
 */
function computeTextDiff(
  text1: string,
  text2: string
): { additions: string[]; deletions: string[]; modifications: string[] } {
  const lines1 = text1.split('\n').filter((l) => l.trim())
  const lines2 = text2.split('\n').filter((l) => l.trim())

  const set1 = new Set(lines1)
  const set2 = new Set(lines2)

  const additions: string[] = []
  const deletions: string[] = []
  const modifications: string[] = []

  // 找出删除的内容（在text1中但不在text2中）
  for (const line of lines1) {
    if (!set2.has(line)) {
      // 检查是否是修改（相似但不完全相同）
      const similar = lines2.find((l2) => isSimilar(line, l2))
      if (similar) {
        modifications.push(line)
      } else {
        deletions.push(line)
      }
    }
  }

  // 找出添加的内容（在text2中但不在text1中）
  for (const line of lines2) {
    if (!set1.has(line)) {
      const similar = lines1.find((l1) => isSimilar(line, l1))
      if (!similar) {
        additions.push(line)
      }
    }
  }

  return { additions, deletions, modifications }
}

/**
 * 检查两个字符串是否相似（用于检测修改）
 */
function isSimilar(str1: string, str2: string): boolean {
  if (str1 === str2) return true

  // 计算Levenshtein距离的简化版本
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return true

  let commonChars = 0
  const chars1 = str1.toLowerCase().split('')
  const chars2 = str2.toLowerCase().split('')

  for (const char of chars1) {
    const idx = chars2.indexOf(char)
    if (idx !== -1) {
      commonChars++
      chars2.splice(idx, 1)
    }
  }

  const similarity = commonChars / maxLen
  return similarity > 0.6 // 60%以上相似度认为是修改
}

/**
 * PDF比较处理器
 * 实现文字提取和比较、差异高亮、报告生成
 * 需求: 20.1, 20.2, 20.3, 20.5
 */
export class CompareProcessor {
  /**
   * 验证单个文件
   */
  async validateFile(file: File): Promise<ValidationResult> {
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

    // 检查文件是否为空
    if (file.size === 0) {
      errors.push('文件为空')
    }

    // 尝试读取文件头部验证是否为有效的PDF
    if (errors.length === 0) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        
        // 检查PDF文件头 (%PDF-)
        if (bytes.length < 5) {
          errors.push('文件太小，不是有效的PDF文件')
        } else {
          const header = String.fromCharCode(...bytes.slice(0, 5))
          if (header !== '%PDF-') {
            errors.push('文件格式错误，不是有效的PDF文件')
          }
        }
        
        // 尝试用pdf-lib加载验证
        try {
          await PDFDocument.load(arrayBuffer, { ignoreEncryption: false })
        } catch (e: any) {
          if (e.message?.includes('encrypted')) {
            errors.push('PDF文件已加密，请先解密')
          } else {
            errors.push('PDF文件结构无效或已损坏')
          }
        }
      } catch {
        errors.push('无法读取文件')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证两个文件
   */
  async validate(file1: File, file2: File): Promise<ValidationResult> {
    const errors: string[] = []

    const validation1 = await this.validateFile(file1)
    if (!validation1.valid) {
      errors.push(`文件1: ${validation1.errors.join('; ')}`)
    }

    const validation2 = await this.validateFile(file2)
    if (!validation2.valid) {
      errors.push(`文件2: ${validation2.errors.join('; ')}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 提取PDF页面文字
   */
  private async extractPageText(pdfDoc: any, pageNum: number): Promise<PageTextInfo> {
    const page = await pdfDoc.getPage(pageNum)
    const textContent = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })
    const pageWidth = viewport.width
    const pageHeight = viewport.height

    const items: TextItem[] = []
    let fullText = ''

    for (const item of textContent.items) {
      if ('str' in item && item.str) {
        const text = item.str
        fullText += text + ' '

        if ('transform' in item) {
          const transform = item.transform as number[]
          const x = (transform[4] / pageWidth) * 100
          const y = ((pageHeight - transform[5]) / pageHeight) * 100
          const width = ((item.width || 50) / pageWidth) * 100
          const height = ((item.height || 12) / pageHeight) * 100

          items.push({ text, x, y, width, height })
        }
      }
    }

    return {
      pageIndex: pageNum - 1,
      items,
      fullText: fullText.trim()
    }
  }

  /**
   * 提取整个PDF的文字
   */
  private async extractAllText(file: File): Promise<PageTextInfo[]> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      
      // 尝试加载PDF文档，添加更详细的错误处理
      const loadingTask = pdfjsLib.getDocument({
        ...getDocumentOptions(arrayBuffer),
        isEvalSupported: false,
        useSystemFonts: true
      })
      
      const pdfDoc = await loadingTask.promise
      const numPages = pdfDoc.numPages
      
      if (numPages === 0) {
        throw new Error('PDF文件没有页面')
      }
      
      const pages: PageTextInfo[] = []

      for (let i = 1; i <= numPages; i++) {
        const pageInfo = await this.extractPageText(pdfDoc, i)
        pages.push(pageInfo)
      }

      return pages
    } catch (error: any) {
      // 提供更友好的错误信息
      if (error.name === 'InvalidPDFException') {
        throw new Error('PDF文件结构无效，可能已损坏或不是有效的PDF文件')
      } else if (error.name === 'PasswordException') {
        throw new Error('PDF文件已加密，请先解密后再比较')
      } else if (error.name === 'MissingPDFException') {
        throw new Error('无法读取PDF文件')
      } else {
        throw new Error(`读取PDF失败: ${error.message || '未知错误'}`)
      }
    }
  }

  /**
   * 获取PDF页数
   */
  async getPageCount(file: File): Promise<number> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: false
      })
      return pdfDoc.getPageCount()
    } catch (error: any) {
      if (error.message?.includes('encrypted')) {
        throw new Error('PDF文件已加密，无法读取')
      }
      throw new Error('无法读取PDF文件，文件可能已损坏')
    }
  }

  /**
   * 比较两个PDF文件
   * 需求 20.1: 比较两个PDF文件并高亮显示差异
   * 需求 20.2: 检测文字的添加、删除和修改
   * 需求 20.3: 检测图片和布局变化
   */
  async compare(
    file1: File,
    file2: File,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<ComparisonResult>> {
    try {
      // 验证文件
      if (onProgress) {
        onProgress(5, '正在验证文件...')
      }
      
      const validation = await this.validate(file1, file2)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        }
      }

      if (onProgress) {
        onProgress(10, '正在读取第一个PDF文件...')
      }

      // 提取两个文件的文字
      const pages1 = await this.extractAllText(file1)

      if (onProgress) {
        onProgress(30, '正在读取第二个PDF文件...')
      }

      const pages2 = await this.extractAllText(file2)

      if (onProgress) {
        onProgress(50, '正在比较文档内容...')
      }

      const additions: Change[] = []
      const deletions: Change[] = []
      const modifications: Change[] = []
      const layoutChanges: LayoutChange[] = []

      // 检测页数变化
      if (pages1.length !== pages2.length) {
        layoutChanges.push({
          id: generateId(),
          pageIndex: -1,
          description: `页数变化: ${pages1.length} → ${pages2.length}`,
          type: 'page_count'
        })
      }

      // 逐页比较
      const maxPages = Math.max(pages1.length, pages2.length)

      for (let i = 0; i < maxPages; i++) {
        if (onProgress) {
          const progress = 50 + (i / maxPages) * 40
          onProgress(progress, `正在比较第 ${i + 1} 页...`)
        }

        const page1 = pages1[i]
        const page2 = pages2[i]

        if (!page1 && page2) {
          // 新增页面
          for (const item of page2.items) {
            additions.push({
              id: generateId(),
              pageIndex: i,
              type: 'text',
              changeType: 'addition',
              content: item.text,
              boundingBox: {
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height
              }
            })
          }
          continue
        }

        if (page1 && !page2) {
          // 删除页面
          for (const item of page1.items) {
            deletions.push({
              id: generateId(),
              pageIndex: i,
              type: 'text',
              changeType: 'deletion',
              content: item.text,
              boundingBox: {
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height
              }
            })
          }
          continue
        }

        // 比较同一页的内容
        const diff = computeTextDiff(page1.fullText, page2.fullText)

        // 处理删除
        for (const text of diff.deletions) {
          const item = page1.items.find((it) => it.text.includes(text.substring(0, 20)))
          deletions.push({
            id: generateId(),
            pageIndex: i,
            type: 'text',
            changeType: 'deletion',
            content: text,
            boundingBox: item
              ? {
                  x: item.x,
                  y: item.y,
                  width: item.width,
                  height: item.height
                }
              : { x: 0, y: 0, width: 100, height: 5 }
          })
        }

        // 处理添加
        for (const text of diff.additions) {
          const item = page2.items.find((it) => it.text.includes(text.substring(0, 20)))
          additions.push({
            id: generateId(),
            pageIndex: i,
            type: 'text',
            changeType: 'addition',
            content: text,
            boundingBox: item
              ? {
                  x: item.x,
                  y: item.y,
                  width: item.width,
                  height: item.height
                }
              : { x: 0, y: 0, width: 100, height: 5 }
          })
        }

        // 处理修改
        for (const text of diff.modifications) {
          const item = page1.items.find((it) => it.text.includes(text.substring(0, 20)))
          modifications.push({
            id: generateId(),
            pageIndex: i,
            type: 'text',
            changeType: 'modification',
            content: text,
            boundingBox: item
              ? {
                  x: item.x,
                  y: item.y,
                  width: item.width,
                  height: item.height
                }
              : { x: 0, y: 0, width: 100, height: 5 }
          })
        }
      }

      if (onProgress) {
        onProgress(100, '比较完成')
      }

      const result: ComparisonResult = {
        totalChanges: additions.length + deletions.length + modifications.length,
        additions,
        deletions,
        modifications,
        layoutChanges,
        file1PageCount: pages1.length,
        file2PageCount: pages2.length
      }

      return {
        success: true,
        data: result,
        progress: 100
      }
    } catch (error) {
      console.error('PDF比较失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF比较失败，请重试'
      }
    }
  }

  /**
   * 生成比较报告
   * 需求 20.5: 生成汇总所有变化的差异报告
   */
  async generateReport(result: ComparisonResult): Promise<Blob> {
    const lines: string[] = []

    lines.push('# PDF文档比较报告')
    lines.push('')
    lines.push(`生成时间: ${new Date().toLocaleString()}`)
    lines.push('')
    lines.push('## 概要')
    lines.push('')
    lines.push(`- 文件1页数: ${result.file1PageCount}`)
    lines.push(`- 文件2页数: ${result.file2PageCount}`)
    lines.push(`- 总变更数: ${result.totalChanges}`)
    lines.push(`  - 新增: ${result.additions.length}`)
    lines.push(`  - 删除: ${result.deletions.length}`)
    lines.push(`  - 修改: ${result.modifications.length}`)
    lines.push('')

    if (result.layoutChanges.length > 0) {
      lines.push('## 布局变化')
      lines.push('')
      for (const change of result.layoutChanges) {
        lines.push(`- ${change.description}`)
      }
      lines.push('')
    }

    if (result.additions.length > 0) {
      lines.push('## 新增内容')
      lines.push('')
      for (const change of result.additions) {
        lines.push(`### 第 ${change.pageIndex + 1} 页`)
        lines.push(`- 类型: ${change.type === 'text' ? '文字' : '图片'}`)
        lines.push(
          `- 内容: ${change.content.substring(0, 100)}${change.content.length > 100 ? '...' : ''}`
        )
        lines.push('')
      }
    }

    if (result.deletions.length > 0) {
      lines.push('## 删除内容')
      lines.push('')
      for (const change of result.deletions) {
        lines.push(`### 第 ${change.pageIndex + 1} 页`)
        lines.push(`- 类型: ${change.type === 'text' ? '文字' : '图片'}`)
        lines.push(
          `- 内容: ${change.content.substring(0, 100)}${change.content.length > 100 ? '...' : ''}`
        )
        lines.push('')
      }
    }

    if (result.modifications.length > 0) {
      lines.push('## 修改内容')
      lines.push('')
      for (const change of result.modifications) {
        lines.push(`### 第 ${change.pageIndex + 1} 页`)
        lines.push(`- 类型: ${change.type === 'text' ? '文字' : '图片'}`)
        lines.push(
          `- 内容: ${change.content.substring(0, 100)}${change.content.length > 100 ? '...' : ''}`
        )
        lines.push('')
      }
    }

    const reportText = lines.join('\n')
    return new Blob([reportText], { type: 'text/markdown;charset=utf-8' })
  }

  /**
   * 获取并排比较视图
   * 需求 20.4: 显示并排比较视图
   */
  async getSideBySideView(
    file1: File,
    file2: File,
    pageIndex: number,
    comparisonResult?: ComparisonResult
  ): Promise<SideBySideView> {
    const renderPage = async (file: File, pageNum: number): Promise<string> => {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({
          ...getDocumentOptions(arrayBuffer),
          isEvalSupported: false,
          useSystemFonts: true
        })
        
        const pdfDoc = await loadingTask.promise

        if (pageNum > pdfDoc.numPages) {
          // 返回空白页面
          const canvas = document.createElement('canvas')
          canvas.width = 595
          canvas.height = 842
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#f5f5f5'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = '#999'
            ctx.font = '16px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('页面不存在', canvas.width / 2, canvas.height / 2)
          }
          return canvas.toDataURL('image/png')
        }

        const page = await pdfDoc.getPage(pageNum)
        const scale = 1.5
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('无法创建Canvas上下文')
        }

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas
        } as any).promise

        return canvas.toDataURL('image/png')
      } catch (error: any) {
        console.error('渲染页面失败:', error)
        
        // 返回错误提示页面
        const canvas = document.createElement('canvas')
        canvas.width = 595
        canvas.height = 842
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#f56c6c'
          ctx.font = '14px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('页面渲染失败', canvas.width / 2, canvas.height / 2 - 10)
          ctx.fillStyle = '#999'
          ctx.font = '12px sans-serif'
          ctx.fillText(error.message || '未知错误', canvas.width / 2, canvas.height / 2 + 10)
        }
        return canvas.toDataURL('image/png')
      }
    }

    // 渲染两个页面
    const [left, right] = await Promise.all([
      renderPage(file1, pageIndex + 1),
      renderPage(file2, pageIndex + 1)
    ])

    // 生成高亮信息
    const highlights: Highlight[] = []

    if (comparisonResult) {
      // 添加删除高亮（在左侧）
      for (const change of comparisonResult.deletions) {
        if (change.pageIndex === pageIndex) {
          highlights.push({
            id: change.id,
            pageIndex: change.pageIndex,
            changeType: 'deletion',
            x: change.boundingBox.x,
            y: change.boundingBox.y,
            width: change.boundingBox.width,
            height: change.boundingBox.height
          })
        }
      }

      // 添加新增高亮（在右侧）
      for (const change of comparisonResult.additions) {
        if (change.pageIndex === pageIndex) {
          highlights.push({
            id: change.id,
            pageIndex: change.pageIndex,
            changeType: 'addition',
            x: change.boundingBox.x,
            y: change.boundingBox.y,
            width: change.boundingBox.width,
            height: change.boundingBox.height
          })
        }
      }

      // 添加修改高亮
      for (const change of comparisonResult.modifications) {
        if (change.pageIndex === pageIndex) {
          highlights.push({
            id: change.id,
            pageIndex: change.pageIndex,
            changeType: 'modification',
            x: change.boundingBox.x,
            y: change.boundingBox.y,
            width: change.boundingBox.width,
            height: change.boundingBox.height
          })
        }
      }
    }

    return { left, right, highlights }
  }
}

/**
 * 创建PDF比较处理器实例
 */
export function createCompareProcessor(): CompareProcessor {
  return new CompareProcessor()
}
