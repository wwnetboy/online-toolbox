<template>
  <div class="icon-upload">
    <!-- 上传区域 -->
    <div class="upload-container">
      <div
        v-if="!currentIconUrl"
        class="icon-upload-area"
        :class="{ 'is-dragover': isDragover, 'is-disabled': disabled }"
        @click="handleClick"
        @dragover.prevent="handleDragover"
        @dragleave.prevent="handleDragleave"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.svg,image/png,image/jpeg,image/gif,image/svg+xml"
          class="hidden-input"
          @change="handleFileChange"
        />
        <div class="upload-content">
          <ElIcon v-if="uploading" class="is-loading upload-icon">
            <Loading />
          </ElIcon>
          <ElIcon v-else class="upload-icon">
            <UploadFilled />
          </ElIcon>
          <div class="upload-text">
            <span v-if="uploading">上传中...</span>
            <span v-else>点击上传</span>
          </div>
        </div>
        <!-- 上传进度 -->
        <ElProgress
          v-if="uploading && uploadProgress > 0"
          :percentage="uploadProgress"
          :show-text="false"
          class="upload-progress"
        />
      </div>

      <!-- 图标预览 -->
      <div v-else class="preview-area">
        <div class="preview-wrapper">
          <img :src="previewUrl" class="preview-image" @error="handleImageError" />
          <div class="preview-actions">
            <ElButton
              type="danger"
              :icon="Delete"
              circle
              size="small"
              :disabled="disabled"
              @click="handleRemove"
            />
          </div>
        </div>
      </div>

      <!-- 格式提示和操作 -->
      <div class="upload-info">
        <ElTooltip content="支持 PNG、JPG、JPEG、GIF、SVG 格式，最大 2MB" placement="top">
          <ElIcon class="format-hint-icon">
            <QuestionFilled />
          </ElIcon>
        </ElTooltip>
        <ElButton
          v-if="currentIconUrl && !disabled"
          type="primary"
          link
          size="small"
          @click="handleReupload"
        >
          重新上传
        </ElButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { ElMessage, ElIcon, ElButton, ElProgress, ElTooltip } from 'element-plus'
  import { UploadFilled, Delete, Loading, QuestionFilled } from '@element-plus/icons-vue'
  import { uploadToolIcon, deleteToolIcon } from '@/api/tools'

  interface Props {
    /** 当前图标 URL (iconUrl 字段) */
    modelValue: string | null
    /** 旧的 Iconify 图标名称 (icon 字段，用于显示迁移提示) */
    legacyIcon?: string | null
    /** 是否禁用 */
    disabled?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
    legacyIcon: null,
    disabled: false
  })

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string | null): void
    (e: 'upload-success', url: string): void
    (e: 'upload-error', error: string): void
    (e: 'remove'): void
  }>()

  // 状态
  const fileInputRef = ref<HTMLInputElement | null>(null)
  const isDragover = ref(false)
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const imageLoadError = ref(false)

  // 计算属性
  const currentIconUrl = computed(() => props.modelValue)

  const previewUrl = computed(() => {
    if (props.modelValue) {
      // 如果是完整 URL，直接使用
      if (props.modelValue.startsWith('http://') || props.modelValue.startsWith('https://')) {
        return props.modelValue
      }
      // 如果是相对路径，直接使用（不添加 /api 前缀，因为后端返回的路径已经是完整的）
      return props.modelValue
    }
    return ''
  })

  // 文件验证
  const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']
  const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg']

  function validateFile(file: File): { valid: boolean; error?: string } {
    // 检查文件类型
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: '只支持 PNG、JPG、JPEG、GIF、SVG 格式的图标文件' }
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: '图标文件大小不能超过 2MB' }
    }

    return { valid: true }
  }

  // 上传文件
  async function uploadFile(file: File) {
    const validation = validateFile(file)
    if (!validation.valid) {
      ElMessage.error(validation.error!)
      emit('upload-error', validation.error!)
      return
    }

    uploading.value = true
    uploadProgress.value = 0

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        if (uploadProgress.value < 90) {
          uploadProgress.value += 10
        }
      }, 100)

      const result = await uploadToolIcon(file)

      clearInterval(progressInterval)
      uploadProgress.value = 100

      emit('update:modelValue', result.url)
      emit('upload-success', result.url)
    } catch (error: any) {
      const errorMsg = error?.message || '图标上传失败'
      emit('upload-error', errorMsg)
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }

  // 事件处理
  function handleClick() {
    if (props.disabled || uploading.value) return
    fileInputRef.value?.click()
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      uploadFile(file)
    }
    // 清空 input 以便重复选择同一文件
    input.value = ''
  }

  function handleDragover(event: DragEvent) {
    if (props.disabled || uploading.value) return
    isDragover.value = true
  }

  function handleDragleave(event: DragEvent) {
    isDragover.value = false
  }

  function handleDrop(event: DragEvent) {
    if (props.disabled || uploading.value) return
    isDragover.value = false

    const file = event.dataTransfer?.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  async function handleRemove() {
    if (props.disabled) return

    // 如果有上传的图标，尝试删除服务器上的文件
    if (props.modelValue) {
      try {
        const filename = props.modelValue.split('/').pop()
        if (filename) {
          await deleteToolIcon(filename)
        }
      } catch {
        // 删除失败不影响前端操作
      }
    }

    emit('update:modelValue', null)
    emit('remove')
  }

  function handleReupload() {
    if (props.disabled || uploading.value) return
    fileInputRef.value?.click()
  }

  function handleImageError() {
    imageLoadError.value = true
  }

  // 监听 modelValue 变化，重置图片加载错误状态
  watch(
    () => props.modelValue,
    () => {
      imageLoadError.value = false
    }
  )
</script>

<style scoped lang="scss">
  .icon-upload {
    width: 100%;
  }

  .upload-container {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .hidden-input {
    display: none;
  }

  .icon-upload-area {
    position: relative;
    box-sizing: border-box;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border: 2px dashed var(--el-border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-fill-color-lighter);

    &:hover:not(.is-disabled) {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    &.is-dragover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    &.is-disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4px;
  }

  .upload-icon {
    font-size: 24px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 4px;
  }

  .upload-text {
    font-size: 11px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  .upload-progress {
    position: absolute;
    bottom: 4px;
    left: 4px;
    right: 4px;
  }

  .upload-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 4px;
  }

  .format-hint-icon {
    font-size: 16px;
    color: var(--el-text-color-placeholder);
    cursor: help;

    &:hover {
      color: var(--el-color-primary);
    }
  }

  .preview-area {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .preview-wrapper {
    position: relative;
    box-sizing: border-box;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    overflow: hidden;
    background: var(--el-fill-color-lighter);
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover .preview-actions {
      opacity: 1;
    }
  }

  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-actions {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .preview-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
</style>
