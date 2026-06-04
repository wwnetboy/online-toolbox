/**
 * PDF内容编辑器
 * 实现文档加载、渲染和操作历史管理（撤销/重做）
 * 需求: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'
import type { ValidationResult, ProcessResult } from './types'

/**
 * 编辑操作类型
 */
export type EditOperationType =
  | 'add-text'
  | 'edit-text'
  | 'delete-text'
  | 'add-image'
  | 'delete-image'
  | 'add-shape'
  | 'add-annotation'

/**
 * 形状类型
 */
export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow'

/**
 * 批注类型
 */
export type AnnotationType = 'highlight' | 'underline' | 'strikethrough' | 'note'

/**
 * 文字编辑数据
 */
export interface TextEdit {
  id: string
  text: string
  x: number // 百分比 0-100
  y: number // 百分比 0-100
  fontSize: number // 字号
  color: string // 颜色 (hex)
  fontFamily?: string // 字体
  opacity?: number // 透明度 0-1
}

/**
 * 图片编辑数据
 */
export interface ImageEdit {
  id: string
  imageData: Blob | string // Blob或base64
  x: number // 百分比 0-100
  y: number // 百分比 0-100
  width: number // 百分比 0-100
  height: number // 百分比 0-100
  opacity?: number // 透明度 0-1
}

/**
 * 形状编辑数据
 */
export interface ShapeEdit {
  id: string
  type: ShapeType
  x: number // 百分比 0-100
  y: number // 百分比 0-100
  width: number // 百分比 0-100
  height: number // 百分比 0-100
  strokeColor: string // 边框颜色
  fillColor?: string // 填充颜色
  strokeWidth: number // 边框宽度
  opacity?: number // 透明度 0-1
}

/**
 * 批注编辑数据
 */
export interface AnnotationEdit {
  id: string
  type: AnnotationType
  x: number // 百分比 0-100
  y: number // 百分比 0-100
  width: number // 百分比 0-100
  height: number // 百分比 0-100
  color: string // 颜色
  text?: string // 批注文字（用于note类型）
  opacity?: number // 透明度 0-1
}

/**
 * 编辑操作
 */
export interface EditOperation {
  id: string
  type: EditOperationType
  pageIndex: number
  data: TextEdit | ImageEdit | ShapeEdit | AnnotationEdit
  timestamp: number
}

/**
 * 编辑器状态
 */
export interface EditorState {
  pdfDoc: PDFDocument | null
  pageCount: number
  currentPage: number
  operations: EditOperation[]
  undoStack: EditOperation[]
  redoStack: EditOperation[]
  isModified: boolean
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
 * 默认文字编辑选项
 */
export const defaultTextEdit: Omit<TextEdit, 'id' | 'text' | 'x' | 'y'> = {
  fontSize: 14,
  color: '#000000',
  fontFamily: 'Helvetica',
  opacity: 1
}

/**
 * 默认形状编辑选项
 */
export const defaultShapeEdit: Omit<ShapeEdit, 'id' | 'type' | 'x' | 'y' | 'width' | 'height'> = {
  strokeColor: '#000000',
  strokeWidth: 2,
  opacity: 1
}

/**
 * 默认批注编辑选项
 */
export const defaultAnnotationEdit: Omit<
  AnnotationEdit,
  'id' | 'type' | 'x' | 'y' | 'width' | 'height'
> = {
  color: '#FFFF00',
  opacity: 0.5
}

/**
 * 解析十六进制颜色
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '')
  return {
    r: parseInt(cleanHex.substring(0, 2), 16) / 255,
    g: parseInt(cleanHex.substring(2, 4), 16) / 255,
    b: parseInt(cleanHex.substring(4, 6), 16) / 255
  }
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * PDF内容编辑器类
 * 需求 16.1: 在可编辑视图中显示文档
 * 需求 16.5: 支持撤销/重做操作
 * 需求 16.6: 完全保留未编辑的内容
 */
export class PdfEditor {
  private state: EditorState = {
    pdfDoc: null,
    pageCount: 0,
    currentPage: 0,
    operations: [],
    undoStack: [],
    redoStack: [],
    isModified: false
  }

  private originalPdfBytes: Uint8Array | null = null
  private embeddedFonts: Map<string, PDFFont> = new Map()

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
   * 加载PDF文档
   * 需求 16.1: 在可编辑视图中显示文档
   */
  async load(file: File): Promise<EditorState> {
    const validation = this.validate(file)
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '))
    }

    const arrayBuffer = await file.arrayBuffer()
    this.originalPdfBytes = new Uint8Array(arrayBuffer)

