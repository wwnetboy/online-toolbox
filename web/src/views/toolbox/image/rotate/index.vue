<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '图片旋转/翻转'"
      :description="toolDescription || '支持90度、180度旋转和水平/垂直翻转'"
    />
    <PermissionGuard
      feature-id="image-rotate"
      feature-name="图片旋转/翻转"
      ref="permissionGuardRef"
    >
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '图片旋转' }}</span>
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
                  <img
                    :src="previewImage"
                    :style="{
                      transform: `rotate(${rotation}deg) scaleX(${flipX}) scaleY(${flipY})`
                    }"
                    class="preview-image"
                    alt="preview"
                  />
                </div>
              </div>
              <div class="controls-section">
                <h4 class="section-title">操作控制</h4>
                <div class="control-group">
                  <p class="control-label">旋转</p>
                  <div class="button-group">
                    <ElButton @click="rotate(-90)"
                      ><Icon icon="ri:anticlockwise-line" class="mr-1" />逆时针90°</ElButton
                    >
                    <ElButton @click="rotate(90)"
                      ><Icon icon="ri:clockwise-line" class="mr-1" />顺时针90°</ElButton
                    >
                    <ElButton @click="rotate(180)"
                      ><Icon icon="ri:refresh-line" class="mr-1" />旋转180°</ElButton
                    >
                  </div>
                </div>
                <div class="control-group">
                  <p class="control-label">翻转</p>
                  <div class="button-group">
                    <ElButton @click="flipHorizontal"
                      ><Icon icon="ri:flip-horizontal-line" class="mr-1" />水平翻转</ElButton
                    >
                    <ElButton @click="flipVertical"
                      ><Icon icon="ri:flip-vertical-line" class="mr-1" />垂直翻转</ElButton
                    >
                  </div>
                </div>
                <div class="control-group">
                  <p class="control-label">其他</p>
                  <div class="button-group">
                    <ElButton @click="resetTransform"
                      ><Icon icon="ri:restart-line" class="mr-1" />重置</ElButton
                    >
                    <ElButton @click="autoCorrect"
                      ><Icon icon="ri:magic-line" class="mr-1" />自动矫正</ElButton
                    >
                  </div>
                </div>
                <div class="action-buttons">
                  <ElButton @click="resetImage">重新选择</ElButton>
                  <ElButton
                    type="primary"
                    :loading="isProcessing"
                    :disabled="!hasChanges"
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
              title="处理完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-image-line" class="text-5xl text-primary" />
                  <p class="result-file-name">{{ processResult.data?.fileName || '处理完成' }}</p>
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
              title="处理失败"
              :message="processResult.error || '处理失败'"
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
        <p class="mb-3">图片旋转/翻转工具支持多种变换操作：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持逆时针90°、顺时针90°、180°旋转</li>
          <li>支持水平翻转和垂直翻转</li>
          <li>实时预览变换效果</li>
          <li>支持自动矫正到最近的90度倍数</li>
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
  import { createImageRotateProcessor } from '@/processors/image/rotate'
  import { saveAs } from 'file-saver'

  defineOptions({ name: 'ImageRotatePage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()

  const currentImage = ref<string>('')
  const currentFile = ref<File | null>(null)
  const previewImage = ref<string>('')

  const rotation = ref(0)
  const flipX = ref(1)
  const flipY = ref(1)

  const isProcessing = ref(false)
  const processResult = ref<any>(null)

  const hasChanges = computed(() => {
    return rotation.value !== 0 || flipX.value !== 1 || flipY.value !== 1
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
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    isDragging.value = false

    const file = event.dataTransfer?.files[0]
    if (file) {
      processFile(file)
    }
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
      previewImage.value = dataURL
      resetTransform()
    }
    reader.onerror = () => {
      ElMessage.error('文件读取失败')
    }
    reader.readAsDataURL(file)
  }

  const rotate = (angle: number) => {
    rotation.value = (rotation.value + angle) % 360
    if (rotation.value < 0) {
      rotation.value += 360
    }
  }

  const flipHorizontal = () => {
    flipX.value = flipX.value === 1 ? -1 : 1
  }

  const flipVertical = () => {
    flipY.value = flipY.value === 1 ? -1 : 1
  }

  const resetTransform = () => {
    rotation.value = 0
    flipX.value = 1
    flipY.value = 1
  }

  const autoCorrect = () => {
    const nearest = Math.round(rotation.value / 90) * 90
    rotation.value = nearest % 360
    ElMessage.success('已自动矫正')
  }

  const resetImage = () => {
    currentImage.value = ''
    currentFile.value = null
    previewImage.value = ''
    processResult.value = null
    resetTransform()
  }

  const handleProcess = async () => {
    if (!currentFile.value || !hasChanges.value) {
      ElMessage.warning('请先进行旋转或翻转操作')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    isProcessing.value = true

    try {
      const processor = createImageRotateProcessor()

      let operation: 'rotate' | 'flipH' | 'flipV' = 'rotate'
      let angle = rotation.value

      if (flipX.value === -1 && flipY.value === 1) {
        operation = 'flipH'
      } else if (flipX.value === 1 && flipY.value === -1) {
        operation = 'flipV'
      }

      const result = await processor.process([currentFile.value], {
        operation,
        angle
      })

      if (result.success && result.data?.files?.[0]) {
        processResult.value = result

        // 保存历史记录
        const file = result.data.files[0]
        const blobUrl = URL.createObjectURL(file.blob)
        addRecord({
          toolId: 'image-rotate',
          toolName: '图片旋转',
          fileName: currentFile.value!.name,
          outputFileName: file.name,
          fileSize: currentFile.value!.size,
          outputFileSize: file.blob.size,
          processType: 'rotate',
          downloadUrl: blobUrl
        })

        ElMessage.success('图片处理完成！')
        // 记录功能使用
        permissionGuardRef.value?.recordUsage()
      } else {
        ElMessage.error(result.error || '处理失败')
      }
    } catch (error: any) {
      ElMessage.error(error.message || '处理失败，请重试')
    } finally {
      isProcessing.value = false
    }
  }

  const downloadResult = () => {
    if (!processResult.value?.data?.files?.[0]) {
      ElMessage.error('没有可下载的文件')
      return
    }

    const file = processResult.value.data.files[0]
    saveAs(file.blob, file.name)
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
    if (processResult.value?.data?.files) {
      processResult.value.data.files.forEach((file: any) => {
        if (file.blob) {
          URL.revokeObjectURL(URL.createObjectURL(file.blob))
        }
      })
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
    grid-template-columns: 1fr 300px;
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
    transition: transform 0.3s ease;
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

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .el-button {
      justify-content: flex-start;
    }
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

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
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
