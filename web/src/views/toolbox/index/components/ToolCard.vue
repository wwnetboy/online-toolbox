<template>
  <div class="art-card flex-cb p-5 cursor-pointer tool-card" @click="handleClick">
    <!-- 左侧：图标（深色图标 + 浅色圆形背景） -->
    <div class="icon-wrapper flex-cc flex-shrink-0" :style="{ background: iconBgColor }">
      <!-- 如果有 iconUrl，显示图片；否则显示 iconify 图标 -->
      <img
        v-if="props.tool.iconUrl"
        :src="props.tool.iconUrl"
        class="icon-image"
        :alt="props.tool.name"
      />
      <ArtSvgIcon v-else :icon="props.tool.icon" class="icon-inner" :style="{ color: iconColor }" />
    </div>

    <!-- 右侧：标题和描述 -->
    <div class="flex-1 ml-4 min-w-0">
      <h3 class="tool-name mb-1 text-base font-semibold">{{ props.tool.name }}</h3>
      <p class="tool-description text-sm text-g-500">{{ props.tool.description }}</p>
    </div>

    <!-- 标签 -->
    <div v-if="props.tool.badge" class="tool-badge" :class="`badge-${props.tool.badge}`">
      {{ props.tool.badge === 'hot' ? '热门' : '新' }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { Tool } from '../types'

  defineOptions({ name: 'ToolCard' })

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
  .tool-card {
    position: relative;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
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

  .tool-name {
    color: var(--art-text-color);
    line-height: 1.2;
  }

  .tool-description {
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tool-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 8px;
    font-size: 12px;
    border-radius: 4px;
    font-weight: 500;

    &.badge-hot {
      background: #fff1f0;
      color: #ff4d4f;
    }

    &.badge-new {
      background: #f6ffed;
      color: #52c41a;
    }
  }
</style>
