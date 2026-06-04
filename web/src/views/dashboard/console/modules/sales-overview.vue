<template>
  <div class="art-card h-105 p-5 mb-5 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>访问量</h4>
        <p v-if="growth !== null">
          今年增长
          <span :class="[growth >= 0 ? 'text-success' : 'text-danger']">
            {{ growth >= 0 ? `+${growth}%` : `${growth}%` }}
          </span>
        </p>
        <p v-else>今年增长<span class="text-g-400">--</span></p>
      </div>
    </div>
    <ArtLineChart
      height="calc(100% - 56px)"
      :data="data"
      :xAxisData="xAxisData"
      :showAreaColor="true"
      :showAxisLine="false"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { fetchVisitTrend } from '@/api/stats'

  const data = ref<number[]>(Array(12).fill(0))
  const xAxisData = ref<string[]>([
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ])
  const growth = ref<number | null>(null)

  onMounted(async () => {
    try {
      const result = await fetchVisitTrend()
      data.value = result.data
      if (result.xAxisData?.length) xAxisData.value = result.xAxisData
      growth.value = result.growth
    } catch (e) {
      console.error('Failed to load visit trend:', e)
    }
  })
</script>
