/**
 * 图片处理器共享类型定义
 */

/**
 * 处理结果接口
 */
export interface ProcessResult<T> {
  success: boolean
  data?: T
  error?: string
}
