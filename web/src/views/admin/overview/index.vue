<template>
  <div>
    <CardList></CardList>

    <ElRow :gutter="20">
      <ElCol :span="24">
        <SalesOverview />
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :span="24">
        <ToolboxStats />
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import CardList from '@/views/dashboard/console/modules/card-list.vue'
  import SalesOverview from '@/views/dashboard/console/modules/sales-overview.vue'
  import ToolboxStats from '@/views/dashboard/console/modules/toolbox-stats.vue'

  defineOptions({ name: 'AdminOverview' })
</script>
