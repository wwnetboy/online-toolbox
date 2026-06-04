<!-- 工具箱使用统计组件 -->
<template>
  <div class="art-card p-5 mb-5 max-sm:mb-4">
    <div class="art-card-header mb-4">
      <div class="title">
        <h4>工具使用统计</h4>
        <p>
          {{ timeRangeLabel }}使用量
          <span class="text-success font-medium">{{ stats.totalUsage }}</span> 次
        </p>
      </div>
      <div class="actions">
        <ElRadioGroup v-model="timeRange" size="small" @change="handleTimeRangeChange">
          <ElRadioButton value="today">今日</ElRadioButton>
          <ElRadioButton value="week">本周</ElRadioButton>
          <ElRadioButton value="month">本月</ElRadioButton>
        </ElRadioGroup>
      </div>
    </div>

    <!-- 统计卡片 - 使用 ArtStatsCard 组件 -->
    <ElRow :gutter="16" class="mb-4">
      <ElCol :xs="12" :sm="6" v-for="card in statsCards" :key="card.id" class="mb-4">
        <ArtStatsCard
          :icon="card.icon"
          :iconStyle="card.iconStyle"
          :count="card.count"
          :description="card.description"
          :decimals="0"
          separator=","
        />
      </ElCol>
    </ElRow>

    <!-- 工具排行榜 -->
    <div class="tool-ranking">
      <h5 class="text-sm font-medium text-gray-700 mb-3">热门工具排行</h5>
      <div v-if="toolRanking.length > 0" class="ranking-list">
        <div
          v-for="(item, index) in toolRanking"
          :key="item.toolId"
          class="ranking-item flex items-center py-2 border-b border-gray-100 last:border-0"
        >
          <div
            class="rank-badge w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3"
            :class="getRankBadgeClass(index)"
          >
            {{ index + 1 }}
          </div>
          <div class="tool-info flex-1">
            <div class="flex items-center">
              <span class="font-medium">{{ item.toolName }}</span>
              <ElTag :type="getCategoryTagType(item.category)" size="small" class="ml-2">
                {{ getCategoryLabel(item.category) }}
              </ElTag>
            </div>
          </div>
          <div class="usage-count text-right">
            <div class="font-bold text-gray-800">{{ item.count }}</div>
            <div class="text-xs text-gray-500">次</div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-400">
        <ArtSvgIcon icon="ri:inbox-line" class="text-4xl mb-2" />
        <p>暂无使用记录</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted, watch } from 'vue'
  import { useToolboxHistoryStore, type HistoryRecord } from '@/store/modules/toolbox/history'

  // 时间范围类型
  type TimeRangeType = 'today' | 'week' | 'month'

  // 时间范围
  const timeRange = ref<TimeRangeType>('today')

  // 历史记录 store
  const historyStore = useToolboxHistoryStore()

  // 统计数据
  const stats = reactive({
    totalUsage: 0,
    pdfUsage: 0,
    imageUsage: 0,
    videoUsage: 0
  })

  // 统计卡片配置 - 使用浅色背景 + 彩色图标
  const statsCards = computed(() => [
    {
      id: 'total',
      icon: 'ri:bar-chart-box-line',
      iconStyle: 'bg-theme/12 !text-theme',
      count: stats.totalUsage,
      description: '总使用次数'
    },
    {
      id: 'pdf',
      icon: 'ri:file-pdf-2-line',
      iconStyle: 'bg-error/12 !text-error',
      count: stats.pdfUsage,
      description: 'PDF工具'
    },
    {
      id: 'image',
      icon: 'ri:image-line',
      iconStyle: 'bg-success/12 !text-success',
      count: stats.imageUsage,
      description: '图片工具'
    },
    {
      id: 'video',
      icon: 'ri:video-line',
      iconStyle: 'bg-warning/12 !text-warning',
      count: stats.videoUsage,
      description: '视频工具'
    }
  ])

  // 工具排行数据
  interface ToolRankingItem {
    toolId: string
    toolName: string
    category: string
    count: number
  }

  const toolRanking = ref<ToolRankingItem[]>([])

  // 时间范围标签
  const timeRangeLabel = computed(() => {
    const labels: Record<TimeRangeType, string> = {
      today: '今日',
      week: '本周',
      month: '本月'
    }
    return labels[timeRange.value]
  })

  /**
   * 获取时间范围的起始时间戳
   */
  const getTimeRangeStart = (range: TimeRangeType): number => {
    const now = new Date()

    switch (range) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return start.getTime()
      }
      case 'week': {
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周一为一周开始
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
        return start.getTime()
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        return start.getTime()
      }
      default:
        return 0
    }
  }

  /**
   * 根据工具ID判断分类
   */
  const getToolCategory = (toolId: string): string => {
    if (toolId.startsWith('pdf-') || toolId.startsWith('image-to-pdf')) return 'pdf'
    if (toolId.startsWith('image-')) return 'image'
    if (toolId.startsWith('video-')) return 'video'
    if (toolId.startsWith('utils-')) return 'utils'
    if (toolId.startsWith('document-')) return 'document'
    return 'other'
  }

  /**
   * 计算统计数据
   */
  const calculateStats = () => {
    const startTime = getTimeRangeStart(timeRange.value)
    const records = historyStore.records.filter(
      (record: HistoryRecord) => record.createdAt >= startTime && record.status === 'success'
    )

    // 重置统计
    stats.totalUsage = records.length
    stats.pdfUsage = 0
    stats.imageUsage = 0
    stats.videoUsage = 0

    // 工具使用计数
    const toolCounts: Record<
      string,
      { toolId: string; toolName: string; category: string; count: number }
    > = {}

    records.forEach((record: HistoryRecord) => {
      const category = getToolCategory(record.toolId)

      // 分类统计
      switch (category) {
        case 'pdf':
          stats.pdfUsage++
          break
        case 'image':
          stats.imageUsage++
          break
        case 'video':
          stats.videoUsage++
          break
      }

      // 工具排行统计
      if (!toolCounts[record.toolId]) {
        toolCounts[record.toolId] = {
          toolId: record.toolId,
          toolName: record.toolName,
          category,
          count: 0
        }
      }
      toolCounts[record.toolId].count++
    })

    // 排序并取前5
    toolRanking.value = Object.values(toolCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  /**
   * 获取排名徽章样式
   */
  const getRankBadgeClass = (index: number): string => {
    if (index === 0) return 'bg-yellow-400 text-white'
    if (index === 1) return 'bg-gray-400 text-white'
    if (index === 2) return 'bg-orange-400 text-white'
    return 'bg-gray-200 text-gray-600'
  }

  /**
   * 获取分类标签类型
   */
  const getCategoryTagType = (category: string): '' | 'success' | 'warning' | 'info' | 'danger' => {
    const types: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
      pdf: 'danger',
      image: 'success',
      video: 'warning',
      utils: 'info',
      document: '',
      other: ''
    }
    return types[category] || ''
  }

  /**
   * 获取分类标签文本
   */
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      pdf: 'PDF',
      image: '图片',
      video: '视频',
      utils: '实用',
      document: '文档',
      other: '其他'
    }
    return labels[category] || '其他'
  }

  /**
   * 处理时间范围变化
   */
  const handleTimeRangeChange = () => {
    calculateStats()
  }

  // 监听历史记录变化
  watch(
    () => historyStore.records,
    () => {
      calculateStats()
    },
    { deep: true }
  )

  onMounted(() => {
    calculateStats()
  })
</script>

<style scoped lang="scss">
  .art-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;

    .title {
      h4 {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 4px;
      }

      p {
        font-size: 12px;
        color: #909399;
      }
    }
  }

  .ranking-item {
    transition: background-color 0.2s;
    padding: 8px 4px;
    border-radius: 4px;

    &:hover {
      background-color: #f5f7fa;
    }
  }

  @media (max-width: 640px) {
    .art-card-header {
      .actions {
        width: 100%;

        :deep(.el-radio-group) {
          width: 100%;
          display: flex;

          .el-radio-button {
            flex: 1;

            .el-radio-button__inner {
              width: 100%;
            }
          }
        }
      }
    }
  }
</style>
