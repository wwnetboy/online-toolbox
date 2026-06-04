/**
 * 工具箱用户偏好状态管理模块
 *
 * 提供用户工具配置偏好的状态管理
 *
 * ## 主要功能
 *
 * - 用户工具配置记忆
 * - 配置自动填充
 * - 配置重置
 * - 最近使用时间记录
 *
 * ## 使用场景
 *
 * - 记住用户上次使用的工具配置
 * - 自动填充常用配置
 * - 提高用户操作效率
 *
 * ## 持久化
 *
 * - 使用 localStorage 存储
 * - 存储键：sys-v{version}-toolboxPreference
 *
 * @module store/modules/toolbox/preference
 * @author Art Design Pro Team
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 用户偏好配置项接口
 */
export interface UserPreference {
  /** 工具ID */
  toolId: string
  /** 工具配置选项（JSON格式） */
  options: Record<string, any>
  /** 最后使用时间 */
  lastUsedAt: number
}

/**
 * 工具箱用户偏好状态管理
 */
export const useToolboxPreferenceStore = defineStore(
  'toolboxPreference',
  () => {
    /** 用户偏好配置列表 */
    const preferences = ref<UserPreference[]>([])

    /**
     * 获取按最后使用时间倒序排列的偏好配置
     */
    const sortedPreferences = computed(() => {
      return [...preferences.value].sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    })

    /**
     * 获取最近使用的工具列表（前10个）
     */
    const recentTools = computed(() => {
      return sortedPreferences.value.slice(0, 10).map((pref) => ({
        toolId: pref.toolId,
        lastUsedAt: pref.lastUsedAt
      }))
    })

    /**
     * 根据工具ID获取用户偏好配置
     * @param toolId 工具ID
     * @returns 用户偏好配置，如果不存在则返回undefined
     */
    const getPreference = (toolId: string): UserPreference | undefined => {
      return preferences.value.find((pref) => pref.toolId === toolId)
    }

    /**
     * 获取工具的配置选项
     * @param toolId 工具ID
     * @returns 配置选项对象，如果不存在则返回空对象
     */
    const getOptions = (toolId: string): Record<string, any> => {
      const preference = getPreference(toolId)
      return preference?.options || {}
    }

    /**
     * 保存或更新用户偏好配置
     * @param toolId 工具ID
     * @param options 配置选项
     */
    const savePreference = (toolId: string, options: Record<string, any>) => {
      const existingIndex = preferences.value.findIndex((pref) => pref.toolId === toolId)

      const newPreference: UserPreference = {
        toolId,
        options,
        lastUsedAt: Date.now()
      }

      if (existingIndex !== -1) {
        // 更新现有配置
        preferences.value[existingIndex] = newPreference
      } else {
        // 添加新配置
        preferences.value.push(newPreference)
      }
    }

    /**
     * 更新工具的部分配置选项
     * @param toolId 工具ID
     * @param partialOptions 部分配置选项
     */
    const updateOptions = (toolId: string, partialOptions: Record<string, any>) => {
      const preference = getPreference(toolId)

      if (preference) {
        // 合并现有配置和新配置
        preference.options = {
          ...preference.options,
          ...partialOptions
        }
        preference.lastUsedAt = Date.now()
      } else {
        // 创建新配置
        savePreference(toolId, partialOptions)
      }
    }

    /**
     * 删除指定工具的偏好配置
     * @param toolId 工具ID
     */
    const removePreference = (toolId: string) => {
      const index = preferences.value.findIndex((pref) => pref.toolId === toolId)
      if (index !== -1) {
        preferences.value.splice(index, 1)
      }
    }

    /**
     * 清空所有偏好配置
     */
    const clearAllPreferences = () => {
      preferences.value = []
    }

    /**
     * 检查工具是否有保存的偏好配置
     * @param toolId 工具ID
     * @returns 是否存在偏好配置
     */
    const hasPreference = (toolId: string): boolean => {
      return preferences.value.some((pref) => pref.toolId === toolId)
    }

    /**
     * 获取指定配置项的值
     * @param toolId 工具ID
     * @param key 配置项键名
     * @param defaultValue 默认值
     * @returns 配置项的值，如果不存在则返回默认值
     */
    const getOptionValue = <T = any>(
      toolId: string,
      key: string,
      defaultValue?: T
    ): T | undefined => {
      const options = getOptions(toolId)
      return options[key] !== undefined ? options[key] : defaultValue
    }

    /**
     * 设置指定配置项的值
     * @param toolId 工具ID
     * @param key 配置项键名
     * @param value 配置项的值
     */
    const setOptionValue = (toolId: string, key: string, value: any) => {
      updateOptions(toolId, { [key]: value })
    }

    /**
     * 更新最后使用时间
     * @param toolId 工具ID
     */
    const updateLastUsedTime = (toolId: string) => {
      const preference = getPreference(toolId)
      if (preference) {
        preference.lastUsedAt = Date.now()
      }
    }

    /**
     * 获取偏好配置统计信息
     */
    const getStatistics = computed(() => {
      return {
        total: preferences.value.length,
        recentCount: recentTools.value.length
      }
    })

    /**
     * 导出所有偏好配置（用于备份）
     * @returns JSON字符串
     */
    const exportPreferences = (): string => {
      return JSON.stringify(preferences.value, null, 2)
    }

    /**
     * 导入偏好配置（用于恢复）
     * @param jsonString JSON字符串
     * @returns 是否导入成功
     */
    const importPreferences = (jsonString: string): boolean => {
      try {
        const imported = JSON.parse(jsonString) as UserPreference[]
        if (Array.isArray(imported)) {
          preferences.value = imported
          return true
        }
        return false
      } catch (error) {
        console.error('导入偏好配置失败:', error)
        return false
      }
    }

    return {
      preferences,
      sortedPreferences,
      recentTools,
      getStatistics,
      getPreference,
      getOptions,
      savePreference,
      updateOptions,
      removePreference,
      clearAllPreferences,
      hasPreference,
      getOptionValue,
      setOptionValue,
      updateLastUsedTime,
      exportPreferences,
      importPreferences
    }
  },
  {
    persist: {
      key: 'toolboxPreference',
      storage: localStorage
    }
  }
)
