<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '图片尺寸调整'"
      :description="toolDescription || '调整图片宽度和高度，支持等比缩放'"
    />
    <PermissionGuard feature-id="image-resize" feature-name="图片尺寸调整" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '尺寸调整' }}</span>
        </div>
        <div
          class="upload-area"
          :class="{ 'is-dragging': isDragging, 'has-files': !!currentImage }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <template v-if="!currentImage && !processResult">
            <p class="text-base text-g-600 mb-2">将图片拖拽到虚框内</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">点击上传图片(小于20M)</ElButton>
            <p class="text-xs text-g-400 mt-3">支持 JPG/PNG/WEBP 格式</p>
          </template>
          <template v-if="currentImage && !processResult">
            <div class="edit-container">
              <div class="preview-section">
                <h4 class="section-title">图片预览</h4>
                <div class="preview-box">
                  <img :src="currentImage" class="preview-image" alt="preview" />
                </div>
                <div class="image-info">
                  <span>原始尺寸：{{ originalWidth }} × {{ originalHeight }} px</span>
                </div>
              </div>
              <div class="controls-section">
                <h4 class="section-title">尺寸设置</h4>
                <div class="control-group">
                  <p class="control-label">目标尺寸</p>
                  <div class="size-inputs">
                    <div class="size-input-item">
                      <span class="input-label">宽度</span>
                      <ElInputNumber
                        v-model="targetWidth"
                        :min="1"
                        :max="10000"
                        :step="10"
                        size="default"
                        @change="handleWidthChange"
                      />
                      <span class="input-unit">px</span>
                    </div>
                    <div class="size-input-item">
                      <span class="input-label">高度</span>
                      <ElInputNumber
                        v-model="targetHeight"
                        :min="1"
                        :max="10000"
                        :step="10"
                        size="default"
                        @change="handleHeightChange"
                      />
                      <span class="input-unit">px</span>
                    </div>
                  </div>
                </div>
                <div class="control-group">
                  <p class="control-label">缩放选项</p>
                  <div class="option-item">
                    <ElCheckbox v-model="maintainRatio">保持宽高比</ElCheckbox>
                  </div>
                </div>
                <div class="control-group">
                  <p class="control-label">快捷缩放</p>
                  <div class="button-group">
                    <ElButton @click="scaleByPercent(50)">50%</ElButton>
                    <ElButton @click="scaleByPercent(75)">75%</ElButton>
                    <ElButton @click="scaleByPercent(150)">150%</ElButton>
                    <ElButton @click="scaleByPercent(200)">200%</ElButton>
                  </div>
                </div>
                <div class="control-group">
                  <p class="control-label">预设尺寸</p>
                  <div class="button-group">
                    <ElButton @click="setPresetSize(1920, 1080)">1920×1080</ElButton>
                    <ElButton @click="setPresetSize(1280, 720)">1280×720</ElButton>
                    <ElButton @click="setPresetSize(800, 600)">800×600</ElButton>
                    <ElButton @click="setPresetSize(640, 480)">640×480</ElButton>
                  </div>
                </div>
                <div class="result-preview">
                  <Icon icon="ri:information-line" class="text-primary" />
                  <span>调整后尺寸：{{ targetWidth }} × {{ targetHeight }} px</span>
                </div>
                <div class="action-buttons">
                  <ElButton @click="resetImage">重新选择</ElButton>
                  <ElButton
                    type="primary"
                    :loading="isProcessing"
                    :disabled="!canProcess"
                    @click="handleProcess"
                  >
                    <Icon icon="ri:check-line" class="mr-1" />应用并下载
                  </ElButton>
                </div>
              </div>
            </div>
          </template>
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="调整完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-image-line" class="text-5xl text-primary" />
                  <p class="result-file-name">{{ processResult.data?.fileName || '调整完成' }}</p>
                </div>
              </template>
              <template #actions>
                <ElButton type="primary" @click="downloadResult">
                  <ElIcon class="mr-1"><Download /></ElIcon>下载文件
                </ElButton>
                <ElButton @click="handleContinue">继续处理</ElButton>
              </template>
            </ToolResultView>
            <ToolResultView
              v-else
              type="error"
              title="调整失败"
              :message="processResult.error || '调整失败'"
              @retry="handleRetry"
              @reset="handleContinue"
            />
          </template>
        </div>
        <input ref="fileInputRef" type="file" accept="image/*" hidden @change="handleFileSelect" />
      </ElCard>
    </PermissionGuard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">图片尺寸调整工具可以修改图片大小：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持自定义宽度和高度</li>
          <li>可选择保持原始宽高比</li>
          <li>提供快捷缩放比例（50%、75%、150%、200%）</li>
          <li>提供常用预设尺寸</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { CircleClose, Download, Refresh } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useHistory } from '@/hooks/core/useHistory'
  import { saveAs } from 'file-saver'

  defineOptions({ name: 'ImageResizePage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const currentImage = ref<string>('')
  const currentFile = ref<File | null>(null)
  const originalWidth = ref(0)
  const originalHeight = ref(0)
  const targetWidth = ref(0)
  const targetHeight = ref(0)
  const maintainRatio = ref(true)
  const isProcessing = ref(false)
  const processResult = ref<any>(null)

  const canProcess = computed(() => {
    return (
      targetWidth.value > 0 &&
      targetHeight.value > 0 &&
      (targetWidth.value !== originalWidth.value || targetHeight.value !== originalHeight.value)
    )
  })

  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver } = useUpload({
    accept: 'image/*',
    multiple: false,
    maxSize: 20,
    maxCount: 1
  })

  // 历史记录
  const { addRecord } = useHistory()

  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    isDragging.value = false
    const file = event.dataTransfer?.files[0]
    if (file) processFile(file)
  }

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      ElMessage.error('请上传图片文件')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过 20MB')
      return
    }
    currentFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataURL = e.target?.result as string
      currentImage.value = dataURL
      const img = new Image()
      img.onload = () => {
        originalWidth.value = img.width
        originalHeight.value = img.height
        targetWidth.value = img.width
        targetHeight.value = img.height
      }
      img.src = dataURL
    }
    reader.onerror = () => ElMessage.error('文件读取失败')
    reader.readAsDataURL(file)
  }

  const handleWidthChange = (val: number | undefined) => {
    if (maintainRatio.value && val && originalWidth.value > 0) {
      const ratio = originalHeight.value / originalWidth.value
      targetHeight.value = Math.round(val * ratio)
    }
  }

  const handleHeightChange = (val: number | undefined) => {
    if (maintainRatio.value && val && originalHeight.value > 0) {
      const ratio = originalWidth.value / originalHeight.value
      targetWidth.value = Math.round(val * ratio)
    }
  }

  const scaleByPercent = (percent: number) => {
    targetWidth.value = Math.round((originalWidth.value * percent) / 100)
    targetHeight.value = Math.round((originalHeight.value * percent) / 100)
  }

  const setPresetSize = (width: number, height: number) => {
    if (maintainRatio.value) {
      const originalRatio = originalWidth.value / originalHeight.value
      const targetRatio = width / height
      if (originalRatio > targetRatio) {
        targetWidth.value = width
        targetHeight.value = Math.round(width / originalRatio)
      } else {
        targetHeight.value = height
        targetWidth.value = Math.round(height * originalRatio)
      }
    } else {
      targetWidth.value = width
      targetHeight.value = height
    }
  }

  const resetImage = () => {
    currentImage.value = ''
    currentFile.value = null
    originalWidth.value = 0
    originalHeight.value = 0
    targetWidth.value = 0
    targetHeight.value = 0
    processResult.value = null
  }

  const handleProcess = async () => {
    if (!currentFile.value || !canProcess.value) {
      ElMessage.warning('请先设置目标尺寸')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    isProcessing.value = true
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = targetWidth.value
      canvas.height = targetHeight.value
      const img = new Image()
      img.src = currentImage.value
      await new Promise((resolve) => {
        img.onload = resolve
      })
      ctx.drawImage(img, 0, 0, targetWidth.value, targetHeight.value)
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = currentFile.value!.name.replace(
            /\.[^.]+$/,
            `_${targetWidth.value}x${targetHeight.value}.png`
          )
          processResult.value = { success: true, data: { blob, fileName } }

          // 保存历史记录
          const blobUrl = URL.createObjectURL(blob)
          addRecord({
            toolId: 'image-resize',
            toolName: '尺寸调整',
            fileName: currentFile.value!.name,
            outputFileName: fileName,
            fileSize: currentFile.value!.size,
            outputFileSize: blob.size,
            processType: 'resize',
            downloadUrl: blobUrl
          })

          ElMessage.success('图片尺寸调整完成！')
          // 记录功能使用
          permissionGuardRef.value?.recordUsage()
        } else {
          processResult.value = { success: false, error: '处理失败' }
        }
        isProcessing.value = false
      }, 'image/png')
    } catch (error: any) {
      ElMessage.error(error.message || '处理失败，请重试')
      processResult.value = { success: false, error: error.message || '处理失败' }
      isProcessing.value = false
    }
  }

  const downloadResult = () => {
    if (!processResult.value?.data?.blob) {
      ElMessage.error('没有可下载的文件')
      return
    }
    saveAs(processResult.value.data.blob, processResult.value.data.fileName)
    ElMessage.success('文件下载成功')
  }

  const handleContinue = () => {
    resetImage()
  }
  const handleRetry = () => {
    processResult.value = null
  }

  // 清理 Blob URLs，防止内存泄漏
  onUnmounted(() => {
    if (processResult.value?.data?.blob) {
      URL.revokeObjectURL(URL.createObjectURL(processResult.value.data.blob))
    }
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

  .upload-area {
    min-height: 200px;
    padding: 60px 20px;
    text-align: center;
    border: 2px dashed var(--el-border-color);
    border-radius: var(--custom-radius);
    transition: all 0.3s;

    &:hover,
    &.is-dragging {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }

    &.has-files {
      padding: 24px;
      border: none;
      background: transparent;
    }
  }

  .edit-container {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    text-align: left;

    @media (width <= 768px) {
      grid-template-columns: 1fr;
    }
  }

  .preview-section {
    display: flex;
    flex-direction: column;
  }

  .section-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .preview-box {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    padding: 16px;
    overflow: hidden;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .preview-image {
    max-width: 100%;
    max-height: 400px;
    object-fit: contain;
  }

  .image-info {
    padding: 8px 12px;
    margin-top: 12px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    text-align: center;
    background: var(--el-fill-color-lighter);
    border-radius: 6px;
  }

  .controls-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .control-group {
    padding: 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .control-label {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
  }

  .size-inputs {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .size-input-item {
    display: flex;
    gap: 8px;
    align-items: center;

    .input-label {
      width: 40px;
      font-size: 13px;
      color: var(--el-text-color-regular);
    }

    .input-unit {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .option-item {
    padding: 4px 0;
  }

  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .result-preview {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    background: var(--el-color-primary-light-9);
    border-radius: 6px;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    padding-top: 16px;
    margin-top: auto;

    .el-button {
      flex: 1;
    }
  }

  .result-file-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 30px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 12px;
  }

  .result-file-name {
    max-width: 200px;
    margin: 12px 0 0;
    overflow: hidden;
    font-size: 14px;
    color: var(--el-text-color-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
