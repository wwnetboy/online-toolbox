/**
 * PDF转换处理器
 * 使用后端API进行PDF格式转换
 */
import type { IProcessor } from '@/hooks/core/useToolProcessor'
import type { ProcessResult } from '@/hooks/core/useFileProcessor'
import {
  submitConversion,
  pollTaskUntilComplete,
  downloadResult as downloadConversionResult,
  ConversionType,
  TaskStatus,
  type ConversionOptions
} from '@/api/pdf-convert'

/** PDF转Word处理器选项 */
export interface PdfToWordOptions {}

/** Word转PDF处理器选项 */
export interface WordToPdfOptions {
  preserveHyperlinks?: boolean
  preserveBookmarks?: boolean
}

/** PDF转Excel处理器选项 */
export interface PdfToExcelOptions {}

/** PDF转PPT处理器选项 */
export interface PdfToPptOptions {}

/** PPT转PDF处理器选项 */
export interface PptToPdfOptions {
  includeNotes?: boolean
}

/** 转换结果数据 */
export interface ConversionResultData {
  blob: Blob
  fileName: string
}

/**
 * 创建PDF转Word处理器
 */
export function createPdfToWordProcessor(): IProcessor<PdfToWordOptions, ConversionResultData> {
  return {
    validate: (files: File[]) => {
      if (files.length === 0) {
        return { valid: false, errors: ['请选择文件'] }
      }
      if (files.length > 1) {
        return { valid: false, errors: ['只能选择一个文件'] }
      }
      const file = files[0]
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return { valid: false, errors: ['请选择PDF文件'] }
      }
      if (file.size > 50 * 1024 * 1024) {
        return { valid: false, errors: ['文件大小不能超过50MB'] }
      }
      return { valid: true, errors: [] }
    },

    process: async (files: File[], options: PdfToWordOptions, onProgress) => {
      const file = files[0]
      try {
        // 提交转换任务
        const task = await submitConversion(file, ConversionType.PDF_TO_WORD)

        // 轮询任务状态
        const completedTask = await pollTaskUntilComplete(task.taskId, (t) => {
          onProgress?.(t.progress)
        })

        // 检查任务状态
        if (completedTask.status === TaskStatus.COMPLETED) {
          // 下载结果
          const blob = await downloadConversionResult(completedTask.taskId)
          return {
            success: true,
            data: { blob, fileName: file.name },
            fileName: file.name
          }
        } else {
          return {
            success: false,
            error: {
              code: 'CONVERSION_FAILED',
              message: completedTask.error || '转换失败'
            },
            fileName: file.name
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'CONVERSION_ERROR',
            message: error.message || '转换失败，请稍后重试'
          },
          fileName: file.name
        }
      }
    }
  }
}

/**
 * 创建Word转PDF处理器
 */
export function createWordToPdfProcessor(): IProcessor<WordToPdfOptions, ConversionResultData> {
  return {
    validate: (files: File[]) => {
      if (files.length === 0) {
        return { valid: false, errors: ['请选择文件'] }
      }
      if (files.length > 1) {
        return { valid: false, errors: ['只能选择一个文件'] }
      }
      const file = files[0]
      const validExtensions = ['.doc', '.docx']
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      if (!validExtensions.includes(ext)) {
        return { valid: false, errors: ['请选择Word文件（.doc/.docx）'] }
      }
      if (file.size > 50 * 1024 * 1024) {
        return { valid: false, errors: ['文件大小不能超过50MB'] }
      }
      return { valid: true, errors: [] }
    },

    process: async (files: File[], options: WordToPdfOptions, onProgress) => {
      const file = files[0]
      try {
        // 提交转换任务
        const conversionOptions: ConversionOptions = {
          preserveHyperlinks: options.preserveHyperlinks,
          preserveBookmarks: options.preserveBookmarks
        }
        const task = await submitConversion(file, ConversionType.WORD_TO_PDF, conversionOptions)

        // 轮询任务状态
        const completedTask = await pollTaskUntilComplete(task.taskId, (t) => {
          onProgress?.(t.progress)
        })

        // 检查任务状态
        if (completedTask.status === TaskStatus.COMPLETED) {
          // 下载结果
          const blob = await downloadConversionResult(completedTask.taskId)
          return {
            success: true,
            data: { blob, fileName: file.name },
            fileName: file.name
          }
        } else {
          return {
            success: false,
            error: {
              code: 'CONVERSION_FAILED',
              message: completedTask.error || '转换失败'
            },
            fileName: file.name
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'CONVERSION_ERROR',
            message: error.message || '转换失败，请稍后重试'
          },
          fileName: file.name
        }
      }
    }
  }
}

