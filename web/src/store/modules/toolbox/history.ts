import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface HistoryRecord {
  id: string
  toolId: string
  toolName: string
  fileName: string
  outputFileName: string
  fileSize: number
  outputFileSize?: number
  processType: string
  createdAt: number
  expiresAt: number
  downloadUrl?: string
  status: 'success' | 'expired' | 'error'
  errorMessage?: string
}

const MAX_HISTORY_COUNT = 100
const DEFAULT_EXPIRY_TIME = 60 * 60 * 1000

export const useToolboxHistoryStore = defineStore(
  'toolboxHistory',
  () => {
    const records = ref<HistoryRecord[]>([])

    const validRecords = computed(() => {
      const now = Date.now()
      return records.value.filter((record) => {
        if (record.status === 'expired') return false
        if (record.expiresAt && record.expiresAt < now) {
          record.status = 'expired'
          return false
        }
        return true
      })
    })

    const sortedRecords = computed(() => {
      return [...records.value].sort((a, b) => b.createdAt - a.createdAt)
    })

    const generateId = (): string => {
      return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }

    const addRecord = (
      record: Omit<HistoryRecord, 'id' | 'createdAt' | 'expiresAt' | 'status'>
    ): string => {
      const now = Date.now()
      const newRecord: HistoryRecord = {
        ...record,
        id: generateId(),
        createdAt: now,
        expiresAt: now + DEFAULT_EXPIRY_TIME,
        status: 'success'
      }
      records.value.unshift(newRecord)
      if (records.value.length > MAX_HISTORY_COUNT) {
        records.value = records.value.slice(0, MAX_HISTORY_COUNT)
      }
      return newRecord.id
    }

    const getRecordById = (id: string): HistoryRecord | undefined => {
      return records.value.find((record) => record.id === id)
    }

    const getRecordsByToolId = (toolId: string): HistoryRecord[] => {
      return records.value.filter((record) => record.toolId === toolId)
    }

    const updateRecordStatus = (
      id: string,
      status: HistoryRecord['status'],
      errorMessage?: string
    ) => {
      const record = records.value.find((r) => r.id === id)
      if (record) {
        record.status = status
        if (errorMessage) record.errorMessage = errorMessage
      }
    }

    const removeRecord = (id: string) => {
      const index = records.value.findIndex((record) => record.id === id)
      if (index !== -1) {
        const record = records.value[index]
        if (record.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(record.downloadUrl)
        records.value.splice(index, 1)
      }
    }

    const clearAllRecords = () => {
      records.value.forEach((record) => {
        if (record.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(record.downloadUrl)
      })
      records.value = []
    }

    const cleanExpiredRecords = () => {
      const now = Date.now()
      records.value = records.value.filter((record) => {
        if (record.expiresAt && record.expiresAt < now) {
          if (record.downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(record.downloadUrl)
          return false
        }
        return true
      })
    }

    const getStatistics = computed(() => ({
      total: records.value.length,
      success: records.value.filter((r) => r.status === 'success').length,
      expired: records.value.filter((r) => r.status === 'expired').length,
      error: records.value.filter((r) => r.status === 'error').length
    }))

    return {
      records,
      validRecords,
      sortedRecords,
      getStatistics,
      addRecord,
      getRecordById,
      getRecordsByToolId,
      updateRecordStatus,
      removeRecord,
      clearAllRecords,
      cleanExpiredRecords
    }
  },
  {
    persist: {
      key: 'toolboxHistory',
      storage: localStorage,
      pick: ['records']
    }
  }
)
