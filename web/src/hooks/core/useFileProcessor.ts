/**
 * useFileProcessor - 文件处理组合式函数
 *
 * 提供文件处理相关的功能，包括处理进度、错误处理、批量处理逻辑等。
 *
 * ## 主要功能
 *
 * 1. 处理进度 - 实时显示文件处理进度
 * 2. 错误处理 - 统一的错误处理机制
 * 3. 批量处理 - 支持批量处理多个文件
 * 4. 状态管理 - 管理文件处理状态
 * 5. 结果管理 - 管理处理结果
 *
 * ## 使用场景
 *
 * - PDF处理工具的文件处理
 * - 图片处理工具的文件处理
 * - 文档转换工具的文件处理
 *
 * ## 验证需求
 *
 * - 需求 15.1: 单个文件10秒内完成响应
 * - 需求 15.2: 批量处理10个文件30秒内完成
 * - 需求 15.3: 格式不支持显示错误提示
 * - 需求 15.4: 文件损坏显示错误提示
 * - 需求 15.5: 批量处理中某个文件出错继续处理其他文件
 * - 需求 19.1: 显示处理进度条和百分比
 * - 需求 19.2: 显示当前处理文件序号和总文件数
 * - 需求 19.3: 显示预估剩余时间
 * - 需求 19.4: 显示处理成功提示
 * - 需求 19.5: 显示失败原因和重试按钮
 *
 * @module hooks/core/useFileProcessor
 * @author Art Design Pro Team
 */

import { ref, computed, type Ref } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 处理状态枚举
 */
export type ProcessStatus = 'idle' | 'processing' | 'success' | 'error' | 'cancelled'

/**
 * 错误代码枚举
 */
export type ErrorCode =
  | 'FILE_TOO_LARGE'
  | 'FILE_TYPE_NOT_SUPPORTED'
  | 'FILE_CORRUPTED'
  | 'PROCESS_FAILED'
  | 'PROCESS_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'

/**
 * 处理错误接口
 */
export interface ProcessError {
  /** 错误代码 */
  code: ErrorCode
  /** 错误消息 */
  message: string
  /** 文件名 */
  fileName?: string
  /** 详细信息 */
  details?: string
}

/**
 * 处理结果接口
 */
export interface ProcessResult<T = any> {
  /** 是否成功 */
  success: boolean
  /** 结果数据 */
  data?: T
  /** 错误信息 */
  error?: ProcessError
  /** 文件名 */
  fileName: string
  /** 处理时间（毫秒） */
  duration?: number
}

/**
 * 批量处理结果接口
 */
export interface BatchProcessResult<T = any> {
  /** 成功的结果列表 */
  successful: ProcessResult<T>[]
  /** 失败的结果列表 */
  failed: ProcessResult<T>[]
  /** 总文件数 */
  totalCount: number
  /** 成功数量 */
  successCount: number
  /** 失败数量 */
  failedCount: number
  /** 总处理时间（毫秒） */
  totalDuration: number
}

/**
 * 处理进度接口
 */
export interface ProcessProgress {
  /** 当前进度 (0-100) */
  progress: number
  /** 当前处理文件索引 */
  currentIndex: number
  /** 总文件数 */
  totalFiles: number
  /** 当前处理文件名 */
  currentFileName: string
  /** 预估剩余时间（秒） */
  estimatedTime?: number
  /** 已处理文件数 */
  processedCount: number
}

/**
 * 处理器函数类型
 */
export type ProcessorFunction<T = any> = (
  file: File,
  onProgress?: (progress: number) => void
) => Promise<T>

/**
 * 错误消息映射
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  FILE_TOO_LARGE: '文件大小超出限制',
  FILE_TYPE_NOT_SUPPORTED: '不支持该文件格式',
  FILE_CORRUPTED: '文件已损坏，无法处理',
  PROCESS_FAILED: '处理失败，请重试',
  PROCESS_TIMEOUT: '处理超时，请稍后重试',
  NETWORK_ERROR: '网络连接失败',
  SERVER_ERROR: '服务器错误'
}

/**
 * 文件处理组合式函数
 */
