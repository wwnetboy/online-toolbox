import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fetchToolList,
  fetchPublicToolList,
  fetchPublicCategoryList,
  fetchCategoryList,
  toggleToolStatus as apiToggleToolStatus,
  updateTool as apiUpdateTool,
  createTool as apiCreateTool,
  deleteTool as apiDeleteTool,
  updateCategory as apiUpdateCategory,
  createCategory as apiCreateCategory,
  deleteCategory as apiDeleteCategory,
  resetTools as apiResetTools,
  resetCategories as apiResetCategories,
  type ToolData,
  type CategoryData
} from '@/api/tools'
import { useUserStore } from '@/store/modules/user'

/**
 * 前端工具类型（兼容旧格式）
 */
export interface ManagedTool {
  id: string | number
  name: string
  description: string
  icon: string
  iconUrl?: string | null
  color: string
  category: string
  route: string
  badge?: 'hot' | 'new'
  enabled: boolean
  sort: number
  keywords: string[]
  createdAt?: string
  updatedAt?: string
  /** 后端数据库 ID */
  dbId?: number
  /** 后端分类 ID */
  categoryId?: number
}

/**
 * 工具分类定义
 */
export interface ToolCategory {
  id: string | number
  identifier?: string
  name: string
  icon: string
  sort: number
  enabled: boolean
  isSystem?: boolean
  /** 后端数据库 ID */
  dbId?: number
}

/**
 * 工具管理 Store
 *
 * 从后端 API 获取数据，支持：
 * - 工具的启用/禁用
 * - 工具的增删改查
 * - 分类管理
 */
