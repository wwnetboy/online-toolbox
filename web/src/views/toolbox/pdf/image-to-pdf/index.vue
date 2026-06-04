<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '图片转PDF'"
      :description="toolDescription || '将多张图片合并成一个PDF文档，支持调整顺序和页面设置'"
    />
    <PermissionGuard feature-id="pdf-from-image" feature-name="图片转PDF" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '图片转PDF' }}</span>
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
            <p class="text-base text-g-600 mb-2">将图片拖拽到虚框内</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">点击上传图片(小于20M)</ElButton>
            <p class="text-xs text-g-400 mt-3">支持 JPG/PNG/BMP/WEBP/GIF 格式</p>
          </template>
          <template v-if="hasFiles && !isProcessing && !processResult">
            <div class="file-grid-container">
              <VueDraggable v-model="files" class="file-grid" :animation="200">
                <div v-for="(file, index) in files" :key="file.id" class="file-card">
                  <div class="file-index">{{ index + 1 }}</div>
                  <div class="file-card-close" @click.stop="removeFile(file.id)">
                    <ElIcon><Close /></ElIcon>
                  </div>
                  <img v-if="file.preview" :src="file.preview" class="file-preview" alt="preview" />
                  <div v-else class="file-card-icon">
                    <Icon icon="ri:image-fill" class="text-4xl text-success" />
                  </div>
                  <p class="file-card-name">{{ file.name }}</p>
                </div>
              </VueDraggable>
              <div class="add-card-wrapper">
                <div class="file-card add-card" @click="triggerFileSelect">
                  <ElIcon class="text-3xl text-g-400"><Plus /></ElIcon>
                  <p class="text-xs text-g-400 mt-1">添加图片</p>
                </div>
              </div>
              <p class="drag-hint">
                <ElIcon class="mr-1"><InfoFilled /></ElIcon>
                拖拽图片可调整顺序
              </p>
              <div class="file-actions">
                <ElButton
                  type="primary"
                  size="large"
                  :disabled="fileCount < 1"
                  @click="handleConvert"
                  >生成PDF ({{ fileCount }}张图片)</ElButton
                >
                <ElButton size="large" @click="clearFiles">清空</ElButton>
              </div>
            </div>
          </template>
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在生成PDF" 
              :percentage="progress.progress"
              icon-from="ri:image-fill"
              icon-to="ri:file-pdf-2-fill"
            >
              <template #default>
                <p class="text-sm text-g-400 mt-2">
                  正在处理第 {{ progress.currentIndex + 1 }} / {{ progress.totalFiles }} 张图片
                </p>
              </template>
            </ToolResultView>
          </template>
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="PDF生成完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                  <p class="result-file-name">{{ processResult.data?.fileName }}</p>
                  <div class="result-stats">
                    <span>{{ processResult.data?.pageCount }} 页</span>
                    <span class="mx-2">|</span>
                    <span>{{ formatFileSize(processResult.data?.fileSize || 0) }}</span>
                  </div>
                </div>
              </template>
              <template #actions>
                <ElButton type="primary" @click="downloadResult">
                  <ElIcon class="mr-1"><Download /></ElIcon>下载PDF
                </ElButton>
                <ElButton @click="handleContinue">继续转换</ElButton>
              </template>
            </ToolResultView>
            <ToolResultView
              v-else
              type="error"
              title="转换失败"
              :message="processResult.error || '转换失败，请重试'"
              @retry="handleRetry"
              @reset="handleContinue"
            />
          </template>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/bmp,image/webp,image/gif"
          multiple
          hidden
          @change="handleFileSelect"
        />
      </ElCard>
    </PermissionGuard>
    <!-- 页面设置 -->
    <ElCard v-if="hasFiles && !isProcessing && !processResult" shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">页面设置</div>
      <ElForm :model="pdfOptions" label-width="100px">
        <ElFormItem label="纸张大小">
          <ElRadioGroup v-model="pdfOptions.pageSize">
            <ElRadioButton value="A4">A4</ElRadioButton>
            <ElRadioButton value="A3">A3</ElRadioButton>
            <ElRadioButton value="Letter">Letter</ElRadioButton>
            <ElRadioButton value="Legal">Legal</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="页面方向">
          <ElRadioGroup v-model="pdfOptions.orientation">
            <ElRadioButton value="portrait">纵向</ElRadioButton>
            <ElRadioButton value="landscape">横向</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="页边距">
          <ElSlider
            v-model="pdfOptions.margin"
            :min="0"
            :max="100"
            :step="5"
            show-input
            style="max-width: 400px"
          />
        </ElFormItem>
        <ElFormItem label="适配页面">
          <ElSwitch v-model="pdfOptions.fitToPage" />
          <span class="ml-2 text-g-400 text-sm">{{
            pdfOptions.fitToPage ? '图片将自动缩放以适配页面' : '保持图片原始尺寸'
          }}</span>
        </ElFormItem>
      </ElForm>
    </ElCard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">图片转PDF工具可以将多张图片合并为一个PDF文档：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持拖拽排序，自由调整图片顺序</li>
          <li>支持多种图片格式：JPG/PNG/BMP/WEBP/GIF</li>
          <li>可自定义纸张大小、页面方向和边距</li>
          <li>所有处理在浏览器本地完成</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Loading, CircleClose, Download, Plus, Close, InfoFilled } from '@element-plus/icons-vue'
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
  import {
    imagesToPdf,
    getDefaultToPdfOptions,
    type ImageToPdfOptions,
    type ImageToPdfResult
  } from '@/processors/image/toPdf'
  import { saveAs } from 'file-saver'

  defineOptions({ name: 'PdfImageToPdfPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const { addRecord } = useHistory()

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
    accept: 'image/jpeg,image/png,image/bmp,image/webp,image/gif',
    multiple: true,
    maxSize: 20,
    maxCount: 50
  })

  const { isProcessing, progress } = useFileProcessor()
  const pdfOptions = ref<ImageToPdfOptions>(getDefaultToPdfOptions())
  const processResult = ref<{ success: boolean; data?: ImageToPdfResult; error?: string } | null>(
    null
  )

  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const handleConvert = async () => {
    if (fileCount.value < 1) {
      ElMessage.warning('请至少上传一张图片')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    try {
      const fileList = files.value.map((f) => f.file)
      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: fileList.length,
        currentFileName: '',
        processedCount: 0
      }
      const progressInterval = setInterval(() => {
        if (progress.value.progress < 90) {
          progress.value.progress += 10
          progress.value.currentIndex = Math.floor(
            (progress.value.progress / 100) * fileList.length
          )
        }
      }, 200)
      const result = await imagesToPdf(fileList, pdfOptions.value)
      clearInterval(progressInterval)
      progress.value.progress = 100
      processResult.value = { success: true, data: result }
      ElMessage.success('PDF生成完成！')

      // 记录功能使用
      permissionGuardRef.value?.recordUsage()

      // 保存历史记录
      if (result.file) {
        const blobUrl = URL.createObjectURL(result.file)
        const totalSize = fileList.reduce((sum, f) => sum + f.size, 0)
        addRecord({
          toolId: 'pdf-from-image',
          toolName: '图片转PDF',
          fileName: `${fileCount.value}张图片`,
          outputFileName: result.fileName || `图片转PDF_${Date.now()}.pdf`,
          fileSize: totalSize,
          outputFileSize: result.file.size,
          processType: 'convert',
          downloadUrl: blobUrl
        })
      }
    } catch (error: any) {
      ElMessage.error(error.message || '转换失败，请重试')
      processResult.value = { success: false, error: error.message || '转换失败，请重试' }
    }
  }

  const downloadResult = () => {
    if (!processResult.value?.data?.file) {
      ElMessage.error('没有可下载的文件')
      return
    }
    const blob = processResult.value.data.file
    const fileName = processResult.value.data.fileName || `图片转PDF_${Date.now()}.pdf`
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

  .file-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
    margin-bottom: 16px;
  }

  .add-card-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
  }

  .drag-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .file-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100px;
    padding: 12px 8px;
    text-align: center;
    cursor: grab;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
    transition: all 0.2s;

    &:active {
      cursor: grabbing;
    }

    &:hover {
      background: var(--el-fill-color);

      .file-card-close {
        opacity: 1;
      }
    }
  }

  .file-index {
    position: absolute;
    top: 4px;
    left: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 10px;
    font-weight: bold;
    color: #fff;
    background: var(--theme-color);
    border-radius: 50%;
  }

  .file-card-close {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 12px;
    color: #fff;
    cursor: pointer;
    background: var(--el-color-danger);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s;

    &:hover {
      background: var(--el-color-danger-dark-2);
    }
  }

  .file-preview {
    width: 80px;
    height: 60px;
    margin-bottom: 8px;
    object-fit: cover;
    border-radius: 4px;
  }

  .file-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .file-card-name {
    width: 100%;
    margin: 0;
    overflow: hidden;
    font-size: 11px;
    color: var(--el-text-color-regular);
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .add-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: transparent;
    border: 2px dashed var(--el-border-color);

    &:hover {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .file-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
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
    margin: 12px 0 8px;
    overflow: hidden;
    font-size: 14px;
    color: var(--el-text-color-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-stats {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
