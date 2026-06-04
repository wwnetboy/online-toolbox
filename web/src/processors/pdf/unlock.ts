/**
 * PDF解锁处理器
 * 通过后端 pikepdf 移除PDF文件的密码保护
 */
import { PDFDocument } from 'pdf-lib'

/**
 * 加密状态信息
 */
export interface EncryptionInfo {
  isEncrypted: boolean
  hasUserPassword: boolean
  hasOwnerPassword: boolean
}

/**
 * 解锁选项
 */
export interface UnlockOptions {
  password: string
}

/**
 * 处理结果
 */
export interface UnlockResult {
  success: boolean
  data?: Blob
  error?: string
}

/**
 * 默认解锁选项
 */
export const defaultUnlockOptions: UnlockOptions = {
  password: '',
}

/**
 * PDF解锁处理器
 */
export class UnlockProcessor {
  /**
   * 获取PDF文件的加密状态
   */
  async getEncryptionInfo(file: File): Promise<EncryptionInfo> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      await PDFDocument.load(arrayBuffer)
      return {
        isEncrypted: false,
        hasUserPassword: false,
        hasOwnerPassword: false,
      }
    } catch {
      // PDFDocument.load 失败，文件可能是加密的
      return {
        isEncrypted: true,
        hasUserPassword: true,
        hasOwnerPassword: false,
      }
    }
  }

  /**
   * 解锁PDF（通过后端 pikepdf 服务）
   */
  async unlock(
    file: File,
    options: UnlockOptions,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<UnlockResult> {
    try {
      if (!options.password) {
        return { success: false, error: '请输入密码' }
      }

      if (onProgress) onProgress(10, '正在准备解密...')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('password', options.password)

      if (onProgress) onProgress(30, '正在验证密码...')
      const response = await fetch('/api/pdf/decrypt', {
        method: 'POST',
        body: formData,
      })

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
      return { success: true, data: blob }
    } catch (error) {
      console.error('PDF解锁失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '解锁失败，请重试',
      }
    }
  }
}

/**
 * 创建PDF解锁处理器实例
 */
export function createUnlockProcessor(): UnlockProcessor {
  return new UnlockProcessor()
}
