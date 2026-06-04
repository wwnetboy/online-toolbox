<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar :title="title" :description="description" />
    <PermissionGuard :feature-id="featureId" :feature-name="featureName" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="icon" :icon-url="iconUrl" :color="color" />
          <span class="tool-title">{{ title }}</span>
        </div>
        <slot name="content" />
      </ElCard>
    </PermissionGuard>
    <ElCard v-if="$slots.introduction" shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <slot name="introduction" />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import ToolSearchBar from '../../../../views/toolbox/components/ToolSearchBar.vue'
  import ToolIcon from '../../../../views/toolbox/components/ToolIcon.vue'
  import PermissionGuard from '../../../business/permission-guard/index.vue'

  defineOptions({ name: 'ToolPageLayout' })

  interface Props {
    featureId: string
    featureName: string
    title: string
    description?: string
    icon?: string
    iconUrl?: string
    color?: string
  }

  defineProps<Props>()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()

  defineExpose({
    permissionGuardRef
  })
</script>

<style scoped lang="scss">
  .tool-header {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 20px;
  }

  .tool-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
</style>
