/**
 * 工具处理器 Composable
 * 统一管理工具的处理流程：权限检查 -> 处理 -> 记录使用 -> 下载
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { usePermissionGuard } from './usePermissionGuard'
import { useFileDownload } from './useFileDownload'
import type { ProcessResult } from './useFileProcessor'

export interface IProcessor<TOptions = any, TResult = any> {
  /** 验证文件 */
  validate(files: File[]): { valid: boolean; errors: string[] }
  /** 处理文件 */
  process(
    files: File[],
    options: TOptions,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<ProcessResult<TResult>>
}

export interface UseToolProcessorOptions {
  /** 功能标识 */
  featureId: string
  /** 功能名称 */
  featureName: string
  /** 是否自动记录使用 */
  autoRecord?: boolean
  /** 处理成功提示 */
  successMessage?: string
  /** 处理失败提示 */
  errorMessage?: string
  /** 是否显示错误消息弹窗 */
  showErrorMessage?: boolean
}

export function useToolProcessor<TOptions = any, TResult = any>(
  processor: IProcessor<TOptions, TResult>,
  options: UseToolProcessorOptions
) {
  const {
    featureId,
    featureName,
    autoRecord = true,
    successMessage = '处理完成！',
    errorMessage = '处理失败',
    showErrorMessage = true
  } = options

  // 权限管理
  const { permissionGuardRef, checkBeforeAction, recordUsage, executeWithPermission } =
    usePermissionGuard({
      featureId,
      featureName,
      autoRecord: false // 手动控制记录时机
    })

  // 文件下载
  const { downloadFile, downloadMultipleFiles } = useFileDownload()

  // 处理状态
  const isProcessing = ref(false)
  const progress = ref({
    progress: 0,
    currentIndex: 0,
    totalFiles: 1,
    currentFileName: '',
    processedCount: 0
  })
  const processResult = ref<ProcessResult<TResult> | null>(null)

  // 计算属性
  const hasResult = computed(() => processResult.value !== null)
  const isSuccess = computed(() => processResult.value?.success === true)
  const isError = computed(() => processResult.value?.success === false)
  const resultData = computed(() => processResult.value?.data)
  const errorMsg = computed(() => processResult.value?.error?.message)

  /**
   * 处理文件
   * @param files 文件列表
   * @param processorOptions 处理选项
   * @returns 处理结果
   */
  const processFiles = async (
    files: File[],
    processorOptions: TOptions
  ): Promise<ProcessResult<TResult> | null> => {
    // 验证文件
    const validation = processor.validate(files)
    if (!validation.valid) {
      ElMessage.error(validation.errors[0] || '文件验证失败')
      return null
    }

    // 使用权限守卫执行处理
    const result = await executeWithPermission(async () => {
      isProcessing.value = true
      progress.value.progress = 0

      try {
        const result = await processor.process(files, processorOptions, (prog) => {
          progress.value.progress = prog
        })

        processResult.value = result

        if (result.success) {
          ElMessage.success(successMessage)
          // 处理成功后记录使用
          if (autoRecord) {
            await recordUsage()
          }
        } else {
          if (showErrorMessage) {
            ElMessage.error(result.error?.message || errorMessage)
          }
        }

        return result
      } catch (error: any) {
        const errorResult: ProcessResult<TResult> = {
          success: false,
          error: {
            code: 'PROCESS_FAILED',
            message: error.message || errorMessage
          },
          fileName: files[0]?.name || 'unknown'
        }
        processResult.value = errorResult
        if (showErrorMessage) {
          ElMessage.error(errorResult.error?.message || errorMessage)
        }
        return errorResult
      } finally {
        isProcessing.value = false
      }
    })

    return result
  }

  /**
   * 下载处理结果
   * @param fileName 文件名
   */
  const downloadResult = (fileName: string): void => {
    if (!isSuccess.value || !resultData.value) {
      ElMessage.warning('没有可下载的结果')
      return
    }

    // 如果结果是 Blob，直接下载
    if (resultData.value instanceof Blob) {
      downloadFile({
        fileName,
        blob: resultData.value
      })
    }
    // 如果结果包含 file 属性
    else if (
      resultData.value &&
      typeof resultData.value === 'object' &&
      'file' in resultData.value &&
      resultData.value.file instanceof Blob
    ) {
      downloadFile({
        fileName,
        blob: resultData.value.file
      })
    }
    // 如果结果包含 blob 属性
    else if (
      resultData.value &&
      typeof resultData.value === 'object' &&
      'blob' in resultData.value &&
      resultData.value.blob instanceof Blob
    ) {
      downloadFile({
        fileName,
        blob: resultData.value.blob
      })
    } else {
      ElMessage.error('无法下载结果：不支持的数据格式')
    }
  }

  /**
   * 下载多个结果文件
   * @param files 文件列表
   * @param zipName ZIP 文件名
   */
  const downloadMultipleResults = async (
    files: Array<{ name: string; blob: Blob }>,
    zipName: string
  ): Promise<void> => {
    await downloadMultipleFiles({ files, zipName })
  }

  /**
   * 重置状态
   */
  const reset = (): void => {
    processResult.value = null
    progress.value.progress = 0
  }

  /**
   * 重试处理
   * @param files 文件列表
   * @param processorOptions 处理选项
   */
  const retry = async (
    files: File[],
    processorOptions: TOptions
  ): Promise<ProcessResult<TResult> | null> => {
    reset()
    return await processFiles(files, processorOptions)
  }

  return {
    // 权限相关
    permissionGuardRef,
    checkBeforeAction,
    recordUsage,

    // 处理状态
    isProcessing,
    progress,
    processResult,

    // 计算属性
    hasResult,
    isSuccess,
    isError,
    resultData,
    errorMsg,

    // 方法
    processFiles,
    downloadResult,
    downloadMultipleResults,
    reset,
    retry
  }
}
