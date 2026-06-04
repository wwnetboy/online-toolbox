/**
 * OCR API
 * 对接后端 /api/pdf/ocr 接口
 * Requirements: 3.1, 3.2, 3.4
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

/** 支持的OCR语言 */
export enum OcrLanguage {
  CHINESE = 'chi_sim',
  CHINESE_TRADITIONAL = 'chi_tra',
  ENGLISH = 'eng'
}

/** 语言显示名称 */
export const LanguageNames: Record<string, string> = {
  [OcrLanguage.CHINESE]: '简体中文',
  [OcrLanguage.CHINESE_TRADITIONAL]: '繁体中文',
  [OcrLanguage.ENGLISH]: '英文'
}

/** 输出类型 */
export enum OcrOutputType {
  SEARCHABLE_PDF = 'searchable-pdf',
  TEXT_ONLY = 'text-only'
}

/** OCR任务数据类型 */
export interface OcrTask {
  taskId: string
  status: TaskStatus
  progress: number
  currentPage: number
  totalPages: number
  inputFile: {
    originalName: string
    size: number
  }
  outputFile?: {
    filename: string
    size: number
  }
  result?: {
    confidence: number
    pageCount: number
  }
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

/** OCR结果 */
export interface OcrResult {
  confidence: number
  pageResults: Array<{
    pageIndex: number
    pageNumber: number
    text: string
    confidence: number
    lowConfidenceAreas: Array<{
      description: string
      confidence: number
    }>
  }>
  text: string
}

/** 支持的语言信息 */
export interface SupportedLanguage {
  code: string
  name: string
  available: boolean
}

/** 系统状态 */
export interface OcrSystemStatus {
  tesseract: {
    available: boolean
    required: boolean
    message: string
  }
  poppler: {
    available: boolean
    required: boolean
    message: string
  }
  languages: {
    supported: SupportedLanguage[]
    available: string[]
  }
  ready: boolean
}

/** OCR选项 */
export interface OcrOptions {
  languages?: string[]
  pages?: number[] | 'all'
  outputType?: OcrOutputType
  dpi?: number
}

/**
 * 提交OCR任务
 * @param file 要处理的PDF文件
 * @param options OCR选项
 */
export async function submitOcrTask(file: File, options?: OcrOptions): Promise<OcrTask> {
  const formData = new FormData()
  formData.append('file', file)

  if (options) {
    if (options.languages && options.languages.length > 0) {
      formData.append('languages', options.languages.join(','))
    }
    if (options.pages) {
      if (options.pages === 'all') {
        formData.append('pages', 'all')
      } else {
        formData.append('pages', options.pages.join(','))
      }
    }
    if (options.outputType) {
      formData.append('outputType', options.outputType)
    }
    if (options.dpi) {
      formData.append('dpi', String(options.dpi))
    }
  }

  const visitorId = getVisitorId()

  return request.post<OcrTask>({
    url: '/pdf/ocr',
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
export function getOcrTaskStatus(taskId: string): Promise<OcrTask> {
  return request.get<OcrTask>({
    url: `/api/pdf/ocr/${taskId}`
  })
}

/**
 * 下载OCR结果
 * @param taskId 任务ID
 */
export async function downloadOcrResult(taskId: string): Promise<Blob> {
  const response = await fetch(`/api/pdf/ocr/${taskId}/download`, {
    method: 'GET'
  })

  if (!response.ok) {
    throw new Error('下载失败')
  }

  return response.blob()
}

/**
 * 获取OCR文本结果
 * @param taskId 任务ID
 */
export function getOcrTextResult(taskId: string): Promise<OcrResult> {
  return request.get<OcrResult>({
    url: `/api/pdf/ocr/${taskId}/text`
  })
}

/**
 * 删除任务
 * @param taskId 任务ID
 */
export function deleteOcrTask(taskId: string): Promise<void> {
  const visitorId = getVisitorId()

  return request.del<void>({
    url: `/api/pdf/ocr/${taskId}`,
    headers: {
      'X-Visitor-Id': visitorId
    }
  })
}

/**
 * 获取用户的OCR任务列表
 */
export function getUserOcrTasks(): Promise<{ tasks: OcrTask[] }> {
  const visitorId = getVisitorId()

  return request.get<{ tasks: OcrTask[] }>({
    url: '/pdf/ocr/tasks',
    headers: {
      'X-Visitor-Id': visitorId
    }
  })
}

/**
 * 获取支持的语言
 */
export function getSupportedLanguages(): Promise<{
  supported: SupportedLanguage[]
  available: string[]
}> {
  return request.get<{ supported: SupportedLanguage[]; available: string[] }>({
    url: '/pdf/ocr/languages'
  })
}

/**
 * 检查OCR系统状态
 */
export function checkOcrSystemStatus(): Promise<OcrSystemStatus> {
  return request.get<OcrSystemStatus>({
    url: '/pdf/ocr/status'
  })
}

/**
 * 轮询任务状态直到完成
 * @param taskId 任务ID
 * @param onProgress 进度回调
 * @param interval 轮询间隔（毫秒）
 * @param timeout 超时时间（毫秒）
 */
export async function pollOcrTaskUntilComplete(
  taskId: string,
  onProgress?: (task: OcrTask) => void,
  interval = 1000,
  timeout = 600000 // 10 minutes for OCR
): Promise<OcrTask> {
  const startTime = Date.now()

  while (true) {
    const task = await getOcrTaskStatus(taskId)

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
