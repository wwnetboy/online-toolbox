<template>
  <div class="art-card tool-card-compact cursor-pointer" @click="handleClick">
    <!-- 图标在上方 -->
    <div class="icon-wrapper flex-cc" :style="{ background: iconBgColor }">
      <!-- 如果有 iconUrl，显示图片；否则显示 iconify 图标 -->
      <img
        v-if="props.tool.iconUrl"
        :src="props.tool.iconUrl"
        class="icon-image"
        :alt="props.tool.name"
      />
      <ArtSvgIcon v-else :icon="props.tool.icon" class="icon-inner" :style="{ color: iconColor }" />
    </div>

    <!-- 标题和描述在下方居中 -->
    <div class="tool-content">
      <h3 class="tool-name">{{ props.tool.name }}</h3>
      <p class="tool-description">{{ props.tool.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { Tool } from '../types'

  defineOptions({ name: 'ToolCardCompact' })

  interface Props {
    tool: Tool
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    (e: 'click', tool: Tool): void
  }>()

  // 将颜色转换为浅色背景（添加透明度）
  const hexToRgba = (hex: string, alpha: number): string => {
    const cleanHex = hex.replace('#', '')
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // 深色图标颜色
  const iconColor = computed(() => {
    return props.tool.color || 'var(--theme-color)'
  })

  // 浅色圆形背景（使用图标颜色的浅色版本）
  const iconBgColor = computed(() => {
    if (props.tool.color) {
      return hexToRgba(props.tool.color, 0.12)
    }
    return 'rgba(var(--theme-color-rgb), 0.12)'
  })

  const handleClick = () => {
    emit('click', props.tool)
  }
</script>

<style scoped lang="scss">
  .tool-card-compact {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    text-align: center;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
  }

  .icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .icon-inner {
    font-size: 26px;
  }

  .icon-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .tool-content {
    width: 100%;
  }

  .tool-name {
    color: var(--art-text-color);
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tool-description {
    font-size: 14px;
    color: #909399;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