/**
 * 创建PDF转Excel处理器
 */
export function createPdfToExcelProcessor(): IProcessor<PdfToExcelOptions, ConversionResultData> {
  return {
    validate: (files: File[]) => {
      if (files.length === 0) {
        return { valid: false, errors: ['请选择文件'] }
      }
      if (files.length > 1) {
        return { valid: false, errors: ['只能选择一个文件'] }
      }
      const file = files[0]
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return { valid: false, errors: ['请选择PDF文件'] }
      }
      if (file.size > 50 * 1024 * 1024) {
        return { valid: false, errors: ['文件大小不能超过50MB'] }
      }
      return { valid: true, errors: [] }
    },

    process: async (files: File[], options: PdfToExcelOptions, onProgress) => {
      const file = files[0]
      try {
        // 提交转换任务
        const task = await submitConversion(file, ConversionType.PDF_TO_EXCEL)

        // 轮询任务状态
        const completedTask = await pollTaskUntilComplete(task.taskId, (t) => {
          onProgress?.(t.progress)
        })

        // 检查任务状态
        if (completedTask.status === TaskStatus.COMPLETED) {
          // 下载结果
          const blob = await downloadConversionResult(completedTask.taskId)
          return {
            success: true,
            data: { blob, fileName: file.name },
            fileName: file.name
          }
        } else {
          return {
            success: false,
            error: {
              code: 'CONVERSION_FAILED',
              message: completedTask.error || '转换失败'
            },
            fileName: file.name
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'CONVERSION_ERROR',
            message: error.message || '转换失败，请稍后重试'
          },
          fileName: file.name
        }
      }
    }
  }
}

/**
 * 创建PDF转PPT处理器
 */
export function createPdfToPptProcessor(): IProcessor<PdfToPptOptions, ConversionResultData> {
  return {
    validate: (files: File[]) => {
      if (files.length === 0) {
        return { valid: false, errors: ['请选择文件'] }
      }
      if (files.length > 1) {
        return { valid: false, errors: ['只能选择一个文件'] }
      }
      const file = files[0]
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return { valid: false, errors: ['请选择PDF文件'] }
      }
      if (file.size > 50 * 1024 * 1024) {
        return { valid: false, errors: ['文件大小不能超过50MB'] }
      }
      return { valid: true, errors: [] }
    },

    process: async (files: File[], options: PdfToPptOptions, onProgress) => {
      const file = files[0]
      try {
        // 提交转换任务
        const task = await submitConversion(file, ConversionType.PDF_TO_PPT)

        // 轮询任务状态
        const completedTask = await pollTaskUntilComplete(task.taskId, (t) => {
          onProgress?.(t.progress)
        })

        // 检查任务状态
        if (completedTask.status === TaskStatus.COMPLETED) {
          // 下载结果
          const blob = await downloadConversionResult(completedTask.taskId)
          return {
            success: true,
            data: { blob, fileName: file.name },
            fileName: file.name
          }
        } else {
          return {
            success: false,
            error: {
              code: 'CONVERSION_FAILED',
              message: completedTask.error || '转换失败'
            },
            fileName: file.name
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'CONVERSION_ERROR',
            message: error.message || '转换失败，请稍后重试'
          },
          fileName: file.name
        }
      }
    }
  }
}

/**
 * 创建PPT转PDF处理器
 */