    const pdfDoc = await PDFDocument.load(arrayBuffer)

    this.state = {
      pdfDoc,
      pageCount: pdfDoc.getPageCount(),
      currentPage: 0,
      operations: [],
      undoStack: [],
      redoStack: [],
      isModified: false
    }

    // 预嵌入常用字体
    await this.embedDefaultFonts(pdfDoc)

    return this.getState()
  }

  /**
   * 预嵌入默认字体
   */
  private async embedDefaultFonts(pdfDoc: PDFDocument): Promise<void> {
    const fonts = [
      { name: 'Helvetica', font: StandardFonts.Helvetica },
      { name: 'Helvetica-Bold', font: StandardFonts.HelveticaBold },
      { name: 'Times-Roman', font: StandardFonts.TimesRoman },
      { name: 'Courier', font: StandardFonts.Courier }
    ]

    for (const { name, font } of fonts) {
      const embeddedFont = await pdfDoc.embedFont(font)
      this.embeddedFonts.set(name, embeddedFont)
    }
  }

  /**
   * 获取当前状态
   */
  getState(): EditorState {
    return { ...this.state }
  }

  /**
   * 获取页面信息
   */
  getPageInfo(): PageInfo[] {
    if (!this.state.pdfDoc) return []

    const pages = this.state.pdfDoc.getPages()
    return pages.map((page, index) => {
      const { width, height } = page.getSize()
      return { index, width, height }
    })
  }

  /**
   * 获取指定页面信息
   */
  getPageInfoAt(pageIndex: number): PageInfo | null {
    if (!this.state.pdfDoc) return null

    const pages = this.state.pdfDoc.getPages()
    if (pageIndex < 0 || pageIndex >= pages.length) return null

    const page = pages[pageIndex]
    const { width, height } = page.getSize()
    return { index: pageIndex, width, height }
  }

  /**
   * 应用编辑操作
   * 需求 16.5: 支持撤销/重做操作
   */
  applyOperation(operation: Omit<EditOperation, 'id' | 'timestamp'>): EditOperation {
    const fullOperation: EditOperation = {
      ...operation,
      id: generateId(),
      timestamp: Date.now()
    }

    this.state.operations.push(fullOperation)
    this.state.undoStack.push(fullOperation)
    this.state.redoStack = [] // 清空重做栈
    this.state.isModified = true

    return fullOperation
  }

  /**
   * 撤销操作
   * 需求 16.5: 支持撤销/重做操作
   */
  undo(): EditOperation | null {
    if (this.state.undoStack.length === 0) return null

    const operation = this.state.undoStack.pop()!
    this.state.redoStack.push(operation)

    // 从operations中移除
    const index = this.state.operations.findIndex((op) => op.id === operation.id)
    if (index !== -1) {
      this.state.operations.splice(index, 1)
    }

    this.state.isModified = this.state.operations.length > 0

    return operation
  }

  /**
   * 重做操作
   * 需求 16.5: 支持撤销/重做操作
   */
  redo(): EditOperation | null {
    if (this.state.redoStack.length === 0) return null

    const operation = this.state.redoStack.pop()!
    this.state.undoStack.push(operation)
    this.state.operations.push(operation)
    this.state.isModified = true

    return operation
  }

  /**
   * 获取操作历史
   */
  getOperationHistory(): EditOperation[] {
    return [...this.state.operations]
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.state.undoStack.length > 0
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.state.redoStack.length > 0
  }

  /**
   * 添加文字
   * 需求 16.2: 允许添加、编辑和删除文字
   */
  addText(pageIndex: number, textData: Omit<TextEdit, 'id'>): EditOperation {
    const data: TextEdit = {
      ...textData,
      id: generateId()
    }

    return this.applyOperation({
      type: 'add-text',
      pageIndex,
      data
    })
  }

  /**
   * 编辑文字
   * 需求 16.2: 允许添加、编辑和删除文字
   */
  editText(operationId: string, updates: Partial<TextEdit>): boolean {
    const operation = this.state.operations.find(
      (op) => op.type === 'add-text' && op.data.id === operationId
    )

    if (!operation) return false

    Object.assign(operation.data, updates)
    this.state.isModified = true
    return true
  }

  /**
   * 删除文字
   * 需求 16.2: 允许添加、编辑和删除文字
   */
  deleteText(operationId: string): boolean {
    const index = this.state.operations.findIndex(
      (op) => op.type === 'add-text' && op.data.id === operationId
    )

    if (index === -1) return false

    const operation = this.state.operations[index]
    this.state.operations.splice(index, 1)

    // 从undoStack中也移除
    const undoIndex = this.state.undoStack.findIndex((op) => op.id === operation.id)
    if (undoIndex !== -1) {
      this.state.undoStack.splice(undoIndex, 1)
    }

    this.state.isModified = this.state.operations.length > 0
    return true
  }

