/**
 * PDF转换 API
 * 对接后端 /api/pdf/convert 接口
 * Requirements: 5, 6, 7, 10, 11, 12
 */
import request from '@/utils/http'
import { getVisitorId } from '@/utils/visitor-id'

/** 任务状态枚举 */
export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/** 转换类型枚举 */
export enum ConversionType {
  // Office to PDF
  WORD_TO_PDF = 'word-to-pdf',
  PPT_TO_PDF = 'ppt-to-pdf',
  EXCEL_TO_PDF = 'excel-to-pdf',
  HTML_TO_PDF = 'html-to-pdf',
  // PDF to Office
  PDF_TO_WORD = 'pdf-to-word',
  PDF_TO_PPT = 'pdf-to-ppt',
  PDF_TO_EXCEL = 'pdf-to-excel',
  // PDF to PDF/A
  PDF_TO_PDFA = 'pdf-to-pdfa'
}

/** 转换任务数据类型 */
export interface ConversionTask {
  taskId: string
  status: TaskStatus
  progress: number
  conversionType: ConversionType
  inputFile: {
    originalName: string
    size: number
  }
  outputFile?: {
    filename: string
    size: number
  }
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

/** 支持的转换类型 */
export interface SupportedConversion {
  type: ConversionType
  inputExtensions: string[]
  outputExtension: string
  mimeTypes: string[]
}

/** 系统状态 */
export interface SystemStatus {
  libreOffice: {
    available: boolean
    required: boolean
    message: string
  }
}

/** 转换选项 */
export interface ConversionOptions {
  preserveHyperlinks?: boolean
  preserveBookmarks?: boolean
  includeNotes?: boolean
  pdfaVersion?: '1b' | '2b'
}

/**
 * 提交转换任务
 * @param file 要转换的文件
 * @param conversionType 转换类型
 * @param options 转换选项
 */
export async function submitConversion(
  file: File,
  conversionType: ConversionType,
  options?: ConversionOptions
): Promise<ConversionTask> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('conversionType', conversionType)

  if (options) {
    if (options.preserveHyperlinks !== undefined) {
      formData.append('preserveHyperlinks', String(options.preserveHyperlinks))
    }
    if (options.preserveBookmarks !== undefined) {
      formData.append('preserveBookmarks', String(options.preserveBookmarks))
    }
    if (options.includeNotes !== undefined) {
      formData.append('includeNotes', String(options.includeNotes))
    }
    if (options.pdfaVersion) {
      formData.append('pdfaVersion', options.pdfaVersion)
    }
  }

  const visitorId = getVisitorId()

  return request.post<ConversionTask>({
    url: '/pdf/convert',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Visitor-Id': visitorId
    }
  })
}

/**
 * 获取任务状态
 * @param taskId 任务ID
 */
export function getTaskStatus(taskId: string): Promise<ConversionTask> {
  return request.get<ConversionTask>({
    url: `/pdf/convert/${taskId}`
  })
}

/**
 * 下载转换结果
 * @param taskId 任务ID
 */
export async function downloadResult(taskId: string): Promise<Blob> {
  const { VITE_API_URL, VITE_WITH_CREDENTIALS } = import.meta.env
  const baseUrl = (VITE_API_URL || '/api').replace(/\/$/, '')

  const response = await fetch(`${baseUrl}/pdf/convert/${taskId}/download`, {
    method: 'GET',
    credentials: VITE_WITH_CREDENTIALS === 'true' ? 'include' : 'same-origin'
  })

  if (!response.ok) {
    let message = '下载失败'
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      try {
        const data: any = await response.json()
        if (data?.msg) message = data.msg
      } catch (error: unknown) {
        console.error('Failed to parse error response:', error)
      }
    }

    throw new Error(message)
  }

  return response.blob()
}

/**
 * 删除任务
 * @param taskId 任务ID
 */
export function deleteTask(taskId: string): Promise<void> {
  const visitorId = getVisitorId()

  return request.del<void>({
    url: `/pdf/convert/${taskId}`,
    headers: {
      'X-Visitor-Id': visitorId
    }
  })
}

/**
 * 获取用户的任务列表
 */
export function getUserTasks(): Promise<{ tasks: ConversionTask[] }> {
  const visitorId = getVisitorId()

  return request.get<{ tasks: ConversionTask[] }>({
    url: '/pdf/convert/tasks',
    headers: {
      'X-Visitor-Id': visitorId
    }
  })
}

/**
 * 获取支持的转换类型
 */
export function getSupportedTypes(): Promise<{ conversions: SupportedConversion[] }> {
  return request.get<{ conversions: SupportedConversion[] }>({
    url: '/pdf/convert/types'
  })
}

/**
 * 检查系统状态
 */
export function checkSystemStatus(): Promise<SystemStatus> {
  return request.get<SystemStatus>({
    url: '/pdf/convert/status'
  })
}

/**
 * 轮询任务状态直到完成
 * @param taskId 任务ID
 * @param onProgress 进度回调
 * @param interval 轮询间隔（毫秒）
 * @param timeout 超时时间（毫秒）
 */
export async function pollTaskUntilComplete(
  taskId: string,
  onProgress?: (task: ConversionTask) => void,
  interval = Number(import.meta.env.VITE_CONVERT_POLL_INTERVAL_MS) || 1000,
  timeout = Number(import.meta.env.VITE_CONVERT_POLL_TIMEOUT_MS) || 300000
): Promise<ConversionTask> {
  const startTime = Date.now()

  while (true) {
    const task = await getTaskStatus(taskId)

    if (onProgress) {
      onProgress(task)
    }

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) {
      return task
    }

    if (Date.now() - startTime > timeout) {
      throw new Error('任务超时')
    }

    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}