export function createPptToPdfProcessor(): IProcessor<PptToPdfOptions, ConversionResultData> {
  return {
    validate: (files: File[]) => {
      if (files.length === 0) {
        return { valid: false, errors: ['请选择文件'] }
      }
      if (files.length > 1) {
        return { valid: false, errors: ['只能选择一个文件'] }
      }
      const file = files[0]
      const validExtensions = ['.ppt', '.pptx']
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      if (!validExtensions.includes(ext)) {
        return { valid: false, errors: ['请选择PPT文件（.ppt/.pptx）'] }
      }
      if (file.size > 50 * 1024 * 1024) {
        return { valid: false, errors: ['文件大小不能超过50MB'] }
      }
      return { valid: true, errors: [] }
    },

    process: async (files: File[], options: PptToPdfOptions, onProgress) => {
      const file = files[0]
      try {
        // 提交转换任务
        const conversionOptions: ConversionOptions = {
          includeNotes: options.includeNotes
        }
        const task = await submitConversion(file, ConversionType.PPT_TO_PDF, conversionOptions)

        // 轮询任务状态
        const completedTask = await pollTaskUntilComplete(task.taskId, (t) => {
          onProgress?.(t.progress)
        })

        // 检查任务状态
        if (completedTask.status === TaskStatus.COMPLETED) {
          // 下载结果
          const blob = await downloadConversionResult(completedTask.taskId)
          return {
            success: true,
            data: { blob, fileName: file.name },
            fileName: file.name
          }
        } else {
          return {
            success: false,
            error: {
              code: 'CONVERSION_FAILED',
              message: completedTask.error || '转换失败'
            },
            fileName: file.name
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'CONVERSION_ERROR',
            message: error.message || '转换失败，请稍后重试'
          },
          fileName: file.name
        }
      }
    }
  }
}

/** PDF转PDF/A处理器选项 */
export interface PdfToPdfaOptions {
  pdfaVersion?: '1b' | '2b'
}

/** Excel转PDF处理器选项 */
export interface ExcelToPdfOptions {}

/** HTML转PDF处理器选项 */
export interface HtmlToPdfOptions {
  pageSize?: string
  orientation?: 'portrait' | 'landscape'
}

/** 图片转PDF处理器选项 */
export interface ImageToPdfOptions {
  pageSize?: string
  orientation?: 'portrait' | 'landscape'
}

/**
 * 创建PDF转PDF/A处理器
 */
export function createPdfToPdfaProcessor(): IProcessor<PdfToPdfaOptions, ConversionResultData> {
  return {
    validate: (files: File[]) => {
      if (files.length === 0) {
        return { valid: false, errors: ['请选择文件'] }
      }
      if (files.length > 1) {
        return { valid: false, errors: ['只能选择一个文件'] }
      }
      const file = files[0]
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return { valid: false, errors: ['请选择PDF文件'] }
      }
      if (file.size > 50 * 1024 * 1024) {
        return { valid: false, errors: ['文件大小不能超过50MB'] }
      }
      return { valid: true, errors: [] }
    },

    process: async (files: File[], options: PdfToPdfaOptions, onProgress) => {
      const file = files[0]
      try {
        const conversionOptions: ConversionOptions = {
          pdfaVersion: options.pdfaVersion
        }
        const task = await submitConversion(file, ConversionType.PDF_TO_PDFA, conversionOptions)

        const completedTask = await pollTaskUntilComplete(task.taskId, (t) => {
          onProgress?.(t.progress)
        })

        if (completedTask.status === TaskStatus.COMPLETED) {
          const blob = await downloadConversionResult(completedTask.taskId)
          return {
            success: true,
            data: { blob, fileName: file.name },
            fileName: file.name
          }
        } else {
          return {
            success: false,
            error: {
              code: 'CONVERSION_FAILED',
              message: completedTask.error || '转换失败'
            },
            fileName: file.name
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'CONVERSION_ERROR',
            message: error.message || '转换失败，请稍后重试'
          },
          fileName: file.name
        }
      }
    }
  }
}

/**
 * 创建Excel转PDF处理器
 */
export function createExcelToPdfProcessor(): IProcessor<ExcelToPdfOptions, ConversionResultData> {
  return {
    validate: (files: File[]) => {
      if (files.length === 0) {
        return { valid: false, errors: ['请选择文件'] }
      }
      if (files.length > 1) {
        return { valid: false, errors: ['只能选择一个文件'] }
      }
      const file = files[0]
      const validExtensions = ['.xls', '.xlsx']
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      if (!validExtensions.includes(ext)) {
        return { valid: false, errors: ['请选择Excel文件（.xls/.xlsx）'] }
      }
      if (file.size > 50 * 1024 * 1024) {
        return { valid: false, errors: ['文件大小不能超过50MB'] }
      }
      return { valid: true, errors: [] }
    },

    process: async (files: File[], options: ExcelToPdfOptions, onProgress) => {
      const file = files[0]
      try {
        const task = await submitConversion(file, ConversionType.EXCEL_TO_PDF)

        const completedTask = await pollTaskUntilComplete(task.taskId, (t) => {
          onProgress?.(t.progress)
        })

        if (completedTask.status === TaskStatus.COMPLETED) {
          const blob = await downloadConversionResult(completedTask.taskId)
          return {
            success: true,
            data: { blob, fileName: file.name },
            fileName: file.name
          }
        } else {
          return {
            success: false,
            error: {
              code: 'CONVERSION_FAILED',
              message: completedTask.error || '转换失败'
            },
            fileName: file.name
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'CONVERSION_ERROR',
            message: error.message || '转换失败，请稍后重试'
          },
          fileName: file.name
        }
      }
    }
  }
}

