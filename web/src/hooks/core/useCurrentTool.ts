import { computed, ref, readonly, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToolsStore } from '@/store/modules/toolbox'

/**
 * 获取当前工具信息的 Hook
 * 根据当前路由从 toolsStore 中查找对应的工具
 *
 * @param options.cache - 是否缓存工具信息（默认 true），缓存后路由切换时不会更新
 */
export function useCurrentTool(options: { cache?: boolean } = { cache: true }) {
  const route = useRoute()
  const toolsStore = useToolsStore()

  // 查找工具的函数
  const findTool = (path: string) => {
    // 在所有工具中查找匹配的工具
    // 前台路由格式：/pdf/merge
    // 后台路由格式：/toolbox-pdf/merge
    const tool = toolsStore.allTools.find((t) => {
      // 将后台路由格式转换为前台格式进行匹配
      const portalRoute = t.route
        .replace('/toolbox-image/', '/image/')
        .replace('/toolbox-video/', '/video/')
        .replace('/toolbox-pdf/', '/pdf/')
        .replace('/toolbox-document/', '/document/')
        .replace('/toolbox-utils/', '/utils/')

      return portalRoute === path || t.route === path
    })

    return tool || null
  }

  // 如果启用缓存，立即查找并缓存工具信息，同时监听 allTools 变化
  if (options.cache) {
    const cachedTool = ref(findTool(route.path))

    // 如果初始查找失败（数据未加载），监听 allTools 变化后重新查找
    if (!cachedTool.value) {
      const stopWatch = watch(
        () => toolsStore.allTools.length,
        (newLength) => {
          if (newLength > 0 && !cachedTool.value) {
            cachedTool.value = findTool(route.path)
            // 找到后停止监听
            if (cachedTool.value) {
              stopWatch()
            }
          }
        },
        { immediate: true }
      )
    }

    return {
      currentTool: readonly(cachedTool),
      toolIcon: computed(() => cachedTool.value?.icon || 'ri:tools-line'),
      toolIconUrl: computed(() => cachedTool.value?.iconUrl || undefined),
      toolColor: computed(() => cachedTool.value?.color || '#409eff'),
      toolName: computed(() => cachedTool.value?.name || ''),
      toolDescription: computed(() => cachedTool.value?.description || '')
    }
  }

  // 不缓存时使用响应式 computed（原有行为）
  const currentTool = computed(() => findTool(route.path))

  return {
    currentTool,
    toolIcon: computed(() => currentTool.value?.icon || 'ri:tools-line'),
    toolIconUrl: computed(() => currentTool.value?.iconUrl || undefined),
    toolColor: computed(() => currentTool.value?.color || '#409eff'),
    toolName: computed(() => currentTool.value?.name || ''),
    toolDescription: computed(() => currentTool.value?.description || '')
  }
}
