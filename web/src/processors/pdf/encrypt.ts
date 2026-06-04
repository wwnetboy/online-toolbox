import { PDFDocument } from 'pdf-lib-plus-encrypt'

/**
 * PDF加密操作类型
 */
export type EncryptOperation = 'encrypt' | 'decrypt'

/**
 * PDF加密选项
 */
export interface PdfEncryptOptions {
  operation: EncryptOperation
  userPassword?: string // 打开密码
  ownerPassword?: string // 权限密码
  permissions?: {
    printing?: boolean
    modifying?: boolean
    copying?: boolean
    annotating?: boolean
  }
}

/**
 * PDF解密选项
 */
export interface PdfDecryptOptions {
  password: string // 解密密码
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
 * PDF加密处理器
 * 实现打开密码、权限密码、解密
 * 需求: 8.4, 8.5
 */
export class PdfEncryptProcessor {
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
   * 获取默认加密选项
   */
  getDefaultEncryptOptions(): PdfEncryptOptions {
    return {
      operation: 'encrypt',
      userPassword: '',
      ownerPassword: '',
      permissions: {
        printing: true,
        modifying: false,
        copying: false,
        annotating: false
      }
    }
  }

  /**
   * 加密PDF文件
   * 需求 8.4: 支持分别设置"打开密码"和"权限密码"
   */
  async encrypt(
    file: File,
    options: PdfEncryptOptions,
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

      // 验证密码
      if (!options.userPassword && !options.ownerPassword) {
        return {
          success: false,
          error: '请至少设置一个密码（打开密码或权限密码）'
        }
      }

      if (onProgress) {
        onProgress(10, '正在读取PDF文件...')
      }

      const arrayBuffer = await file.arrayBuffer()

      // 尝试加载PDF，检查是否已加密
      let pdfDoc: PDFDocument
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer)
      } catch {
        return {
          success: false,
          error: '无法加载PDF文件，文件可能已损坏或已加密'
        }
      }

      if (onProgress) {
        onProgress(50, '正在加密PDF...')
      }

      // 使用 pdf-lib-plus-encrypt 的加密功能
      const userPassword = options.userPassword || ''
      const ownerPassword = options.ownerPassword || options.userPassword || ''
      const permissions = options.permissions || {}

      // 设置加密选项
      await pdfDoc.encrypt({
        userPassword,
        ownerPassword,
        permissions: {
          printing: permissions.printing ? 'highResolution' : false,
          modifying: permissions.modifying,
          copying: permissions.copying,
          annotating: permissions.annotating,
          fillingForms: permissions.annotating,
          contentAccessibility: true,
          documentAssembly: permissions.modifying
        }
      })

      // 保存加密的PDF
      // 注意：必须设置 useObjectStreams: false，否则加密后的文件可能损坏
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false })

      if (onProgress) {
        onProgress(90, '正在生成文件...')
      }

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })

      if (onProgress) {
        onProgress(100, '加密完成')
      }

      return {
        success: true,
        data: blob,
        progress: 100
      }
    } catch (error) {
      console.error('PDF加密失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '加密失败，请重试'
      }
    }
  }

  /**
   * 解密PDF文件
   * 需求 8.5: 输入正确密码后移除PDF的密码保护
   */
  async decrypt(
    file: File,
    options: PdfDecryptOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<Blob>> {
    try {
      const validation = this.validate([file])
      if (!validation.valid) {
        return { success: false, error: validation.errors.join('; ') }
      }

      if (!options.password) {
        return { success: false, error: '请输入密码' }
      }

      if (onProgress) onProgress(10, '正在准备解密...')

      // Use backend API which uses pikepdf for proper decryption
      const formData = new FormData()
      formData.append('file', file)
      formData.append('password', options.password)

      if (onProgress) onProgress(30, '正在验证密码...')
      const response = await fetch('/api/pdf/decrypt', { method: 'POST', body: formData })

      if (!response.ok) {
        const result = await response.json().catch(() => ({ msg: '解密失败' }))
        if (response.status === 400) {
          return { success: false, error: result.msg || '密码错误，请重试' }
        }
        return { success: false, error: result.msg || '解密失败' }
      }

      if (onProgress) onProgress(80, '正在生成文件...')
      const blob = await response.blob()

      if (onProgress) onProgress(100, '解密完成')
      return { success: true, data: blob, progress: 100 }
    } catch (error) {
      console.error('PDF解密失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '解密失败，请重试' }
    }
  }

  /**
   * 处理PDF加密/解密
   * 需求 8.4: 设置PDF加密
   * 需求 8.5: 移除PDF密码保护
   */
  async process(
    files: File[],
    options: PdfEncryptOptions | PdfDecryptOptions,
    onProgress?: (progress: number, message: string) => void
  ): Promise<ProcessResult<Blob>> {
    const file = files[0]

    if ('operation' in options) {
      if (options.operation === 'encrypt') {
        return this.encrypt(file, options as PdfEncryptOptions, onProgress)
      } else {
        return this.decrypt(file, options as unknown as PdfDecryptOptions, onProgress)
      }
    } else {
      // 默认为解密操作
      return this.decrypt(file, options as PdfDecryptOptions, onProgress)
    }
  }

  /**
   * 检查PDF是否加密
   */
  async isEncrypted(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      await PDFDocument.load(arrayBuffer)
      return false
    } catch {
      // 如果加载失败，可能是加密的
      return true
    }
  }
}

/**
 * 创建PDF加密处理器实例
 */
export function createPdfEncryptProcessor(): PdfEncryptProcessor {
  return new PdfEncryptProcessor()
}
