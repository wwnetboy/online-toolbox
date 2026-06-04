/**
 * useUpload - 文件上传组合式函数
 *
 * 提供文件上传相关的功能，包括文件选择、拖拽上传、大小验证、批量上传等。
 *
 * ## 主要功能
 *
 * 1. 文件选择 - 支持点击选择文件
 * 2. 拖拽上传 - 支持拖拽文件到指定区域
 * 3. 大小验证 - 验证文件大小是否符合限制
 * 4. 批量上传 - 支持同时上传多个文件
 * 5. 文件类型验证 - 验证文件类型是否符合要求
 *
 * ## 使用场景
 *
 * - PDF工具页面的文件上传
 * - 图片工具页面的文件上传
 * - 文档转换页面的文件上传
 *
 * ## 验证需求
 *
 * - 需求 3.1: 点击上传区域打开文件选择对话框
 * - 需求 3.2: 拖拽文件到上传区域
 * - 需求 3.3: 支持批量上传
 * - 需求 3.4: 单个文件大小不超过100MB
 * - 需求 3.5: 文件上传失败不中断批量操作
 *
 * @module hooks/core/useUpload
 * @author Art Design Pro Team
 */

import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 上传文件接口
 */
export interface UploadFile {
  /** 文件唯一标识 */
  id: string
  /** 文件名 */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 文件类型 */
  type: string
  /** 原始File对象 */
  file: File
  /** 上传状态 */
  status: 'pending' | 'uploading' | 'success' | 'error'
  /** 上传进度 (0-100) */
  progress: number
  /** 错误信息 */
  error?: string
  /** 预览URL（图片文件） */
  preview?: string
  /** 图片尺寸信息 */
  dimensions?: {
    width: number
    height: number
  }
}

/**
 * 上传错误接口
 */
export interface UploadError {
  /** 错误代码 */
  code: 'FILE_TOO_LARGE' | 'FILE_TYPE_NOT_SUPPORTED' | 'FILE_COUNT_EXCEEDED' | 'FILE_CORRUPTED'
  /** 错误消息 */
  message: string
  /** 文件名 */
  fileName: string
}

/**
 * 上传配置接口
 */
export interface UploadOptions {
  /** 接受的文件类型（MIME类型或扩展名） */
  accept?: string
  /** 是否支持多选 */
  multiple?: boolean
  /** 最大文件大小（MB） */
  maxSize?: number
  /** 最大文件数量 */
  maxCount?: number
  /** 是否自动上传 */
  autoUpload?: boolean
  /** 是否显示错误提示 */
  showErrorMessage?: boolean
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<UploadOptions> = {
  accept: '*',
  multiple: true,
  maxSize: 100, // 100MB
  maxCount: 10,
  autoUpload: false,
  showErrorMessage: true
}

/**
 * 文件上传组合式函数
 * @param options 上传配置
 */
export function useUpload(options: UploadOptions = {}) {
  // 合并配置
  const config = { ...DEFAULT_OPTIONS, ...options }

  // 上传文件列表
  const files = ref<UploadFile[]>([])

  // 是否正在拖拽
  const isDragging = ref(false)

  // 上传错误列表
  const errors = ref<UploadError[]>([])

  /**
   * 计算属性：是否有文件
   */
  const hasFiles = computed(() => files.value.length > 0)

  /**
   * 计算属性：文件总数
   */
  const fileCount = computed(() => files.value.length)

  /**
   * 计算属性：文件总大小（字节）
   */
  const totalSize = computed(() => {
    return files.value.reduce((sum, file) => sum + file.size, 0)
  })

  /**
   * 计算属性：文件总大小（格式化）
   */
  const totalSizeFormatted = computed(() => {
    return formatFileSize(totalSize.value)
  })

  /**
   * 计算属性：是否所有文件都上传成功
   */
  const allSuccess = computed(() => {
    return files.value.length > 0 && files.value.every((file) => file.status === 'success')
  })

  /**
   * 计算属性：是否有文件上传失败
   */
  const hasError = computed(() => {
    return files.value.some((file) => file.status === 'error')
  })

  /**
   * 生成唯一ID
   */
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 格式化文件大小
   * @param bytes 字节数
   * @returns 格式化后的文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  /**
   * 验证文件类型
   * @param file 文件对象
   * @returns 是否通过验证
   */
  const validateFileType = (file: File): boolean => {
    if (config.accept === '*') return true

    const acceptTypes = config.accept.split(',').map((type) => type.trim())
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()

    return acceptTypes.some((acceptType) => {
      // 检查扩展名
      if (acceptType.startsWith('.')) {
        return fileName.endsWith(acceptType.toLowerCase())
      }
      // 检查MIME类型
      if (acceptType.includes('*')) {
        const pattern = acceptType.replace('*', '.*')
        return new RegExp(pattern).test(fileType)
      }
      return fileType === acceptType
    })
  }

  /**
   * 验证文件大小
   * @param file 文件对象
   * @returns 是否通过验证
   */
  const validateFileSize = (file: File): boolean => {
    const maxSizeBytes = config.maxSize * 1024 * 1024
    return file.size <= maxSizeBytes
  }

  /**
   * 验证文件数量
   * @param newFilesCount 新增文件数量
   * @returns 是否通过验证
   */
  const validateFileCount = (newFilesCount: number): boolean => {
    return files.value.length + newFilesCount <= config.maxCount
  }

  /**
   * 添加文件到列表
   * @param fileList 文件列表
   */
  const addFiles = (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList)

    // 验证文件数量
    if (!validateFileCount(fileArray.length)) {
      const error: UploadError = {
        code: 'FILE_COUNT_EXCEEDED',
        message: `文件数量超出限制，最多只能上传 ${config.maxCount} 个文件`,
        fileName: ''
      }
      errors.value.push(error)
      if (config.showErrorMessage) {
        ElMessage.error(error.message)
      }
      return
    }

    // 处理每个文件
    fileArray.forEach((file) => {
      // 验证文件类型
      if (!validateFileType(file)) {
        const error: UploadError = {
          code: 'FILE_TYPE_NOT_SUPPORTED',
          message: `不支持的文件类型: ${file.name}`,
          fileName: file.name
        }
        errors.value.push(error)
        if (config.showErrorMessage) {
          ElMessage.error(error.message)
        }
        return
      }

      // 验证文件大小
      if (!validateFileSize(file)) {
        const error: UploadError = {
          code: 'FILE_TOO_LARGE',
          message: `文件大小超出限制: ${file.name} (最大 ${config.maxSize}MB)`,
          fileName: file.name
        }
        errors.value.push(error)
        if (config.showErrorMessage) {
          ElMessage.error(error.message)
        }
        return
      }

      // 添加到文件列表
      const uploadFile: UploadFile = {
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        status: 'pending',
        progress: 0,
        preview: undefined // 明确初始化为 undefined
      }

      files.value.push(uploadFile)

      // 如果是图片文件，生成预览图（使用 Object URL，更高效）
      if (file.type.startsWith('image/')) {
        uploadFile.preview = URL.createObjectURL(file)

        // 获取图片尺寸（可选）
        const img = new Image()
        img.onload = () => {
          const index = files.value.findIndex((f) => f.id === uploadFile.id)
          if (index !== -1) {
            files.value[index].dimensions = {
              width: img.width,
              height: img.height
            }
          }
        }
        img.src = uploadFile.preview
      }
    })
  }

