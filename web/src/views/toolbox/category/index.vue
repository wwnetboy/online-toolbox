<template>
  <div class="flex flex-col gap-4 pb-5">
    <!-- 顶部搜索栏 -->
    <ToolSearchBar
      v-model="searchKeyword"
      :title="categoryInfo.name"
      :description="categoryInfo.description"
    />

    <!-- 工具卡片网格 -->
    <div v-if="filteredTools.length > 0">
      <ElRow :gutter="20">
        <ElCol
          v-for="tool in filteredTools"
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
    </div>

    <!-- 空状态 -->
    <div v-else class="flex-cc flex-col py-12">
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
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { Search } from '@element-plus/icons-vue'
  import ToolSearchBar from '../components/ToolSearchBar.vue'
  import ToolCard from '../index/components/ToolCard.vue'
  import { useToolsStore } from '@/store/modules/toolbox'
  import type { Tool } from '../index/types'

  defineOptions({ name: 'ToolboxCategory' })

  const router = useRouter()
  const route = useRoute()
  const searchKeyword = ref('')
  const toolsStore = useToolsStore()

  // 初始化工具数据
  onMounted(async () => {
    await toolsStore.initTools()
  })

  const currentCategory = computed(() => (route.meta.category as string) || '')

  const categoryInfoMap: Record<string, { name: string; description: string }> = {
    image: {
      name: '图片工具',
      description: '提供图片格式转换、压缩、裁剪、旋转、尺寸调整、长图拼接、水印添加等功能'
    },
    pdf: {
      name: 'PDF转换工具',
      description: '提供PDF合并、拆分、压缩、页面提取、删除、旋转、重排、水印添加、加密等功能'
    },
    text: {
      name: '文本工具',
      description: '提供文本对比、格式化、加密解密等功能'
    },
    document: {
      name: '文档转换工具',
      description: '提供Word、Excel、PPT、HTML等文档与PDF互相转换'
    },
    dev: {
      name: '开发工具',
      description: '提供JSON格式化、正则表达式测试、颜色选择器等开发辅助工具'
    },
    utils: {
      name: '实用工具',
      description: '提供二维码生成、Base64转换、时间戳转换、URL编码等实用小工具'
    },
    video: {
      name: '视频工具',
      description: '提供在线录屏、视频转GIF等视频处理功能'
    }
  }

  const categoryInfo = computed(() => {
    return categoryInfoMap[currentCategory.value] || { name: '工具分类', description: '' }
  })

  // 从 store 获取当前分类的启用工具
  const categoryTools = computed(() => {
    return toolsStore.getToolsByCategory(currentCategory.value) as Tool[]
  })

  const filteredTools = computed(() => {
    if (!searchKeyword.value.trim()) {
      return categoryTools.value
    }

    const keyword = searchKeyword.value.toLowerCase().trim()
    return categoryTools.value.filter((tool) => {
      const matchName = tool.name.toLowerCase().includes(keyword)
      const matchKeywords = tool.keywords.some((k) => k.toLowerCase().includes(keyword))
      const matchDescription = tool.description.toLowerCase().includes(keyword)
      return matchName || matchKeywords || matchDescription
    })
  })

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
