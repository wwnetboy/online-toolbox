<template>
  <ElRow :gutter="20" class="flex">
    <ElCol v-for="(item, index) in dataList" :key="index" :sm="12" :md="6" :lg="6">
      <div class="art-card relative flex flex-col justify-center h-35 px-5 mb-5 max-sm:mb-4">
        <span class="text-g-700 text-sm">{{ item.des }}</span>
        <template v-if="loading">
          <ElSkeleton :rows="1" animated class="mt-2" />
        </template>
        <template v-else>
          <ArtCountTo class="text-[26px] font-medium mt-2" :target="item.num" :duration="1300" />
          <div class="flex-c mt-1">
            <span class="text-xs text-g-600">较上周</span>
            <span
              class="ml-1 text-xs font-semibold"
              :class="[item.change.indexOf('+') === -1 ? 'text-danger' : 'text-success']"
            >
              {{ item.change }}
            </span>
          </div>
        </template>
        <div
          class="absolute top-0 bottom-0 right-5 m-auto size-12.5 rounded-xl flex-cc bg-theme/10"
        >
          <ArtSvgIcon :icon="item.icon" class="text-xl text-theme" />
        </div>
      </div>
    </ElCol>
  </ElRow>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, onUnmounted } from 'vue'
  import { fetchStats, fetchOnlineVisitors } from '@/api/stats'
  import { calculateTrend, formatTrendPercent } from '@/services/stats/trend-calculator'
  import type { StatsData, StatsTimeRange } from '@/types/stats'

  interface CardDataItem {
    des: string
    icon: string
    key: keyof StatsData
    num: number
    change: string
  }

  // 加载状态
  const loading = ref(true)

  // 在线访客实时更新定时器
  let onlineVisitorTimer: ReturnType<typeof setInterval> | null = null

  /**
   * 卡片统计数据列表
   * 展示总访问次数、在线访客数、点击量和新用户等核心数据指标
   */
  const dataList = reactive<CardDataItem[]>([
    {
      des: '总访问次数',
      icon: 'ri:pie-chart-line',
      key: 'totalVisits',
      num: 0,
      change: '+0%'
    },
    {
      des: '在线访客数',
      icon: 'ri:group-line',
      key: 'onlineVisitors',
      num: 0,
      change: '+0%'
    },
    {
      des: '点击量',
      icon: 'ri:fire-line',
      key: 'clickCount',
      num: 0,
      change: '+0%'
    },
    {
      des: '新用户',
      icon: 'ri:progress-2-line',
      key: 'newUsers',
      num: 0,
      change: '+0%'
    }
  ])

  /**
   * 加载统计数据
   */
  const loadStats = async (timeRange: StatsTimeRange = 'week') => {
    loading.value = true
    try {
      const stats = await fetchStats(timeRange)

      // 更新各项统计数据
      dataList.forEach((item) => {
        const statItem = stats[item.key]
        if (statItem) {
          item.num = statItem.value
          item.change = formatTrendPercent(statItem.trend)
        }
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新在线访客数（实时）
   */
  const updateOnlineVisitors = async () => {
    try {
      const onlineData = await fetchOnlineVisitors()
      const onlineItem = dataList.find((item) => item.key === 'onlineVisitors')
      if (onlineItem) {
        onlineItem.num = onlineData.value
        onlineItem.change = formatTrendPercent(onlineData.trend)
      }
    } catch (error) {
      console.error('Failed to update online visitors:', error)
    }
  }

  /**
   * 启动在线访客实时更新（每30秒）
   */
  const startOnlineVisitorPolling = () => {
    onlineVisitorTimer = setInterval(updateOnlineVisitors, 30000)
  }

  /**
   * 停止在线访客实时更新
   */
  const stopOnlineVisitorPolling = () => {
    if (onlineVisitorTimer) {
      clearInterval(onlineVisitorTimer)
      onlineVisitorTimer = null
    }
  }

  onMounted(() => {
    loadStats()
    startOnlineVisitorPolling()
  })

  onUnmounted(() => {
    stopOnlineVisitorPolling()
  })
</script>