export const useToolsStore = defineStore('tools', () => {
  // 工具列表
  const tools = ref<ManagedTool[]>([])
  // 分类列表
  const categories = ref<ToolCategory[]>([])
  // 是否已初始化
  const initialized = ref(false)
  // 加载状态
  const loading = ref(false)

  /**
   * 将后端工具数据转换为前端格式
   */
  const convertToolFromApi = (
    tool: ToolData,
    categoryMap: Map<number, CategoryData>
  ): ManagedTool => {
    // 优先使用后端返回的 category 对象，如果不存在才从 categoryMap 查找
    const category = tool.category || (tool.categoryId ? categoryMap.get(tool.categoryId) : null)
    // 从工具名称和描述生成默认关键词
    const keywords = [tool.name]
    if (tool.description) {
      // 提取描述中的关键词（简单分词）
      const descWords = tool.description
        .split(/[，,、。\s]+/)
        .filter((w) => w.length >= 2 && w.length <= 10)
      keywords.push(...descWords.slice(0, 5))
    }

    // 处理 iconUrl - 保持相对路径，让 Vite 代理处理
    const fullIconUrl = tool.iconUrl
    // 不需要转换为完整 URL，直接使用相对路径即可
    // Vite 的代理配置会自动将 /uploads 请求转发到后端

    return {
      id: tool.id,
      dbId: tool.id,
      name: tool.name,
      description: tool.description || '',
      icon: tool.icon || '',
      iconUrl: fullIconUrl || null,
      color: tool.color || '',
      category: category?.identifier || '',
      categoryId: tool.categoryId || undefined,
      route: tool.route,
      badge: tool.badge || undefined,
      enabled: tool.enabled,
      sort: tool.sort,
      keywords,
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt
    }
  }

  /**
   * 将后端分类数据转换为前端格式
   */
  const convertCategoryFromApi = (cat: CategoryData): ToolCategory => {
    return {
      id: cat.identifier,
      dbId: cat.id,
      identifier: cat.identifier,
      name: cat.name,
      icon: cat.icon || '',
      sort: cat.sort,
      enabled: cat.enabled,
      isSystem: cat.isSystem
    }
  }

  /**
   * 从后端加载数据
   */
  const loadFromApi = async () => {
    loading.value = true
    try {
      // 检查是否已登录
      const userStore = useUserStore()
      const isLoggedIn = !!userStore.accessToken

      // 根据登录状态选择 API
      const [categoryRes, toolRes] = await Promise.all([
        isLoggedIn ? fetchCategoryList() : fetchPublicCategoryList(),
        isLoggedIn ? fetchToolList({ size: 1000 }) : fetchPublicToolList()
      ])

      // 转换分类数据 - 处理可能的数组或对象响应
      const categoryData = Array.isArray(categoryRes)
        ? categoryRes
        : (categoryRes as any)?.records || []
      categories.value = categoryData.map(convertCategoryFromApi)

      // 创建分类映射
      const categoryMap = new Map<number, CategoryData>()
      categoryData.forEach((cat: CategoryData) => categoryMap.set(cat.id, cat))

      // 转换工具数据 - 处理可能的数组或对象响应
      const toolData = toolRes?.records || []
      tools.value = toolData.map((tool: ToolData) => convertToolFromApi(tool, categoryMap))
    } catch (error) {
      console.error('Failed to load tools from API:', error)
      // 如果 API 调用失败，保持空数据，前端可以正常显示空状态
      tools.value = []
      categories.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 初始化工具数据
   */
  const initTools = async () => {
    if (initialized.value) return

    await loadFromApi()
    initialized.value = true
  }

  /**
   * 强制刷新数据
   */
  const refresh = async () => {
    await loadFromApi()
  }

  /**
   * 获取所有启用的工具（前台使用）
   */
  const enabledTools = computed(() => {
    const enabledCategoryIds = categories.value.filter((c) => c.enabled).map((c) => c.id)

    return tools.value
      .filter((t) => t.enabled && enabledCategoryIds.includes(t.category))
      .sort((a, b) => a.sort - b.sort)
  })

  /**
   * 获取所有工具（后台管理使用）
   */
  const allTools = computed(() => {
    return [...tools.value].sort((a, b) => a.sort - b.sort)
  })

  /**
   * 按分类获取启用的工具
   */
  const getToolsByCategory = (categoryId: string) => {
    return enabledTools.value.filter((t) => t.category === categoryId)
  }

  /**
   * 获取启用的分类
   */
  const enabledCategories = computed(() => {
    return categories.value.filter((c) => c.enabled).sort((a, b) => a.sort - b.sort)
  })

  /**
   * 获取热门工具（badge 为 'hot' 的工具）
   */
  const hotTools = computed(() => {
    return enabledTools.value.filter((t) => t.badge === 'hot')
  })

  /**
   * 获取最新工具（badge 为 'new' 的工具）
   */
  const newTools = computed(() => {
    return enabledTools.value.filter((t) => t.badge === 'new')
  })

  /**
   * 更新工具
   */
  const updateTool = async (
    id: string | number,
    data: Partial<ManagedTool> & { badge?: 'hot' | 'new' | null }
  ) => {
    const tool = tools.value.find((t) => t.id === id || t.dbId === id)
    if (!tool || !tool.dbId) return false

    try {
      // 构建更新数据，badge 需要特殊处理（null 表示清除）
      const updateData: Record<string, any> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.icon !== undefined) updateData.icon = data.icon
      if (data.iconUrl !== undefined) updateData.iconUrl = data.iconUrl
      if (data.color !== undefined) updateData.color = data.color
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
      if (data.route !== undefined) updateData.route = data.route
      if (data.enabled !== undefined) updateData.enabled = data.enabled
      if (data.sort !== undefined) updateData.sort = data.sort
      // badge 可以是 'hot', 'new', null（清除）或 undefined（不更新）
      if ('badge' in data) {
        updateData.badge = data.badge === undefined ? null : data.badge
      }

      await apiUpdateTool(tool.dbId, updateData)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  /**
   * 添加工具
   */
  const addTool = async (tool: Omit<ManagedTool, 'sort' | 'createdAt' | 'updatedAt'>) => {
    try {
      await apiCreateTool({
        name: tool.name,
        description: tool.description,
        icon: tool.icon,
        iconUrl: tool.iconUrl,
        color: tool.color,
        categoryId: tool.categoryId,
        route: tool.route,
        badge: tool.badge,
        enabled: tool.enabled
      })
      await refresh()
      return true
    } catch {
      return false
    }
  }

  /**
   * 删除工具
   */
  const deleteTool = async (id: string | number) => {
    const tool = tools.value.find((t) => t.id === id || t.dbId === id)
    if (!tool || !tool.dbId) return false

    try {
      await apiDeleteTool(tool.dbId)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  /**
   * 切换工具启用状态
   */
  const toggleToolEnabled = async (id: string | number) => {
    const tool = tools.value.find((t) => t.id === id || t.dbId === id)
    if (!tool || !tool.dbId) return false

    try {
      await apiToggleToolStatus(tool.dbId)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  /**
   * 更新分类
   */
  const updateCategory = async (id: string | number, data: Partial<ToolCategory>) => {
    const cat = categories.value.find((c) => c.id === id || c.dbId === id)
    if (!cat || !cat.dbId) return false

    try {
      await apiUpdateCategory(cat.dbId, {
        name: data.name,
        icon: data.icon,
        sort: data.sort,
        enabled: data.enabled
      })
      await refresh()
      return true
    } catch {
      return false
    }
  }

  /**
   * 添加分类
   */
  const addCategory = async (category: ToolCategory) => {
    try {
      await apiCreateCategory({
        identifier: category.identifier || String(category.id),
        name: category.name,
        icon: category.icon,
        sort: category.sort,
        enabled: category.enabled
      })
      await refresh()
      return true
    } catch {
      return false
    }
  }

  /**
   * 删除分类
   */
  const deleteCategory = async (id: string | number) => {
    const cat = categories.value.find((c) => c.id === id || c.dbId === id)
    if (!cat || !cat.dbId) return false

    try {
      await apiDeleteCategory(cat.dbId)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  /**
   * 重置为默认数据
   */
  const resetToDefault = async () => {
    try {
      await Promise.all([apiResetTools(), apiResetCategories()])
      await refresh()
      return true
    } catch {
      return false
    }
  }

  return {
    // State
    tools,
    categories,
    initialized,
    loading,

    // Getters
    enabledTools,
    allTools,
    enabledCategories,
    hotTools,
    newTools,

    // Actions
    initTools,
    refresh,
    getToolsByCategory,
    updateTool,
    addTool,
    deleteTool,
    toggleToolEnabled,
    updateCategory,
    addCategory,
    deleteCategory,
    resetToDefault
  }
})
