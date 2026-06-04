<template>
  <div class="tool-icon-wrapper" :style="wrapperStyle">
    <img v-if="iconUrl" :src="iconUrl" class="tool-icon-image" alt="tool icon" />
    <Icon v-else :icon="icon" class="tool-icon-inner" :style="{ color: props.color }" />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Icon } from '@iconify/vue'

  defineOptions({ name: 'ToolIcon' })

  interface Props {
    icon?: string
    iconUrl?: string
    color: string
  }

  const props = withDefaults(defineProps<Props>(), {
    icon: 'ri:tools-line'
  })

  // 将颜色转换为浅色背景（添加透明度）
  const hexToRgba = (hex: string, alpha: number): string => {
    const cleanHex = hex.replace('#', '')
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // 动态样式：自定义图片不需要背景色
  const wrapperStyle = computed(() => {
    if (props.iconUrl) {
      return {}
    }
    return {
      background: hexToRgba(props.color, 0.12)
    }
  })
</script>

<style scoped lang="scss">
  .tool-icon-wrapper {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }

  .tool-icon-inner {
    font-size: 24px;
  }

  .tool-icon-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
</style>