/**
 * 创建HTML转PDF处理器
 */
export function createHtmlToPdfProcessor(): IProcessor<HtmlToPdfOptions, ConversionResultData> {
  return {
    validate: (files: File[]) => {
      if (files.length === 0) {
        return { valid: false, errors: ['请选择文件'] }
      }
      if (files.length > 1) {
        return { valid: false, errors: ['只能选择一个文件'] }
      }
      const file = files[0]
      const validExtensions = ['.html', '.htm']
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
      if (!validExtensions.includes(ext)) {
        return { valid: false, errors: ['请选择HTML文件（.html/.htm）'] }
      }
      if (file.size > 10 * 1024 * 1024) {
        return { valid: false, errors: ['文件大小不能超过10MB'] }
      }
      return { valid: true, errors: [] }
    },

    process: async (files: File[], options: HtmlToPdfOptions, onProgress) => {
      const file = files[0]
      try {
        const conversionOptions: ConversionOptions = {
          pageSize: options.pageSize,
          orientation: options.orientation
        }
        const task = await submitConversion(file, ConversionType.HTML_TO_PDF, conversionOptions)

        const completedTask = await pollTaskUntilComplete(task.taskId, (t) => {
          onProgress?.(t.progress)
        })

        if (completedTask.status === TaskStatus.COMPLETED) {
          const blob = await downloadConversionResult(completedTask.taskId)
          return {
            success: true,
            data: { blob, fileName: file.name },
            fileName: file.name
          }
        } else {
          return {
            success: false,
            error: {
              code: 'CONVERSION_FAILED',
              message: completedTask.error || '转换失败'
            },
            fileName: file.name
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'CONVERSION_ERROR',
            message: error.message || '转换失败，请稍后重试'
          },
          fileName: file.name
        }
      }
    }
  }
}

/**
 * 创建图片转PDF处理器
 */
export function createImageToPdfProcessor(): IProcessor<ImageToPdfOptions, ConversionResultData> {
  return {
    validate: (files: File[]) => {
      if (files.length === 0) {
        return { valid: false, errors: ['请选择文件'] }
      }
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      for (const file of files) {
        if (!validTypes.includes(file.type)) {
          return { valid: false, errors: ['请选择图片文件（JPG/PNG/WEBP/GIF）'] }
        }
        if (file.size > 20 * 1024 * 1024) {
          return { valid: false, errors: ['单个图片大小不能超过20MB'] }
        }
      }
      return { valid: true, errors: [] }
    },

    process: async (files: File[], options: ImageToPdfOptions, onProgress) => {
      try {
        const conversionOptions: ConversionOptions = {
          pageSize: options.pageSize,
          orientation: options.orientation
        }
        const task = await submitConversion(
          files[0],
          ConversionType.IMAGE_TO_PDF,
          conversionOptions
        )

        const completedTask = await pollTaskUntilComplete(task.taskId, (t) => {
          onProgress?.(t.progress)
        })

        if (completedTask.status === TaskStatus.COMPLETED) {
          const blob = await downloadConversionResult(completedTask.taskId)
          return {
            success: true,
            data: { blob, fileName: files[0].name },
            fileName: files[0].name
          }
        } else {
          return {
            success: false,
            error: {
              code: 'CONVERSION_FAILED',
              message: completedTask.error || '转换失败'
            },
            fileName: files[0].name
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'CONVERSION_ERROR',
            message: error.message || '转换失败，请稍后重试'
          },
          fileName: files[0].name
        }
      }
    }
  }
}
