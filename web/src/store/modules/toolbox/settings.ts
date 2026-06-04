import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ToolboxSettings {
  maxFileSize: number
  maxBatchCount: number
  processTimeout: number
  fileRetentionHours: number
  maxHistoryCount: number
  autoCleanHistory: boolean
  enableFeedback: boolean
  enableFileTypeCheck: boolean
  enableProcessLog: boolean
  allowedFileTypes: string[]
}

const DEFAULT_SETTINGS: ToolboxSettings = {
  maxFileSize: 100,
  maxBatchCount: 20,
  processTimeout: 60,
  fileRetentionHours: 1,
  maxHistoryCount: 100,
  autoCleanHistory: true,
  enableFeedback: true,
  enableFileTypeCheck: true,
  enableProcessLog: true,
  allowedFileTypes: ['pdf', 'image', 'doc', 'xls', 'ppt']
}

export const useToolboxSettingsStore = defineStore(
  'toolboxSettings',
  () => {
    const settings = ref<ToolboxSettings>({ ...DEFAULT_SETTINGS })

    const isProcessLogEnabled = computed(() => settings.value.enableProcessLog)
    const isFeedbackEnabled = computed(() => settings.value.enableFeedback)
    const isFileTypeCheckEnabled = computed(() => settings.value.enableFileTypeCheck)
    const maxFileSizeBytes = computed(() => settings.value.maxFileSize * 1024 * 1024)
    const processTimeoutMs = computed(() => settings.value.processTimeout * 1000)
    const fileRetentionMs = computed(() => settings.value.fileRetentionHours * 60 * 60 * 1000)

    const updateSettings = (newSettings: Partial<ToolboxSettings>) => {
      settings.value = { ...settings.value, ...newSettings }
    }

    const resetToDefault = () => {
      settings.value = { ...DEFAULT_SETTINGS }
    }

    const isFileTypeAllowed = (fileType: string): boolean => {
      if (!settings.value.enableFileTypeCheck) return true
      return settings.value.allowedFileTypes.includes(fileType.toLowerCase())
    }

    const isFileSizeAllowed = (fileSize: number): boolean => {
      return fileSize <= maxFileSizeBytes.value
    }

    return {
      settings,
      isProcessLogEnabled,
      isFeedbackEnabled,
      isFileTypeCheckEnabled,
      maxFileSizeBytes,
      processTimeoutMs,
      fileRetentionMs,
      updateSettings,
      resetToDefault,
      isFileTypeAllowed,
      isFileSizeAllowed
    }
  },
  {
    persist: {
      key: 'toolboxSettings',
      storage: localStorage
    }
  }
)
