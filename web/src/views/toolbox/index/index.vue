<template>
  <div class="flex flex-col gap-4 pb-5">
    <!-- 顶部搜索栏 -->
    <ToolSearchBar
      v-model="searchKeyword"
      title="所有工具"
      description="免费在线工具，所有处理均在本地完成"
    />

    <!-- 搜索结果提示 -->
    <div v-if="searchKeyword && filteredTools.length === 0" class="flex-cc flex-col py-12">
      <ElEmpty description="未找到相关工具">
        <template #image>
          <ElIcon class="text-5xl text-g-500"><Search /></ElIcon>
        </template>
        <template #description>
          <p class="text-lg text-g-600">未找到相关工具</p>
          <p class="text-sm text-g-500 mt-2">请尝试其他关键词</p>
        </template>
      </ElEmpty>
    </div>

    <!-- 工具分类展示 -->
    <template v-else>
      <!-- 最热工具和最新工具 - 两列布局 -->
      <ElRow v-if="hotAndNewCategories.length > 0" :gutter="16">
        <ElCol
          v-for="category in hotAndNewCategories"
          :key="category.id"
          :xs="24"
          :sm="24"
          :md="12"
          :lg="12"
          :xl="12"
        >
          <ElCard shadow="never" class="art-card h-full">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold flex items-center gap-2">
                <ArtSvgIcon :icon="category.icon" class="text-xl text-theme" />
                {{ category.name }}
              </h2>
            </div>

            <ElRow :gutter="20">
              <ElCol
                v-for="tool in getDisplayTools(category.tools)"
                :key="tool.id"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="8"
                :xl="8"
                class="mb-5"
              >
                <ToolCardCompact :tool="tool" @click="navigateToTool(tool)" />
              </ElCol>
            </ElRow>
          </ElCard>
        </ElCol>
      </ElRow>

      <!-- 其他工具分类 - 原有布局 -->
      <ElCard
        v-for="category in otherCategories"
        :key="category.id"
        shadow="never"
        class="art-card"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <ArtSvgIcon :icon="category.icon" class="text-xl text-theme" />
            {{ category.name }}
          </h2>
        </div>

        <ElRow :gutter="20">
          <ElCol
            v-for="tool in getDisplayTools(category.tools)"
            :key="tool.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8"
            :xl="8"
            class="mb-5"
          >
            <ToolCard :tool="tool" @click="navigateToTool(tool)" />
          </ElCol>
        </ElRow>
      </ElCard>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { Search } from '@element-plus/icons-vue'
  import ToolSearchBar from '../components/ToolSearchBar.vue'
  import ToolCard from './components/ToolCard.vue'
  import ToolCardCompact from './components/ToolCardCompact.vue'
  import { useToolsStore } from '@/store/modules/toolbox'
  import type { Tool, ToolCategory } from './types'

  defineOptions({ name: 'ToolboxIndex' })

  const router = useRouter()
  const searchKeyword = ref('')
  const toolsStore = useToolsStore()

  // 初始化工具数据
  onMounted(async () => {
    await toolsStore.initTools()
  })

  // 工具分类数据（从 store 中获取启用的工具）
  const categories = computed<ToolCategory[]>(() => {
    return toolsStore.enabledCategories
      .map((config) => ({
        id: config.id,
        name: config.name,
        icon: config.icon,
        tools: toolsStore.getToolsByCategory(config.id) as Tool[]
      }))
      .filter((category) => category.tools.length > 0)
  })

  // 最热工具分类（虚拟分类）
  const hotCategory = computed<ToolCategory | null>(() => {
    const hotTools = toolsStore.hotTools
    if (hotTools.length === 0) return null
    return {
      id: 'hot',
      name: '最热工具',
      icon: 'ri:fire-line',
      tools: hotTools as Tool[]
    }
  })

  // 最新工具分类（虚拟分类）
  const newCategory = computed<ToolCategory | null>(() => {
    const newTools = toolsStore.newTools
    if (newTools.length === 0) return null
    return {
      id: 'new',
      name: '最新工具',
      icon: 'ri:star-line',
      tools: newTools as Tool[]
    }
  })

  // 搜索过滤后的工具
  const filteredTools = computed(() => {
    if (!searchKeyword.value.trim()) {
      return []
    }

    const keyword = searchKeyword.value.toLowerCase().trim()
    const allTools: Tool[] = []

    categories.value.forEach((category) => {
      category.tools.forEach((tool) => {
        const matchName = tool.name.toLowerCase().includes(keyword)
        const matchKeywords = tool.keywords.some((k) => k.toLowerCase().includes(keyword))
        const matchDescription = tool.description.toLowerCase().includes(keyword)

        if (matchName || matchKeywords || matchDescription) {
          allTools.push(tool)
        }
      })
    })

    return allTools
  })

  // 显示的分类（搜索时显示搜索结果，否则显示所有分类）
  const displayCategories = computed(() => {
    if (searchKeyword.value.trim()) {
      return [
        {
          id: 'search-results',
          name: '搜索结果',
          icon: 'ri:search-line',
          tools: filteredTools.value
        }
      ]
    }
    return categories.value
  })

  // 最热工具和最新工具（两列布局）
  const hotAndNewCategories = computed(() => {
    if (searchKeyword.value.trim()) {
      return []
    }
    const result: ToolCategory[] = []
    if (hotCategory.value) result.push(hotCategory.value)
    if (newCategory.value) result.push(newCategory.value)
    return result
  })

  // 其他工具分类（原有布局）
  const otherCategories = computed(() => {
    if (searchKeyword.value.trim()) {
      return displayCategories.value
    }
    return categories.value
  })

  // 获取要显示的工具（首页显示全部工具）
  const getDisplayTools = (tools: Tool[]) => {
    return tools
  }

  // 导航到工具页面
  const navigateToTool = (tool: Tool) => {
    // 检查当前是否在前台路由（不以 /admin 开头）
    const isPortal = !router.currentRoute.value.path.startsWith('/admin')
    if (isPortal) {
      // 前台路由：将 /toolbox-xxx/yyy 转换为 /xxx/yyy
      const portalRoute = tool.route
        .replace('/toolbox-image/', '/image/')
        .replace('/toolbox-video/', '/video/')
        .replace('/toolbox-pdf/', '/pdf/')
        .replace('/toolbox-document/', '/document/')
        .replace('/toolbox-utils/', '/utils/')
      router.push(portalRoute)
    } else {
      router.push(tool.route)
    }
  }
</script>

<style scoped lang="scss">
  .h-full {
    height: 100%;
  }
</style>