  /**
   * 添加图片
   * 需求 16.3: 允许添加和移除图片
   */
  addImage(pageIndex: number, imageData: Omit<ImageEdit, 'id'>): EditOperation {
    const data: ImageEdit = {
      ...imageData,
      id: generateId()
    }

    return this.applyOperation({
      type: 'add-image',
      pageIndex,
      data
    })
  }

  /**
   * 删除图片
   * 需求 16.3: 允许添加和移除图片
   */
  deleteImage(operationId: string): boolean {
    const index = this.state.operations.findIndex(
      (op) => op.type === 'add-image' && op.data.id === operationId
    )

    if (index === -1) return false

    const operation = this.state.operations[index]
    this.state.operations.splice(index, 1)

    const undoIndex = this.state.undoStack.findIndex((op) => op.id === operation.id)
    if (undoIndex !== -1) {
      this.state.undoStack.splice(undoIndex, 1)
    }

    this.state.isModified = this.state.operations.length > 0
    return true
  }

  /**
   * 添加形状
   * 需求 16.4: 允许添加形状和批注
   */
  addShape(pageIndex: number, shapeData: Omit<ShapeEdit, 'id'>): EditOperation {
    const data: ShapeEdit = {
      ...shapeData,
      id: generateId()
    }

    return this.applyOperation({
      type: 'add-shape',
      pageIndex,
      data
    })
  }

  /**
   * 删除形状
   */
  deleteShape(operationId: string): boolean {
    const index = this.state.operations.findIndex(
      (op) => op.type === 'add-shape' && op.data.id === operationId
    )

    if (index === -1) return false

    const operation = this.state.operations[index]
    this.state.operations.splice(index, 1)

    const undoIndex = this.state.undoStack.findIndex((op) => op.id === operation.id)
    if (undoIndex !== -1) {
      this.state.undoStack.splice(undoIndex, 1)
    }

    this.state.isModified = this.state.operations.length > 0
    return true
  }

  /**
   * 添加批注
   * 需求 16.4: 允许添加形状和批注
   */
  addAnnotation(pageIndex: number, annotationData: Omit<AnnotationEdit, 'id'>): EditOperation {
    const data: AnnotationEdit = {
      ...annotationData,
      id: generateId()
    }

    return this.applyOperation({
      type: 'add-annotation',
      pageIndex,
      data
    })
  }

  /**
   * 删除批注
   */
  deleteAnnotation(operationId: string): boolean {
    const index = this.state.operations.findIndex(
      (op) => op.type === 'add-annotation' && op.data.id === operationId
    )

    if (index === -1) return false

    const operation = this.state.operations[index]
    this.state.operations.splice(index, 1)

    const undoIndex = this.state.undoStack.findIndex((op) => op.id === operation.id)
    if (undoIndex !== -1) {
      this.state.undoStack.splice(undoIndex, 1)
    }

    this.state.isModified = this.state.operations.length > 0
    return true
  }

  /**
   * 获取指定页面的所有操作
   */
  getPageOperations(pageIndex: number): EditOperation[] {
    return this.state.operations.filter((op) => op.pageIndex === pageIndex)
  }

  /**
   * 更新操作位置
   */
  updateOperationPosition(operationId: string, x: number, y: number): boolean {
    const operation = this.state.operations.find((op) => op.data.id === operationId)
    if (!operation) return false
    ;(operation.data as any).x = x
    ;(operation.data as any).y = y
    this.state.isModified = true
    return true
  }

  /**
   * 更新操作尺寸
   */
  updateOperationSize(operationId: string, width: number, height: number): boolean {
    const operation = this.state.operations.find((op) => op.data.id === operationId)
    if (!operation) return false

    if ('width' in operation.data && 'height' in operation.data) {
      ;(operation.data as any).width = width
      ;(operation.data as any).height = height
      this.state.isModified = true
      return true
    }
    return false
  }