  /**
   * 处理文件选择
   * @param event 输入事件
   */
  const handleFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      addFiles(input.files)
      // 清空input，允许重复选择相同文件
      input.value = ''
    }
  }

  /**
   * 处理拖拽进入
   * @param event 拖拽事件
   */
  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    isDragging.value = true
  }

  /**
   * 处理拖拽离开
   * @param event 拖拽事件
   */
  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    isDragging.value = false
  }

  /**
   * 处理拖拽悬停
   * @param event 拖拽事件
   */
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * 处理文件拖放
   * @param event 拖拽事件
   */
  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    isDragging.value = false

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      addFiles(files)
    }
  }

  /**
   * 移除文件
   * @param fileId 文件ID
   */
  const removeFile = (fileId: string) => {
    const index = files.value.findIndex((file) => file.id === fileId)
    if (index !== -1) {
      // 释放 Object URL 内存
      const file = files.value[index]
      if (file.preview && file.preview.startsWith('blob:')) {
        URL.revokeObjectURL(file.preview)
      }
      files.value.splice(index, 1)
    }
  }

  /**
   * 清空所有文件
   */
  const clearFiles = () => {
    // 释放所有 Object URL 内存
    files.value.forEach((file) => {
      if (file.preview && file.preview.startsWith('blob:')) {
        URL.revokeObjectURL(file.preview)
      }
    })
    files.value = []
    errors.value = []
  }

  /**
   * 更新文件状态
   * @param fileId 文件ID
   * @param status 新状态
   * @param progress 进度（可选）
   * @param error 错误信息（可选）
   */
  const updateFileStatus = (
    fileId: string,
    status: UploadFile['status'],
    progress?: number,
    error?: string
  ) => {
    const file = files.value.find((f) => f.id === fileId)
    if (file) {
      file.status = status
      if (progress !== undefined) {
        file.progress = progress
      }
      if (error) {
        file.error = error
      }
    }
  }

  /**
   * 获取文件
   * @param fileId 文件ID
   * @returns 文件对象
   */
  const getFile = (fileId: string): UploadFile | undefined => {
    return files.value.find((file) => file.id === fileId)
  }

  /**
   * 获取所有成功的文件
   * @returns 成功的文件列表
   */
  const getSuccessFiles = (): UploadFile[] => {
    return files.value.filter((file) => file.status === 'success')
  }

  /**
   * 获取所有失败的文件
   * @returns 失败的文件列表
   */
  const getErrorFiles = (): UploadFile[] => {
    return files.value.filter((file) => file.status === 'error')
  }

  /**
   * 清空错误列表
   */
  const clearErrors = () => {
    errors.value = []
  }

  return {
    // 状态
    files,
    isDragging,
    errors,

    // 计算属性
    hasFiles,
    fileCount,
    totalSize,
    totalSizeFormatted,
    allSuccess,
    hasError,

    // 方法
    addFiles,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    clearFiles,
    updateFileStatus,
    getFile,
    getSuccessFiles,
    getErrorFiles,
    clearErrors,
    formatFileSize,
    validateFileType,
    validateFileSize,
    validateFileCount
  }
}