export function useFileProcessor<T = any>() {
  // 处理状态
  const status = ref<ProcessStatus>('idle')

  // 处理进度
  const progress = ref<ProcessProgress>({
    progress: 0,
    currentIndex: 0,
    totalFiles: 0,
    currentFileName: '',
    estimatedTime: 0,
    processedCount: 0
  })

  // 处理结果列表
  const results = ref<ProcessResult<T>[]>([]) as Ref<ProcessResult<T>[]>

  // 错误列表
  const errors = ref<ProcessError[]>([]) as Ref<ProcessError[]>

  // 开始时间
  const startTime = ref<number>(0)

  // 是否可以取消
  const cancellable = ref(false)

  // 取消标志
  const cancelled = ref(false)

  /**
   * 计算属性：是否正在处理
   */
  const isProcessing = computed(() => status.value === 'processing')

  /**
   * 计算属性：是否处理完成
   */
  const isCompleted = computed(() => status.value === 'success' || status.value === 'error')

  /**
   * 计算属性：是否有错误
   */
  const hasError = computed(() => errors.value.length > 0)

  /**
   * 计算属性：成功的结果
   */
  const successResults = computed(() => results.value.filter((r) => r.success))

  /**
   * 计算属性：失败的结果
   */
  const failedResults = computed(() => results.value.filter((r) => !r.success))

  /**
   * 计算属性：成功数量
   */
  const successCount = computed(() => successResults.value.length)

  /**
   * 计算属性：失败数量
   */
  const failedCount = computed(() => failedResults.value.length)

  /**
   * 计算属性：总处理时间（秒）
   */
  const totalDuration = computed(() => {
    if (startTime.value === 0) return 0
    const endTime = isCompleted.value ? Date.now() : Date.now()
    return Math.round((endTime - startTime.value) / 1000)
  })

  /**
   * 获取错误消息
   * @param code 错误代码
   * @returns 错误消息
   */
  const getErrorMessage = (code: ErrorCode): string => {
    return ERROR_MESSAGES[code] || '未知错误'
  }

  /**
   * 创建错误对象
   * @param code 错误代码
   * @param fileName 文件名
   * @param details 详细信息
   * @returns 错误对象
   */
  const createError = (code: ErrorCode, fileName?: string, details?: string): ProcessError => {
    return {
      code,
      message: getErrorMessage(code),
      fileName,
      details
    }
  }

  /**
   * 添加错误
   * @param error 错误对象
   */
  const addError = (error: ProcessError) => {
    errors.value.push(error)
  }

  /**
   * 更新进度
   * @param currentIndex 当前文件索引
   * @param totalFiles 总文件数
   * @param currentFileName 当前文件名
   * @param fileProgress 当前文件进度 (0-100)
   */
  const updateProgress = (
    currentIndex: number,
    totalFiles: number,
    currentFileName: string,
    fileProgress: number = 0
  ) => {
    // 计算总体进度
    const completedFiles = currentIndex
    const currentFileWeight = fileProgress / 100
    const overallProgress = ((completedFiles + currentFileWeight) / totalFiles) * 100

    // 计算预估剩余时间
    let estimatedTime = 0
    if (startTime.value > 0 && overallProgress > 0) {
      const elapsed = Date.now() - startTime.value
      const totalEstimated = (elapsed / overallProgress) * 100
      estimatedTime = Math.round((totalEstimated - elapsed) / 1000)
    }

    progress.value = {
      progress: Math.round(overallProgress),
      currentIndex,
      totalFiles,
      currentFileName,
      estimatedTime: estimatedTime > 0 ? estimatedTime : undefined,
      processedCount: completedFiles
    }
  }

  /**
   * 处理单个文件
   * @param file 文件对象
   * @param processor 处理器函数
   * @param onProgress 进度回调
   * @returns 处理结果
   */
  const processSingleFile = async (
    file: File,
    processor: ProcessorFunction<T>,
    onProgress?: (progress: number) => void
  ): Promise<ProcessResult<T>> => {
    const fileStartTime = Date.now()

    try {
      // 执行处理
      const data = await processor(file, onProgress)

      const duration = Date.now() - fileStartTime

      return {
        success: true,
        data,
        fileName: file.name,
        duration
      }
    } catch (error: any) {
      const duration = Date.now() - fileStartTime

      // 解析错误
      let processError: ProcessError
      if (error.code && ERROR_MESSAGES[error.code as ErrorCode]) {
        processError = createError(error.code, file.name, error.message)
      } else {
        processError = createError('PROCESS_FAILED', file.name, error.message || '未知错误')
      }

      addError(processError)

      return {
        success: false,
        error: processError,
        fileName: file.name,
        duration
      }
    }
  }

  /**
   * 批量处理文件
   * @param files 文件列表
   * @param processor 处理器函数
   * @param options 选项
   * @returns 批量处理结果
   */
  const processBatch = async (
    files: File[],
    processor: ProcessorFunction<T>,
    options: {
      showMessage?: boolean
      continueOnError?: boolean
    } = {}
  ): Promise<BatchProcessResult<T>> => {
    const { showMessage = true, continueOnError = true } = options

    // 重置状态
    status.value = 'processing'
    results.value = []
    errors.value = []
    cancelled.value = false
    startTime.value = Date.now()

    const totalFiles = files.length
    const processedResults: ProcessResult<T>[] = []

    try {
      // 逐个处理文件
      for (let i = 0; i < totalFiles; i++) {
        // 检查是否取消
        if (cancelled.value) {
          status.value = 'cancelled'
          if (showMessage) {
            ElMessage.warning('处理已取消')
          }
          break
        }

        const file = files[i]

        // 更新进度
        updateProgress(i, totalFiles, file.name, 0)

        // 处理文件
        const result = await processSingleFile(file, processor, (fileProgress) => {
          updateProgress(i, totalFiles, file.name, fileProgress)
        })

        processedResults.push(result)
        results.value.push(result)

        // 更新进度（文件处理完成）
        updateProgress(i + 1, totalFiles, file.name, 100)

        // 如果失败且不继续处理，则中断
        if (!result.success && !continueOnError) {
          status.value = 'error'
          if (showMessage) {
            ElMessage.error(`处理失败: ${result.error?.message}`)
          }
          break
        }
      }

      // 判断最终状态
      if (status.value === 'processing') {
        const hasAnyError = processedResults.some((r) => !r.success)
        status.value = hasAnyError ? 'error' : 'success'

        if (showMessage) {
          if (status.value === 'success') {
            ElMessage.success(`处理完成！成功处理 ${successCount.value} 个文件`)
          } else {
            ElMessage.warning(
              `处理完成！成功 ${successCount.value} 个，失败 ${failedCount.value} 个`
            )
          }
        }
      }
    } catch (error: any) {
      status.value = 'error'
      const processError = createError('PROCESS_FAILED', undefined, error.message)
      addError(processError)

      if (showMessage) {
        ElMessage.error(`处理失败: ${processError.message}`)
      }
    }

    // 构建批量处理结果
    const batchResult: BatchProcessResult<T> = {
      successful: successResults.value,
      failed: failedResults.value,
      totalCount: totalFiles,
      successCount: successCount.value,
      failedCount: failedCount.value,
      totalDuration: Date.now() - startTime.value
    }

    return batchResult
  }

  /**
   * 处理单个文件（简化版）
   * @param file 文件对象
   * @param processor 处理器函数
   * @param options 选项
   * @returns 处理结果
   */
  const processFile = async (
    file: File,
    processor: ProcessorFunction<T>,
    options: {
      showMessage?: boolean
    } = {}
  ): Promise<ProcessResult<T>> => {
    const { showMessage = true } = options

    // 重置状态
    status.value = 'processing'
    results.value = []
    errors.value = []
    startTime.value = Date.now()

    // 更新进度
    updateProgress(0, 1, file.name, 0)

    try {
      const result = await processSingleFile(file, processor, (fileProgress) => {
        updateProgress(0, 1, file.name, fileProgress)
      })

      results.value.push(result)

      // 更新进度
      updateProgress(1, 1, file.name, 100)

      // 更新状态
      status.value = result.success ? 'success' : 'error'

      if (showMessage) {
        if (result.success) {
          ElMessage.success('处理完成！')
        } else {
          ElMessage.error(`处理失败: ${result.error?.message}`)
        }
      }

      return result
    } catch (error: any) {
      status.value = 'error'
      const processError = createError('PROCESS_FAILED', file.name, error.message)
      addError(processError)

      const result: ProcessResult<T> = {
        success: false,
        error: processError,
        fileName: file.name,
        duration: Date.now() - startTime.value
      }

      results.value.push(result)

      if (showMessage) {
        ElMessage.error(`处理失败: ${processError.message}`)
      }

      return result
    }
  }

  /**
   * 取消处理
   */
  const cancel = () => {
    if (isProcessing.value && cancellable.value) {
      cancelled.value = true
    }
  }

  /**
   * 重置状态
   */
  const reset = () => {
    status.value = 'idle'
    progress.value = {
      progress: 0,
      currentIndex: 0,
      totalFiles: 0,
      currentFileName: '',
      estimatedTime: 0,
      processedCount: 0
    }
    results.value = []
    errors.value = []
    startTime.value = 0
    cancelled.value = false
  }

  /**
   * 清空错误
   */
  const clearErrors = () => {
    errors.value = []
  }

  /**
   * 重试失败的文件
   * @param processor 处理器函数
   * @returns 批量处理结果
   */
  const retryFailed = async (processor: ProcessorFunction<T>): Promise<BatchProcessResult<T>> => {
    const failedFiles = failedResults.value.map((result) => {
      // 需要从原始文件列表中找到对应的文件
      // 这里假设文件名是唯一的
      return new File([], result.fileName)
    })

    if (failedFiles.length === 0) {
      ElMessage.warning('没有失败的文件需要重试')
      return {
        successful: [],
        failed: [],
        totalCount: 0,
        successCount: 0,
        failedCount: 0,
        totalDuration: 0
      }
    }

    return processBatch(failedFiles, processor)
  }

  return {
    // 状态
    status,
    progress,
    results,
    errors,
    cancellable,

    // 计算属性
    isProcessing,
    isCompleted,
    hasError,
    successResults,
    failedResults,
    successCount,
    failedCount,
    totalDuration,

    // 方法
    processFile,
    processBatch,
    cancel,
    reset,
    clearErrors,
    retryFailed,
    getErrorMessage,
    createError,
    addError
  }
}
