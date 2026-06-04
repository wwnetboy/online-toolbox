<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '添加页码'"
      :description="toolDescription || '为PDF文档添加页码'"
    />
    <PermissionGuard feature-id="pdf-page-number" feature-name="添加页码" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '添加页码' }}</span>
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
            <p class="text-base text-g-600 mb-2">将文件拖拽到虚框内</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">点击上传文件(小于100M)</ElButton>
          </template>
          <template v-if="hasFiles && !isProcessing && !processResult">
            <div class="file-grid-container">
              <div class="file-grid">
                <div v-for="file in files" :key="file.id" class="file-card">
                  <div class="file-card-close" @click.stop="removeFile(file.id)">
                    <ElIcon><Close /></ElIcon>
                  </div>
                  <div class="file-card-icon">
                    <Icon icon="ri:file-pdf-2-fill" class="text-4xl text-danger" />
                  </div>
                  <p class="file-card-name">{{ file.name }}</p>
                  <p class="file-card-pages" v-if="totalPages > 0">{{ totalPages }} 页</p>
                </div>
              </div>
              <div class="page-number-options">
                <!-- 页码位置 -->
                <div class="option-group">
                  <h4 class="option-title">页码位置</h4>
                  <div class="position-grid">
                    <ElButton
                      v-for="pos in positions"
                      :key="pos.value"
                      :type="pageNumberOptions.position === pos.value ? 'primary' : 'default'"
                      size="small"
                      @click="pageNumberOptions.position = pos.value"
                      >{{ pos.label }}</ElButton
                    >
                  </div>
                </div>
                <!-- 页码格式 -->
                <div class="option-group">
                  <h4 class="option-title">页码格式</h4>
                  <ElRadioGroup v-model="pageNumberOptions.format" size="small">
                    <ElRadio value="numeric">数字 (1, 2, 3)</ElRadio>
                    <ElRadio value="roman">罗马 (I, II, III)</ElRadio>
                    <ElRadio value="chinese">中文 (一, 二, 三)</ElRadio>
                    <ElRadio value="custom">自定义</ElRadio>
                  </ElRadioGroup>
                  <div v-if="pageNumberOptions.format === 'custom'" class="custom-format-input">
                    <ElInput
                      v-model="pageNumberOptions.customFormat"
                      placeholder="第{n}页，共{total}页"
                      size="small"
                    />
                    <p class="format-hint">使用 {n} 表示当前页码，{total} 表示总页数</p>
                  </div>
                </div>
                <!-- 起始页码和排除页面 -->
                <div class="option-group">
                  <h4 class="option-title">页码设置</h4>
                  <div class="param-row">
                    <span class="param-label">起始页码</span>
                    <ElInputNumber
                      v-model="pageNumberOptions.startNumber"
                      :min="1"
                      :max="9999"
                      size="small"
                    />
                  </div>
                  <div class="param-row">
                    <span class="param-label">排除页面</span>
                    <ElInput
                      v-model="excludePagesInput"
                      placeholder="如 1,3,5 或留空"
                      size="small"
                      @blur="parseExcludePages"
                    />
                  </div>
                  <p class="format-hint">输入要排除的页码，用逗号分隔</p>
                </div>
                <!-- 样式设置 -->
                <div class="option-group">
                  <h4 class="option-title">样式设置</h4>
                  <div class="param-row">
                    <span class="param-label">字体大小</span>
                    <ElInputNumber
                      v-model="pageNumberOptions.fontSize"
                      :min="8"
                      :max="72"
                      size="small"
                    />
                  </div>
                  <div class="param-row">
                    <span class="param-label">颜色</span>
                    <ElColorPicker v-model="pageNumberOptions.color" size="small" />
                  </div>
                  <div class="param-row">
                    <span class="param-label">边距(pt)</span>
                    <ElInputNumber
                      v-model="pageNumberOptions.margin"
                      :min="10"
                      :max="100"
                      size="small"
                    />
                  </div>
                </div>
                <!-- 预览 -->
                <div class="option-group" v-if="previewUrl">
                  <h4 class="option-title">预览效果</h4>
                  <div class="preview-container">
                    <iframe :src="previewUrl" class="preview-iframe"></iframe>
                  </div>
                  <div class="preview-nav">
                    <ElButton size="small" :disabled="previewPage <= 1" @click="previewPage--">
                      上一页
                    </ElButton>
                    <span class="preview-page-info">{{ previewPage }} / {{ totalPages }}</span>
                    <ElButton
                      size="small"
                      :disabled="previewPage >= totalPages"
                      @click="previewPage++"
                    >
                      下一页
                    </ElButton>
                  </div>
                </div>
              </div>
              <div class="file-actions">
                <ElButton type="primary" size="large" @click="handleAddPageNumber">
                  添加页码
                </ElButton>
                <ElButton size="large" @click="handlePreview" :loading="isPreviewLoading">
                  预览
                </ElButton>
                <ElButton size="large" @click="clearFiles">清空</ElButton>
              </div>
            </div>
          </template>
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在添加页码" 
              :percentage="progress.progress"
              icon-from="ri:file-pdf-2-fill"
              icon-to="ri:file-pdf-2-fill"
            />
          </template>
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="页码添加完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                  <p class="result-file-name">{{ resultFileName }}</p>
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
              title="添加页码失败"
              :message="processResult.error || '处理失败，请重试'"
              @retry="handleRetry"
              @reset="handleContinue"
            />
          </template>
        </div>
        <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
      </ElCard>
    </PermissionGuard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF页码工具可以为PDF文件添加页码。</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持6种页码位置选择</li>
          <li>支持数字、罗马数字、中文数字和自定义格式</li>
          <li>可设置起始页码和排除特定页面</li>
          <li>可自定义字体大小、颜色和边距</li>
          <li>所有处理在浏览器本地完成</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Loading, CircleClose, Download, Close } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useFileProcessor } from '@/hooks/core/useFileProcessor'
  import { useHistory } from '@/hooks/core/useHistory'
  import {
    createPageNumberProcessor,
    type PageNumberOptions,
    type PageNumberPosition,
    defaultPageNumberOptions
  } from '@/processors/pdf/page-number'

  defineOptions({ name: 'PdfPageNumberPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const {
    files,
    isDragging,
    hasFiles,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    clearFiles: clearUploadFiles
  } = useUpload({ accept: '.pdf', multiple: false, maxSize: 100, maxCount: 1 })
  const { isProcessing, progress } = useFileProcessor()
  const { addRecord } = useHistory()

  // Page number options
  const pageNumberOptions = ref<PageNumberOptions>({ ...defaultPageNumberOptions })
  const excludePagesInput = ref('')
  const totalPages = ref(0)
  const previewPage = ref(1)
  const previewUrl = ref<string | null>(null)
  const isPreviewLoading = ref(false)
  const processResult = ref<any>(null)

  const positions: Array<{ value: PageNumberPosition; label: string }> = [
    { value: 'top-left', label: '左上' },
    { value: 'top-center', label: '上中' },
    { value: 'top-right', label: '右上' },
    { value: 'bottom-left', label: '左下' },
    { value: 'bottom-center', label: '下中' },
    { value: 'bottom-right', label: '右下' }
  ]

  const resultFileName = computed(() => {
    if (files.value.length > 0) {
      return files.value[0].name.replace(/\.pdf$/i, '_numbered.pdf')
    }
    return 'numbered.pdf'
  })

  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // Parse exclude pages input
  const parseExcludePages = () => {
    if (!excludePagesInput.value.trim()) {
      pageNumberOptions.value.excludePages = []
      return
    }
    const pages = excludePagesInput.value
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0)
    pageNumberOptions.value.excludePages = [...new Set(pages)].sort((a, b) => a - b)
  }

  // Load page count when file is selected
  watch(
    () => files.value,
    async (newFiles) => {
      if (newFiles.length > 0) {
        try {
          const processor = createPageNumberProcessor()
          totalPages.value = await processor.getPageCount(newFiles[0].file)
          previewPage.value = 1
          previewUrl.value = null
        } catch (e) {
          console.error('Failed to get page count:', e)
          totalPages.value = 0
        }
      } else {
        totalPages.value = 0
        previewUrl.value = null
      }
    },
    { immediate: true }
  )

  // Update preview when preview page changes
  watch(previewPage, async () => {
    if (hasFiles.value && previewUrl.value) {
      await handlePreview()
    }
  })

  const handlePreview = async () => {
    if (!hasFiles.value) return

    isPreviewLoading.value = true
    try {
      // Clean up old preview URL
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
      }

      const processor = createPageNumberProcessor()
      const result = await processor.preview(
        files.value[0].file,
        pageNumberOptions.value,
        previewPage.value - 1
      )

      if (result.success && result.data) {
        previewUrl.value = result.data
      } else {
        ElMessage.error(result.error || '预览生成失败')
      }
    } catch (e: any) {
      ElMessage.error(e.message || '预览生成失败')
    } finally {
      isPreviewLoading.value = false
    }
  }

  const handleAddPageNumber = async () => {
    if (!hasFiles.value) {
      ElMessage.warning('请先上传PDF文件')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    try {
      const processor = createPageNumberProcessor()
      const file = files.value[0].file
      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: files.value[0].name,
        processedCount: 0
      }

      const result = await processor.process([file], pageNumberOptions.value, (prog) => {
        progress.value.progress = prog
      })

      processResult.value = result

      if (result.success) {
        ElMessage.success('页码添加完成！')
        // Record usage
        permissionGuardRef.value?.recordUsage()
        // Save history
        if (result.data) {
          const blobUrl = URL.createObjectURL(result.data)
          addRecord({
            toolId: 'pdf-page-number',
            toolName: '添加页码',
            fileName: files.value[0].name,
            outputFileName: resultFileName.value,
            fileSize: files.value[0].size,
            outputFileSize: result.data.size,
            processType: 'page-number',
            downloadUrl: blobUrl
          })
        }
      } else {
        ElMessage.error(result.error || '添加页码失败')
      }
    } catch (e: any) {
      processResult.value = { success: false, error: e.message || '添加页码失败' }
    }
  }

  const downloadResult = () => {
    if (!processResult.value?.data) return
    const url = URL.createObjectURL(processResult.value.data)
    const a = document.createElement('a')
    a.href = url
    a.download = resultFileName.value
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFiles = () => {
    clearUploadFiles()
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
    excludePagesInput.value = ''
    pageNumberOptions.value = { ...defaultPageNumberOptions }
  }

  const handleContinue = () => {
    processResult.value = null
    clearFiles()
  }

  const handleRetry = () => {
    processResult.value = null
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    if (processResult.value?.data) {
      URL.revokeObjectURL(URL.createObjectURL(processResult.value.data))
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
    margin-bottom: 20px;
  }

  .file-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 90px;
    padding: 16px 8px;
    text-align: center;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      background: var(--el-fill-color);

      .file-card-close {
        opacity: 1;
      }
    }
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
    font-size: 12px;
    color: var(--el-text-color-regular);
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-card-pages {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .page-number-options {
    width: 100%;
    max-width: 500px;
    margin-bottom: 20px;
    text-align: left;
  }

  .option-group {
    padding: 12px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .option-title {
    margin: 0 0 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .position-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .param-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .param-label {
    min-width: 70px;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .custom-format-input {
    margin-top: 10px;
  }

  .format-hint {
    margin-top: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .preview-container {
    width: 100%;
    height: 300px;
    margin-bottom: 10px;
    overflow: hidden;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
  }

  .preview-iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .preview-nav {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
  }

  .preview-page-info {
    font-size: 13px;
    color: var(--el-text-color-regular);
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
    margin: 12px 0 0;
    overflow: hidden;
    font-size: 14px;
    color: var(--el-text-color-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
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
