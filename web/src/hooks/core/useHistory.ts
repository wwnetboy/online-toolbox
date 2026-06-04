import { computed } from 'vue'
import { useToolboxHistoryStore, type HistoryRecord } from '@/store/modules/toolbox/history'
import { useToolboxSettingsStore } from '@/store/modules/toolbox/settings'
import { ElMessage } from 'element-plus'

export interface AddHistoryParams {
  toolId: string
  toolName: string
  fileName: string
  outputFileName: string
  fileSize: number
  outputFileSize?: number
  processType: string
  downloadUrl?: string
}

export interface HistoryFilterOptions {
  toolId?: string
  processType?: string
  status?: HistoryRecord['status']
  startDate?: Date
  endDate?: Date
  keyword?: string
}

export function useHistory() {
  const historyStore = useToolboxHistoryStore()
  const settingsStore = useToolboxSettingsStore()

  const isProcessLogEnabled = computed(() => settingsStore.isProcessLogEnabled)
  const records = computed(() => historyStore.records)
  const validRecords = computed(() => historyStore.validRecords)
  const sortedRecords = computed(() => historyStore.sortedRecords)
  const statistics = computed(() => historyStore.getStatistics)

  const addRecord = (params: AddHistoryParams): string => {
    if (!settingsStore.isProcessLogEnabled) return ''
    try {
      return historyStore.addRecord(params)
    } catch (error: any) {
      console.error('添加历史记录失败:', error)
      ElMessage.error('保存历史记录失败')
      throw error
    }
  }

  const getRecordById = (id: string): HistoryRecord | undefined => {
    return historyStore.getRecordById(id)
  }

  const getRecordsByToolId = (toolId: string): HistoryRecord[] => {
    return historyStore.getRecordsByToolId(toolId)
  }

  const filterRecords = (options: HistoryFilterOptions): HistoryRecord[] => {
    let filtered = [...sortedRecords.value]
    if (options.toolId) filtered = filtered.filter((r) => r.toolId === options.toolId)
    if (options.processType)
      filtered = filtered.filter((r) => r.processType === options.processType)
    if (options.status) filtered = filtered.filter((r) => r.status === options.status)
    if (options.startDate) {
      const startTime = options.startDate.getTime()
      filtered = filtered.filter((r) => r.createdAt >= startTime)
    }
    if (options.endDate) {
      const endTime = options.endDate.getTime()
      filtered = filtered.filter((r) => r.createdAt <= endTime)
    }
    if (options.keyword) {
      const keyword = options.keyword.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.fileName.toLowerCase().includes(keyword) ||
          r.outputFileName.toLowerCase().includes(keyword)
      )
    }
    return filtered
  }

  const updateRecordStatus = (
    id: string,
    status: HistoryRecord['status'],
    errorMessage?: string
  ) => {
    historyStore.updateRecordStatus(id, status, errorMessage)
  }

  const removeRecord = (id: string, showMessage = true) => {
    try {
      historyStore.removeRecord(id)
      if (showMessage) ElMessage.success('删除成功')
    } catch (error: any) {
      console.error('删除历史记录失败:', error)
      if (showMessage) ElMessage.error('删除失败')
    }
  }

  const clearAllRecords = (showMessage = true) => {
    try {
      historyStore.clearAllRecords()
      if (showMessage) ElMessage.success('已清空所有历史记录')
    } catch (error: any) {
      console.error('清空历史记录失败:', error)
      if (showMessage) ElMessage.error('清空失败')
    }
  }

  const cleanExpiredRecords = (showMessage = false): number => {
    const beforeCount = records.value.length
    historyStore.cleanExpiredRecords()
    const cleanedCount = beforeCount - records.value.length
    if (showMessage && cleanedCount > 0) ElMessage.success(`已清理 ${cleanedCount} 条过期记录`)
    return cleanedCount
  }

  const downloadFile = (id: string, showMessage = true) => {
    const record = getRecordById(id)
    if (!record) {
      if (showMessage) ElMessage.error('记录不存在')
      return
    }
    if (record.status === 'expired' || (record.expiresAt && record.expiresAt < Date.now())) {
      if (showMessage) ElMessage.warning('文件已过期，无法下载')
      updateRecordStatus(id, 'expired')
      return
    }
    if (!record.downloadUrl) {
      if (showMessage) ElMessage.error('下载链接不存在')
      return
    }
    try {
      const link = document.createElement('a')
      link.href = record.downloadUrl
      link.download = record.outputFileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      if (showMessage) ElMessage.success('开始下载')
    } catch (error: any) {
      console.error('下载文件失败:', error)
      if (showMessage) ElMessage.error('下载失败')
    }
  }

  const downloadMultipleFiles = (ids: string[], showMessage = true) => {
    let successCount = 0,
      failedCount = 0
    ids.forEach((id) => {
      try {
        downloadFile(id, false)
        successCount++
      } catch {
        failedCount++
      }
    })
    if (showMessage) {
      if (failedCount === 0) ElMessage.success(`成功下载 ${successCount} 个文件`)
      else ElMessage.warning(`成功 ${successCount} 个，失败 ${failedCount} 个`)
    }
  }

  const isDownloadable = (id: string): boolean => {
    const record = getRecordById(id)
    if (!record) return false
    if (record.status === 'expired') return false
    if (record.expiresAt && record.expiresAt < Date.now()) return false
    if (!record.downloadUrl) return false
    return true
  }

  const getTodayRecords = (): HistoryRecord[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return sortedRecords.value.filter((r) => r.createdAt >= today.getTime())
  }

  const getRecentRecords = (days: number): HistoryRecord[] => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)
    return sortedRecords.value.filter((r) => r.createdAt >= startDate.getTime())
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp
    if (diff < 60 * 1000) return '刚刚'
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`
    if (date.toDateString() === now.toDateString()) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  const getRemainingTime = (id: string): number => {
    const record = getRecordById(id)
    if (!record || !record.expiresAt) return 0
    const remaining = Math.floor((record.expiresAt - Date.now()) / 1000)
    return remaining > 0 ? remaining : 0
  }

  const formatRemainingTime = (seconds: number): string => {
    if (seconds <= 0) return '已过期'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}小时${minutes}分钟`
    if (minutes > 0) return `${minutes}分钟`
    return `${seconds}秒`
  }

  return {
    records,
    validRecords,
    sortedRecords,
    statistics,
    isProcessLogEnabled,
    addRecord,
    getRecordById,
    getRecordsByToolId,
    filterRecords,
    updateRecordStatus,
    removeRecord,
    clearAllRecords,
    cleanExpiredRecords,
    downloadFile,
    downloadMultipleFiles,
    isDownloadable,
    getTodayRecords,
    getRecentRecords,
    getRemainingTime,
    formatFileSize,
    formatDateTime,
    formatRemainingTime
  }
}
