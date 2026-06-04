/**
 * 工具箱用户偏好组合式函数
 *
 * 提供工具页面的用户偏好配置管理功能
 *
 * ## 主要功能
 *
 * - 自动加载用户上次使用的配置
 * - 自动保存用户配置变更
 * - 支持恢复默认配置
 * - 支持配置变更监听
 *
 * ## 使用示例
 *
 * ```typescript
 * const { options, loadPreference, savePreference, resetToDefault, hasPreference } = usePreference('pdf-compress', {
 *   level: 'medium',
 *   compressImages: true
 * })
 * ```
 *
 * @module hooks/core/usePreference
 * @author Art Design Pro Team
 */

import { ref, watch, onMounted, type Ref } from 'vue'
import { useToolboxPreferenceStore } from '@/store/modules/toolbox/preference'

/**
 * 用户偏好配置选项
 */
export interface UsePreferenceOptions {
  /** 是否在挂载时自动加载偏好 */
  autoLoad?: boolean
  /** 是否在配置变更时自动保存 */
  autoSave?: boolean
  /** 自动保存的防抖延迟（毫秒） */
  debounceDelay?: number
}

/**
 * 用户偏好组合式函数返回值
 */
export interface UsePreferenceReturn<T extends Record<string, any>> {
  /** 当前配置选项（响应式） */
  options: Ref<T>
  /** 是否有保存的偏好配置 */
  hasPreference: Ref<boolean>
  /** 是否已加载偏好配置 */
  isLoaded: Ref<boolean>
  /** 加载用户偏好配置 */
  loadPreference: () => T
  /** 保存当前配置为用户偏好 */
  savePreference: () => void
  /** 重置为默认配置 */
  resetToDefault: () => void
  /** 更新部分配置 */
  updateOptions: (partialOptions: Partial<T>) => void
  /** 获取单个配置项的值 */
  getOptionValue: <K extends keyof T>(key: K, defaultValue?: T[K]) => T[K]
  /** 设置单个配置项的值 */
  setOptionValue: <K extends keyof T>(key: K, value: T[K]) => void
}

/**
 * 工具箱用户偏好组合式函数
 *
 * @param toolId 工具ID，用于标识不同工具的配置
 * @param defaultOptions 默认配置选项
 * @param hookOptions 组合式函数选项
 * @returns 用户偏好管理相关的方法和状态
 */
export function usePreference<T extends Record<string, any>>(
  toolId: string,
  defaultOptions: T,
  hookOptions: UsePreferenceOptions = {}
): UsePreferenceReturn<T> {
  const { autoLoad = true, autoSave = true, debounceDelay = 500 } = hookOptions

  // 获取偏好存储
  const preferenceStore = useToolboxPreferenceStore()

  // 当前配置选项
  const options = ref<T>({ ...defaultOptions }) as Ref<T>

  // 是否有保存的偏好配置
  const hasPreference = ref(false)

  // 是否已加载偏好配置
  const isLoaded = ref(false)

  // 防抖定时器
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 加载用户偏好配置
   */
  const loadPreference = (): T => {
    const savedOptions = preferenceStore.getOptions(toolId)
    hasPreference.value = preferenceStore.hasPreference(toolId)

    if (hasPreference.value && Object.keys(savedOptions).length > 0) {
      // 合并保存的配置和默认配置，确保新增的默认配置项也能生效
      options.value = {
        ...defaultOptions,
        ...savedOptions
      }
    } else {
      options.value = { ...defaultOptions }
    }

    isLoaded.value = true
    return options.value
  }

  /**
   * 保存当前配置为用户偏好
   */
  const savePreference = (): void => {
    preferenceStore.savePreference(toolId, { ...options.value })
    hasPreference.value = true
  }

  /**
   * 重置为默认配置
   */
  const resetToDefault = (): void => {
    options.value = { ...defaultOptions }
    // 同时清除保存的偏好
    preferenceStore.removePreference(toolId)
    hasPreference.value = false
  }

  /**
   * 更新部分配置
   */
  const updateOptions = (partialOptions: Partial<T>): void => {
    options.value = {
      ...options.value,
      ...partialOptions
    }
  }

  /**
   * 获取单个配置项的值
   */
  const getOptionValue = <K extends keyof T>(key: K, defaultValue?: T[K]): T[K] => {
    return options.value[key] !== undefined ? options.value[key] : (defaultValue as T[K])
  }

  /**
   * 设置单个配置项的值
   */
  const setOptionValue = <K extends keyof T>(key: K, value: T[K]): void => {
    options.value = {
      ...options.value,
      [key]: value
    }
  }

  /**
   * 防抖保存
   */
  const debouncedSave = (): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      savePreference()
    }, debounceDelay)
  }

  // 监听配置变更，自动保存
  if (autoSave) {
    watch(
      options,
      () => {
        if (isLoaded.value) {
          debouncedSave()
        }
      },
      { deep: true }
    )
  }

  // 组件挂载时自动加载偏好
  if (autoLoad) {
    onMounted(() => {
      loadPreference()
    })
  }

  return {
    options,
    hasPreference,
    isLoaded,
    loadPreference,
    savePreference,
    resetToDefault,
    updateOptions,
    getOptionValue,
    setOptionValue
  }
}

export default usePreference
