<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '长截图拼接'"
      :description="toolDescription || '将多张截图拼接成长图，支持调整顺序和边距'"
    />
    <PermissionGuard feature-id="image-splice" feature-name="长截图拼接" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '长图拼接' }}</span>
        </div>
        <div
          class="upload-area"
          :class="{ 'is-dragging': isDragging, 'has-files': hasFiles }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <template v-if="!hasFiles && !isProcessing && !processResult">
            <p class="text-base text-g-600 mb-2">将截图拖拽到虚框内</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">点击上传截图(小于20M)</ElButton>
            <p class="text-xs text-g-400 mt-3">支持 JPG/PNG 格式，至少需要2张图片</p>
          </template>
          <template v-if="hasFiles && !isProcessing && !processResult">
            <div class="file-grid-container">
              <VueDraggable
                v-model="files"
                class="file-list"
                :animation="200"
                handle=".drag-handle"
                @end="handleDragEnd"
              >
                <div v-for="file in files" :key="file.id" class="file-item">
                  <div class="drag-handle">
                    <Icon icon="ri:draggable" class="text-lg text-g-400" />
                  </div>
                  <div class="file-preview">
                    <img v-if="file.preview" :src="file.preview" alt="preview" />
                    <Icon v-else icon="ri:image-line" class="text-3xl text-primary" />
                  </div>
                  <div class="file-info">
                    <p class="file-name">{{ file.name }}</p>
                    <p class="file-size">{{ formatFileSize(file.size) }}</p>
                  </div>
                  <ElTag type="success" size="small">已就绪</ElTag>
                  <div class="file-close" @click.stop="removeFile(file.id)">
                    <ElIcon><Close /></ElIcon>
                  </div>
                </div>
              </VueDraggable>
              <div class="add-item" @click="triggerFileSelect">
                <Icon icon="ri:add-line" class="text-2xl text-g-400" />
                <span class="text-xs text-g-400">添加截图</span>
              </div>
              <!-- 拼接设置 -->
              <div class="options-panel">
                <h4 class="options-title">拼接设置</h4>
                <ElForm :model="spliceOptions" label-width="100px" size="default">
                  <ElFormItem label="拼接方向">
                    <ElRadioGroup v-model="spliceOptions.direction">
                      <ElRadioButton value="vertical">垂直拼接</ElRadioButton>
                      <ElRadioButton value="horizontal">水平拼接</ElRadioButton>
                    </ElRadioGroup>
                  </ElFormItem>
                  <ElFormItem label="图片间距">
                    <div class="slider-container">
                      <ElSlider
                        v-model="spliceOptions.spacing"
                        :min="0"
                        :max="50"
                        :step="5"
                        show-input
                      />
                      <span class="text-xs text-g-400">像素</span>
                    </div>
                  </ElFormItem>
                  <ElFormItem label="背景颜色">
                    <ElColorPicker v-model="spliceOptions.backgroundColor" show-alpha />
                    <span class="ml-2 text-sm text-g-500">{{ spliceOptions.backgroundColor }}</span>
                  </ElFormItem>
                  <ElFormItem label="输出格式">
                    <ElRadioGroup v-model="spliceOptions.outputFormat">
                      <ElRadioButton value="png">PNG</ElRadioButton>
                      <ElRadioButton value="jpg">JPG</ElRadioButton>
                      <ElRadioButton value="webp">WEBP</ElRadioButton>
                    </ElRadioGroup>
                  </ElFormItem>
                  <ElFormItem v-if="spliceOptions.outputFormat !== 'png'" label="图片质量">
                    <div class="slider-container">
                      <ElSlider
                        v-model="spliceOptions.quality"
                        :min="10"
                        :max="100"
                        :step="10"
                        show-input
                      />
                    </div>
                  </ElFormItem>
                </ElForm>
              </div>
              <div class="file-actions">
                <ElButton
                  type="primary"
                  size="large"
                  :disabled="fileCount < 2"
                  @click="handleSplice"
                  >开始拼接 ({{ fileCount }}张截图)</ElButton
                >
                <ElButton size="large" @click="clearFiles">清空</ElButton>
              </div>
              <p v-if="fileCount < 2" class="text-xs text-g-400 mt-2">至少需要2张截图才能拼接</p>
            </div>
          </template>
          <template v-if="isProcessing">
            <ToolResultView type="loading" :percentage="progress.progress">
              <template #progress>
                <p class="text-sm text-g-400 mb-2">正在拼接...</p>
                <ElProgress :percentage="progress.progress" class="w-full max-w-md" />
              </template>
            </ToolResultView>
          </template>
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="拼接完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-image-line" class="text-5xl text-primary" />
                  <p class="result-file-name">{{ processResult.data?.fileName || '拼接完成' }}</p>
                  <p class="text-g-500 text-sm mt-2">已将 {{ fileCount }} 张截图拼接成长图</p>
                </div>
                <div v-if="processResult.data?.preview" class="result-preview-container mt-4">
                  <img :src="processResult.data.preview" class="result-preview" alt="拼接结果" />
                </div>
              </template>
              <template #actions>
                <ElButton type="primary" @click="downloadResult">
                  <ElIcon class="mr-1"><Download /></ElIcon>下载长图
                </ElButton>
                <ElButton @click="handleContinue">继续处理</ElButton>
              </template>
            </ToolResultView>
            <ToolResultView
              v-else
              type="error"
              title="拼接失败"
              :message="processResult.error || '拼接失败'"
              @retry="handleRetry"
              @reset="handleContinue"
            />
          </template>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          @change="handleFileSelect"
        />
      </ElCard>
    </PermissionGuard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">长截图拼接工具可以将多张截图合并为一张长图：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持拖拽排序，自由调整拼接顺序</li>
          <li>支持垂直和水平两种拼接方向</li>
          <li>可自定义图片间距和背景颜色</li>
          <li>支持 PNG/JPG/WEBP 输出格式</li>
          <li>最多支持20张截图拼接</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Loading, CircleClose, Download, Refresh, Close } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import { VueDraggable } from 'vue-draggable-plus'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useFileProcessor } from '@/hooks/core/useFileProcessor'
  import { useHistory } from '@/hooks/core/useHistory'
  import { createImageSpliceProcessor, type ImageSpliceOptions } from '@/processors/image/splice'
  import { saveAs } from 'file-saver'

  defineOptions({ name: 'ImageSplicePage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()

  const {
    files,
    isDragging,
    hasFiles,
    fileCount,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    clearFiles,
    formatFileSize
  } = useUpload({
    accept: 'image/jpeg,image/png',
    multiple: true,
    maxSize: 20,
    maxCount: 20
  })

  const { isProcessing, progress } = useFileProcessor()

  // 历史记录
  const { addRecord } = useHistory()

  const spliceOptions = ref<ImageSpliceOptions>({
    direction: 'vertical',
    spacing: 10,
    backgroundColor: '#ffffff',
    outputFormat: 'png',
    quality: 90
  })

  const processResult = ref<any>(null)

  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const handleDragEnd = () => {
    ElMessage.success('截图顺序已调整')
  }

  const handleSplice = async () => {
    if (fileCount.value < 2) {
      ElMessage.warning('至少需要2张截图才能拼接')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    try {
      const processor = createImageSpliceProcessor()
      const fileList = files.value.map((f) => f.file)

      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: fileList.length,
        currentFileName: '',
        processedCount: 0
      }

      const result = await processor.process(fileList, spliceOptions.value, (prog) => {
        progress.value = {
          progress: prog,
          currentIndex: 0,
          totalFiles: fileList.length,
          currentFileName: '正在拼接图片...',
          processedCount: 0
        }
      })

      processResult.value = result

      if (result.success) {
        ElMessage.success('截图拼接完成！')
        // 记录功能使用
        permissionGuardRef.value?.recordUsage()

        // 保存历史记录
        if (result.data?.file) {
          const fileName = `长图_${Date.now()}.${spliceOptions.value.outputFormat}`
          const blobUrl = URL.createObjectURL(result.data.file)
          const totalSize = files.value.reduce((sum, f) => sum + f.size, 0)
          addRecord({
            toolId: 'image-splice',
            toolName: '长图拼接',
            fileName: `${fileCount.value}张截图`,
            outputFileName: fileName,
            fileSize: totalSize,
            outputFileSize: result.data.file.size,
            processType: 'splice',
            downloadUrl: blobUrl
          })
        }
      } else {
        ElMessage.error(result.error || '拼接失败')
      }
    } catch (error: any) {
      ElMessage.error(error.message || '拼接失败，请重试')
      processResult.value = {
        success: false,
        error: error.message || '拼接失败，请重试'
      }
    }
  }

  const downloadResult = () => {
    if (!processResult.value?.data?.file) {
      ElMessage.error('没有可下载的文件')
      return
    }

    const blob = processResult.value.data.file
    const fileName = `长图_${Date.now()}.${spliceOptions.value.outputFormat}`
    saveAs(blob, fileName)
    ElMessage.success('文件下载成功')
  }

  const handleContinue = () => {
    processResult.value = null
    clearFiles()
  }

  const handleRetry = () => {
    processResult.value = null
  }

  // 清理 Blob URLs，防止内存泄漏
  onUnmounted(() => {
    if (processResult.value?.data?.file) {
      URL.revokeObjectURL(URL.createObjectURL(processResult.value.data.file))
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

  .file-grid-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 600px;
    margin-bottom: 16px;
  }

  .file-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      background: var(--el-fill-color);

      .file-close {
        opacity: 1;
      }
    }
  }

  .drag-handle {
    padding: 4px;
    cursor: move;

    &:hover {
      color: var(--theme-color);
    }
  }

  .file-preview {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    overflow: hidden;
    background: var(--el-fill-color);
    border-radius: 4px;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .file-info {
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .file-name {
    margin: 0 0 2px;
    overflow: hidden;
    font-size: 13px;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .file-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: var(--el-color-danger);
    cursor: pointer;
    background: var(--el-color-danger-light-9);
    border-radius: 50%;
    opacity: 0;
    transition: all 0.2s;

    &:hover {
      color: #fff;
      background: var(--el-color-danger);
    }
  }

  .add-item {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 600px;
    padding: 16px;
    margin-bottom: 20px;
    cursor: pointer;
    border: 2px dashed var(--el-border-color);
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .options-panel {
    width: 100%;
    max-width: 500px;
    padding: 20px;
    margin-bottom: 20px;
    text-align: left;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .options-title {
    margin: 0 0 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .slider-container {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;

    .el-slider {
      flex: 1;
    }
  }

  .file-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .result-preview-container {
    max-width: 400px;
    max-height: 400px;
    padding: 8px;
    overflow: auto;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .result-preview {
    display: block;
    max-width: 100%;
    border-radius: 4px;
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