  /**
   * 保存PDF文档
   * 需求 16.6: 完全保留未编辑的内容
   * 需求 16.7: 提供可下载的PDF文件
   */
  async save(
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<Blob>> {
    try {
      if (!this.state.pdfDoc || !this.originalPdfBytes) {
        return {
          success: false,
          error: '没有加载的PDF文档'
        }
      }

      if (onProgress) {
        onProgress(10, '正在准备保存...')
      }

      // 从原始字节重新加载以保留未编辑内容
      const pdfDoc = await PDFDocument.load(this.originalPdfBytes)

      // 重新嵌入字体
      const fonts = new Map<string, PDFFont>()
      fonts.set('Helvetica', await pdfDoc.embedFont(StandardFonts.Helvetica))
      fonts.set('Helvetica-Bold', await pdfDoc.embedFont(StandardFonts.HelveticaBold))
      fonts.set('Times-Roman', await pdfDoc.embedFont(StandardFonts.TimesRoman))
      fonts.set('Courier', await pdfDoc.embedFont(StandardFonts.Courier))

      const pages = pdfDoc.getPages()
      const totalOperations = this.state.operations.length

      if (onProgress) {
        onProgress(20, '正在应用编辑...')
      }

      // 按页面分组操作
      const operationsByPage = new Map<number, EditOperation[]>()
      for (const op of this.state.operations) {
        const pageOps = operationsByPage.get(op.pageIndex) || []
        pageOps.push(op)
        operationsByPage.set(op.pageIndex, pageOps)
      }

      // 应用所有操作到PDF
      let processedOps = 0
      for (const [pageIndex, operations] of operationsByPage) {
        if (pageIndex >= pages.length) continue
        const page = pages[pageIndex]
        const { width: pageWidth, height: pageHeight } = page.getSize()

        for (const operation of operations) {
          await this.applyOperationToPage(pdfDoc, page, operation, fonts, pageWidth, pageHeight)
          processedOps++

          if (onProgress && totalOperations > 0) {
            const progress = 20 + (processedOps / totalOperations) * 60
            onProgress(progress, `正在应用编辑 ${processedOps}/${totalOperations}...`)
          }
        }
      }

      if (onProgress) {
        onProgress(90, '正在保存文件...')
      }

      // 保存PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (onProgress) {
        onProgress(100, '保存完成')
      }

      return {
        success: true,
        data: blob,
        progress: 100
      }
    } catch (error) {
      console.error('PDF保存失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存失败，请重试'
      }
    }
  }

  /**
   * 将操作应用到页面
   */
  private async applyOperationToPage(
    pdfDoc: PDFDocument,
    page: PDFPage,
    operation: EditOperation,
    fonts: Map<string, PDFFont>,
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    switch (operation.type) {
      case 'add-text':
        await this.applyTextOperation(
          page,
          operation.data as TextEdit,
          fonts,
          pageWidth,
          pageHeight
        )
        break
      case 'add-image':
        await this.applyImageOperation(
          pdfDoc,
          page,
          operation.data as ImageEdit,
          pageWidth,
          pageHeight
        )
        break
      case 'add-shape':
        await this.applyShapeOperation(page, operation.data as ShapeEdit, pageWidth, pageHeight)
        break
      case 'add-annotation':
        await this.applyAnnotationOperation(
          page,
          operation.data as AnnotationEdit,
          pageWidth,
          pageHeight
        )
        break
    }
  }

  /**
   * 应用文字操作
   */
  private async applyTextOperation(
    page: PDFPage,
    data: TextEdit,
    fonts: Map<string, PDFFont>,
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const x = (data.x / 100) * pageWidth
    const y = (data.y / 100) * pageHeight
    const color = parseHexColor(data.color)

    // 获取字体
    let font = fonts.get(data.fontFamily || 'Helvetica')
    if (!font) {
      font = fonts.get('Helvetica')!
    }

    page.drawText(data.text, {
      x,
      y,
      size: data.fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity: data.opacity ?? 1
    })
  }

  /**
   * 应用图片操作
   */
  private async applyImageOperation(
    pdfDoc: PDFDocument,
    page: PDFPage,
    data: ImageEdit,
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const x = (data.x / 100) * pageWidth
    const y = (data.y / 100) * pageHeight
    const width = (data.width / 100) * pageWidth
    const height = (data.height / 100) * pageHeight

    let imageBytes: ArrayBuffer

    if (data.imageData instanceof Blob) {
      imageBytes = await data.imageData.arrayBuffer()
    } else if (typeof data.imageData === 'string') {
      // base64 data URL
      const base64Data = data.imageData.split(',')[1]
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      imageBytes = bytes.buffer
    } else {
      return
    }

    // 尝试嵌入图片
    let image
    try {
      image = await pdfDoc.embedPng(imageBytes)
    } catch {
      try {
        image = await pdfDoc.embedJpg(imageBytes)
      } catch {
        console.error('无法嵌入图片')
        return
      }
    }

    page.drawImage(image, {
      x,
      y,
      width,
      height,
      opacity: data.opacity ?? 1
    })
  }

