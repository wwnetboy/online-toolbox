<template>
  <div class="art-card h-105 p-4 box-border mb-5 max-sm:mb-4">
    <ArtBarChart
      class="box-border p-2"
      barWidth="50%"
      height="13.7rem"
      :showAxisLine="false"
      :data="chartData"
      :xAxisData="xAxisLabels"
    />
    <div class="ml-1">
      <h3 class="mt-5 text-lg font-medium">用户概述</h3>
      <p class="mt-1 text-sm">近9个月独立访客趋势统计</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { fetchUserOverview } from '@/api/stats'

  const xAxisLabels = ref<string[]>(['--', '--', '--', '--', '--', '--', '--', '--', '--'])
  const chartData = ref<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0])

  onMounted(async () => {
    try {
      const result = await fetchUserOverview()
      chartData.value = result.chartData
      if (result.xAxisLabels?.length) xAxisLabels.value = result.xAxisLabels
    } catch (e) {
      console.error('Failed to load user overview:', e)
    }
  })
</script>
