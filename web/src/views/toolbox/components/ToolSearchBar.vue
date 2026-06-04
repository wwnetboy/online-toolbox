<template>
  <ElCard shadow="never" class="art-card">
    <div class="flex-cb gap-4">
      <!-- 左侧：搜索框 -->
      <div class="flex-1">
        <ElInput
          v-model="keyword"
          placeholder="搜索工具..."
          size="large"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <ElIcon class="text-theme"><Search /></ElIcon>
          </template>
          <template #suffix v-if="!keyword">
            <span class="text-sm text-g-500">
              工具箱已累计帮助了
              <span class="text-theme font-semibold">{{ totalUsageCount.toLocaleString() }}</span>
              人次
            </span>
          </template>
        </ElInput>
      </div>

      <!-- 右侧：分享按钮 -->
      <ElButton size="large" @click="handleShare">
        <ElIcon><Share /></ElIcon>
      </ElButton>
    </div>
  </ElCard>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { Search, Share } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'ToolSearchBar' })

  interface Props {
    modelValue?: string
    title?: string
    description?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    title: '在线工具箱',
    description: '免费在线工具，所有处理均在本地完成'
  })

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'search', value: string): void
  }>()

  const keyword = ref(props.modelValue)
  const totalUsageCount = ref(1100)

  watch(
    () => props.modelValue,
    (val) => {
      keyword.value = val
    }
  )

  const handleSearch = () => {
    emit('update:modelValue', keyword.value)
    emit('search', keyword.value)
  }

  const handleShare = async () => {
    const shareData = {
      title: props.title,
      text: props.description,
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        ElMessage.success('分享成功')
      } else {
        await navigator.clipboard.writeText(window.location.href)
        ElMessage.success('链接已复制到剪贴板')
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        ElMessage.error('分享失败')
      }
    }
  }
</script>

<style scoped lang="scss">
  :deep(.el-input__suffix) {
    display: flex;
    align-items: center;
  }

  :deep(.el-input__suffix-inner) {
    display: flex;
    align-items: center;
  }
</style>