  /**
   * 应用形状操作
   */
  private async applyShapeOperation(
    page: PDFPage,
    data: ShapeEdit,
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const x = (data.x / 100) * pageWidth
    const y = (data.y / 100) * pageHeight
    const width = (data.width / 100) * pageWidth
    const height = (data.height / 100) * pageHeight
    const strokeColor = parseHexColor(data.strokeColor)
    const fillColor = data.fillColor ? parseHexColor(data.fillColor) : null

    switch (data.type) {
      case 'rectangle':
        page.drawRectangle({
          x,
          y,
          width,
          height,
          borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          borderWidth: data.strokeWidth,
          color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
          opacity: data.opacity ?? 1
        })
        break

      case 'circle':
        // 使用椭圆近似圆形
        const centerX = x + width / 2
        const centerY = y + height / 2
        page.drawEllipse({
          x: centerX,
          y: centerY,
          xScale: width / 2,
          yScale: height / 2,
          borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          borderWidth: data.strokeWidth,
          color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
          opacity: data.opacity ?? 1
        })
        break

      case 'line':
        page.drawLine({
          start: { x, y },
          end: { x: x + width, y: y + height },
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          thickness: data.strokeWidth,
          opacity: data.opacity ?? 1
        })
        break

      case 'arrow':
        // 绘制带箭头的线
        const endX = x + width
        const endY = y + height

        // 主线
        page.drawLine({
          start: { x, y },
          end: { x: endX, y: endY },
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          thickness: data.strokeWidth,
          opacity: data.opacity ?? 1
        })

        // 箭头（简化版本）
        const arrowSize = Math.min(width, height) * 0.2
        const angle = Math.atan2(height, width)
        const arrowAngle = Math.PI / 6

        page.drawLine({
          start: { x: endX, y: endY },
          end: {
            x: endX - arrowSize * Math.cos(angle - arrowAngle),
            y: endY - arrowSize * Math.sin(angle - arrowAngle)
          },
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          thickness: data.strokeWidth,
          opacity: data.opacity ?? 1
        })

        page.drawLine({
          start: { x: endX, y: endY },
          end: {
            x: endX - arrowSize * Math.cos(angle + arrowAngle),
            y: endY - arrowSize * Math.sin(angle + arrowAngle)
          },
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          thickness: data.strokeWidth,
          opacity: data.opacity ?? 1
        })
        break
    }
  }

  /**
   * 应用批注操作
   */
  private async applyAnnotationOperation(
    page: PDFPage,
    data: AnnotationEdit,
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const x = (data.x / 100) * pageWidth
    const y = (data.y / 100) * pageHeight
    const width = (data.width / 100) * pageWidth
    const height = (data.height / 100) * pageHeight
    const color = parseHexColor(data.color)

    switch (data.type) {
      case 'highlight':
        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: rgb(color.r, color.g, color.b),
          opacity: data.opacity ?? 0.3
        })
        break

      case 'underline':
        page.drawLine({
          start: { x, y },
          end: { x: x + width, y },
          color: rgb(color.r, color.g, color.b),
          thickness: 2,
          opacity: data.opacity ?? 1
        })
        break

      case 'strikethrough':
        page.drawLine({
          start: { x, y: y + height / 2 },
          end: { x: x + width, y: y + height / 2 },
          color: rgb(color.r, color.g, color.b),
          thickness: 2,
          opacity: data.opacity ?? 1
        })
        break

      case 'note':
        // 绘制便签背景
        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: rgb(color.r, color.g, color.b),
          opacity: data.opacity ?? 0.8,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1
        })
        break
    }
  }

  /**
   * 重置编辑器
   */
  reset(): void {
    this.state = {
      pdfDoc: null,
      pageCount: 0,
      currentPage: 0,
      operations: [],
      undoStack: [],
      redoStack: [],
      isModified: false
    }
    this.originalPdfBytes = null
    this.embeddedFonts.clear()
  }

  /**
   * 清除所有操作
   */
  clearAllOperations(): void {
    this.state.operations = []
    this.state.undoStack = []
    this.state.redoStack = []
    this.state.isModified = false
  }

  /**
   * 检查是否有修改
   */
  isModified(): boolean {
    return this.state.isModified
  }

  /**
   * 获取操作数量
   */
  getOperationCount(): number {
    return this.state.operations.length
  }
}

/**
 * 创建PDF编辑器实例
 */
export function createPdfEditor(): PdfEditor {
  return new PdfEditor()
}
