<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || 'PDF密文标记'"
      :description="toolDescription || '对PDF文档中的敏感信息进行密文处理'"
    />
    <PermissionGuard feature-id="pdf-redact" feature-name="PDF密文标记" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || 'PDF密文标记' }}</span>
        </div>
        <div
          class="upload-area"
          :class="{ 'is-dragging': isDragging, 'has-files': hasFiles }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <!-- 上传区域 -->
          <template v-if="!hasFiles && !isProcessing && !processResult">
            <p class="text-base text-g-600 mb-2">将PDF文件拖拽到虚框内</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">点击上传文件(小于100M)</ElButton>
          </template>

          <!-- 密文编辑区域 -->
          <template v-if="hasFiles && !isProcessing && !processResult">
            <div class="redact-editor">
              <!-- PDF预览和密文区域选择 -->
              <div class="preview-section">
                <div class="preview-header">
                  <span class="preview-title">PDF预览</span>
                  <div class="page-nav">
                    <ElButton size="small" :disabled="currentPage <= 1" @click="currentPage--">
                      <ElIcon><ArrowLeft /></ElIcon>
                    </ElButton>
                    <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
                    <ElButton
                      size="small"
                      :disabled="currentPage >= totalPages"
                      @click="currentPage++"
                    >
                      <ElIcon><ArrowRight /></ElIcon>
                    </ElButton>
                  </div>
                </div>
                <div
                  class="preview-container"
                  ref="previewContainerRef"
                  @mousedown="startSelection"
                  @mousemove="updateSelection"
                  @mouseup="endSelection"
                >
                  <canvas ref="pdfCanvasRef" class="pdf-canvas"></canvas>
                  <!-- 密文区域覆盖层-->
                  <div
                    v-for="area in currentPageAreas"
                    :key="area.id"
                    class="redact-overlay"
                    :style="getAreaStyle(area)"
                    @click.stop="removeArea(area.id)"
                  >
                    <ElIcon class="remove-icon"><Close /></ElIcon>
                  </div>
                  <!-- 选择框-->
                  <div v-if="isSelecting" class="selection-box" :style="selectionStyle"></div>
                </div>
                <div class="preview-tip">
                  <ElIcon><InfoFilled /></ElIcon>
                  <span>在预览区域拖拽选择要标记的密文区域，点击已标记区域可删除</span>
                </div>
              </div>

              <!-- 工具面板 -->
              <div class="tools-section">
                <!-- 搜索标记 -->
                <div class="tool-panel">
                  <h4 class="panel-title">搜索标记</h4>
                  <div class="search-form">
                    <ElInput
                      v-model="searchText"
                      placeholder="输入要搜索的文字"
                      clearable
                      class="mb-2"
                    >
                      <template #prefix>
                        <ElIcon><Search /></ElIcon>
                      </template>
                    </ElInput>
                    <div class="search-options">
                      <ElCheckbox v-model="matchCase" size="small">区分大小写</ElCheckbox>
                      <ElCheckbox v-model="matchWholeWord" size="small">全词匹配</ElCheckbox>
                    </div>
                    <ElButton
                      type="primary"
                      size="small"
                      :loading="isSearching"
                      :disabled="!searchText.trim()"
                      @click="handleSearch"
                      class="mt-2 w-full"
                    >
                      搜索并标记
                    </ElButton>
                  </div>
                </div>

                <!-- 密文设置 -->
                <div class="tool-panel">
                  <h4 class="panel-title">密文设置</h4>
                  <div class="setting-row">
                    <span class="setting-label">填充颜色</span>
                    <ElColorPicker v-model="fillColor" size="small" />
                  </div>
                  <div class="setting-row">
                    <ElCheckbox v-model="removeMetadata">同时移除文档元数据</ElCheckbox>
                  </div>
                </div>

                <!-- 已标记区域列表-->
                <div class="tool-panel" v-if="redactAreas.length > 0">
                  <h4 class="panel-title">已标记区域({{ redactAreas.length }})</h4>
                  <div class="areas-list">
                    <div v-for="area in redactAreas" :key="area.id" class="area-item">
                      <div class="area-info">
                        <span class="area-type">{{ area.type === 'area' ? '区域' : '文字' }}</span>
                        <span class="area-page">第 {{ area.pageIndex + 1 }} 页</span>
                        <span v-if="area.searchText" class="area-text">{{ area.searchText }}</span>
                      </div>
                      <ElButton size="small" circle type="danger" @click="removeArea(area.id)">
                        <ElIcon><Delete /></ElIcon>
                      </ElButton>
                    </div>
                  </div>
                  <ElButton
                    size="small"
                    type="danger"
                    plain
                    @click="clearAllAreas"
                    class="mt-2 w-full"
                  >
                    清除所有标记
                  </ElButton>
                </div>
              </div>
            </div>

            <div class="file-actions">
              <ElButton
                type="primary"
                size="large"
                :disabled="redactAreas.length === 0"
                @click="handleApplyRedaction"
              >
                <ElIcon class="mr-1"><Check /></ElIcon>应用密文
              </ElButton>
              <ElButton size="large" @click="clearAllFiles">清空</ElButton>
            </div>
          </template>

          <!-- 处理中-->
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在处理密文" 
              :percentage="progress.progress"
              icon-from="ri:file-pdf-2-fill"
              icon-to="ri:file-pdf-2-fill"
            >
              <template #default>
                <p class="text-sm text-g-400 mt-2">{{ progressMessage }}</p>
              </template>
            </ToolResultView>
          </template>

          <!-- 处理结果 -->
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="密文处理完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                  <div class="result-badge success">
                    <ElIcon class="mr-1"><Check /></ElIcon>已处理
                  </div>
                  <p class="result-file-name">{{ resultFileName }}</p>
                </div>
                <p class="text-sm text-g-500 mt-4">共处理 {{ redactAreas.length }} 个密文区域</p>
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
              title="密文处理失败"
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
        <p class="mb-3">PDF密文标记工具可以对PDF文档中的敏感信息进行密文处理。</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持手动选择区域进行密文标记</li>
          <li>支持搜索特定文字并批量标记</li>
          <li>支持自定义密文填充颜色</li>
          <li>可选择同时移除文档元数据</li>
          <li>密文处理后内容将被永久覆盖</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
        <p class="mt-3 text-warning">
          <ElIcon><Warning /></ElIcon>
          注意：密文处理是不可逆的，请在处理前确认标记区域正确。
        </p>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    Loading,
    CircleClose,
    Download,
    Close,
    Check,
    Delete,
    ArrowLeft,
    ArrowRight,
    Search,
    InfoFilled,
    Warning
  } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import { pdfjsLib, getDocumentOptions } from '@/utils/pdfjs-config'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useFileProcessor } from '@/hooks/core/useFileProcessor'
  import { useHistory } from '@/hooks/core/useHistory'
  import { createRedactProcessor, type RedactionArea } from '@/processors/pdf/redact'

  defineOptions({ name: 'PdfRedactPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  // Refs
  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const pdfCanvasRef = ref<HTMLCanvasElement>()
  const previewContainerRef = ref<HTMLDivElement>()

  // Upload hook
  const {
    files,
    isDragging,
    hasFiles,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    clearFiles
  } = useUpload({ accept: '.pdf', multiple: false, maxSize: 100, maxCount: 1 })

  const { isProcessing, progress } = useFileProcessor()
  const { addRecord } = useHistory()

  // State
  const currentPage = ref(1)
  const totalPages = ref(0)
  const pdfDoc = ref<any>(null)
  const redactAreas = ref<RedactionArea[]>([])
  const processResult = ref<any>(null)
  const progressMessage = ref('正在处理...')

  // Search state
  const searchText = ref('')
  const matchCase = ref(false)
  const matchWholeWord = ref(false)
  const isSearching = ref(false)

  // Settings
  const fillColor = ref('#000000')
  const removeMetadata = ref(false)

  // Selection state
  const isSelecting = ref(false)
  const selectionStart = ref({ x: 0, y: 0 })
  const selectionEnd = ref({ x: 0, y: 0 })

  // Computed
  const resultFileName = computed(() => {
    if (files.value.length > 0) {
      return files.value[0].name.replace(/\.pdf$/i, '_redacted.pdf')
    }
    return 'redacted.pdf'
  })

  const currentPageAreas = computed(() => {
    return redactAreas.value.filter((area) => area.pageIndex === currentPage.value - 1)
  })

  const selectionStyle = computed(() => {
    if (!isSelecting.value) return {}

    const left = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const top = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const width = Math.abs(selectionEnd.value.x - selectionStart.value.x)
    const height = Math.abs(selectionEnd.value.y - selectionStart.value.y)

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    }
  })

  // Methods
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // Load PDF
  const loadPdf = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      pdfDoc.value = await pdfjsLib.getDocument(getDocumentOptions(arrayBuffer)).promise
      totalPages.value = pdfDoc.value.numPages
      currentPage.value = 1
      await renderPage(1)
    } catch (e) {
      console.error('Failed to load PDF:', e)
      ElMessage.error('PDF加载失败')
    }
  }

  // Render PDF page
  const renderPage = async (pageNum: number) => {
    if (!pdfDoc.value || !pdfCanvasRef.value) return

    try {
      const page = await pdfDoc.value.getPage(pageNum)
      const canvas = pdfCanvasRef.value
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const viewport = page.getViewport({ scale: 1.5 })
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise
    } catch (e) {
      console.error('Failed to render page:', e)
    }
  }

  // Watch for file changes
  watch(
    () => files.value,
    async (newFiles) => {
      if (newFiles.length > 0) {
        await loadPdf(newFiles[0].file)
      }
    },
    { immediate: true }
  )

  // Watch for page changes
  watch(currentPage, async (newPage) => {
    if (pdfDoc.value) {
      await renderPage(newPage)
    }
  })

  // Selection methods
  const startSelection = (e: MouseEvent) => {
    if (!previewContainerRef.value) return

    const rect = previewContainerRef.value.getBoundingClientRect()
    selectionStart.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    selectionEnd.value = { ...selectionStart.value }
    isSelecting.value = true
  }

  const updateSelection = (e: MouseEvent) => {
    if (!isSelecting.value || !previewContainerRef.value) return

    const rect = previewContainerRef.value.getBoundingClientRect()
    selectionEnd.value = {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    }
  }

  const endSelection = () => {
    if (!isSelecting.value || !previewContainerRef.value || !pdfCanvasRef.value) {
      isSelecting.value = false
      return
    }

    const canvas = pdfCanvasRef.value

    // Calculate selection in percentage
    const left = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const top = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const width = Math.abs(selectionEnd.value.x - selectionStart.value.x)
    const height = Math.abs(selectionEnd.value.y - selectionStart.value.y)

    // Minimum selection size
    if (width < 10 || height < 10) {
      isSelecting.value = false
      return
    }

    // Convert to percentage based on canvas size
    const xPercent = (left / canvas.width) * 100
    const yPercent = (top / canvas.height) * 100
    const widthPercent = (width / canvas.width) * 100
    const heightPercent = (height / canvas.height) * 100

    const newArea: RedactionArea = {
      id: `area-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pageIndex: currentPage.value - 1,
      type: 'area',
      x: xPercent,
      y: yPercent,
      width: widthPercent,
      height: heightPercent
    }

    redactAreas.value.push(newArea)
    isSelecting.value = false
    ElMessage.success('已添加密文区域')
  }

  // Get area style
  const getAreaStyle = (area: RedactionArea) => {
    return {
      left: `${area.x}%`,
      top: `${area.y}%`,
      width: `${area.width}%`,
      height: `${area.height}%`,
      backgroundColor: fillColor.value
    }
  }

  // Remove area
  const removeArea = (id: string) => {
    const index = redactAreas.value.findIndex((a) => a.id === id)
    if (index !== -1) {
      redactAreas.value.splice(index, 1)
    }
  }

  // Clear all areas
  const clearAllAreas = () => {
    redactAreas.value = []
    ElMessage.success('已清除所有标记')
  }

  // Search and mark text
  const handleSearch = async () => {
    if (!searchText.value.trim() || !files.value.length) return

    isSearching.value = true
    try {
      const processor = createRedactProcessor()
      const matches = await processor.searchText(files.value[0].file, searchText.value, {
        matchCase: matchCase.value,
        matchWholeWord: matchWholeWord.value
      })

      if (matches.length === 0) {
        ElMessage.warning('未找到匹配的文字')
        return
      }

      // Add matches as redaction areas
      for (const match of matches) {
        const newArea: RedactionArea = {
          id: match.id,
          pageIndex: match.pageIndex,
          type: 'text',
          x: match.x,
          y: match.y,
          width: match.width,
          height: match.height,
          searchText: match.text
        }
        redactAreas.value.push(newArea)
      }

      ElMessage.success(`已标记 ${matches.length} 处匹配文字`)
    } catch (e) {
      console.error('Search failed:', e)
      ElMessage.error('搜索失败')
    } finally {
      isSearching.value = false
    }
  }

  // Apply redaction
  const handleApplyRedaction = async () => {
    if (redactAreas.value.length === 0) {
      ElMessage.warning('请至少标记一个密文区域')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    try {
      const processor = createRedactProcessor()
      const file = files.value[0].file

      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: files.value[0].name,
        processedCount: 0
      }

      const result = await processor.process(
        file,
        {
          areas: redactAreas.value,
          fillColor: fillColor.value,
          removeMetadata: removeMetadata.value
        },
        (prog, msg) => {
          progress.value.progress = prog
          progressMessage.value = msg
        }
      )

      processResult.value = result

      if (result.success) {
        ElMessage.success('密文处理完成！')
        permissionGuardRef.value?.recordUsage()

        if (result.data) {
          const blobUrl = URL.createObjectURL(result.data)
          addRecord({
            toolId: 'pdf-redact',
            toolName: 'PDF密文标记',
            fileName: files.value[0].name,
            outputFileName: resultFileName.value,
            fileSize: files.value[0].size,
            outputFileSize: result.data.size,
            processType: 'redact',
            downloadUrl: blobUrl
          })
        }
      } else {
        ElMessage.error(result.error || '密文处理失败')
      }
    } catch (e: any) {
      processResult.value = { success: false, error: e.message || '密文处理失败' }
    }
  }

  // Download result
  const downloadResult = () => {
    if (!processResult.value?.data) return
    const url = URL.createObjectURL(processResult.value.data)
    const a = document.createElement('a')
    a.href = url
    a.download = resultFileName.value
    a.click()
    URL.revokeObjectURL(url)
  }

  // Clear all
  const clearAllFiles = () => {
    clearFiles()
    redactAreas.value = []
    pdfDoc.value = null
    totalPages.value = 0
    currentPage.value = 1
    processResult.value = null
    searchText.value = ''
  }

  // Continue processing
  const handleContinue = () => {
    processResult.value = null
    clearAllFiles()
  }

  // Retry
  const handleRetry = () => {
    processResult.value = null
  }

  // Lifecycle
  onUnmounted(() => {
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

  .redact-editor {
    display: flex;
    gap: 24px;
    width: 100%;

    @media (width <= 900px) {
      flex-direction: column;
    }
  }

  .preview-section {
    flex: 1;
    min-width: 0;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .preview-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .page-nav {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .page-info {
    min-width: 60px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    text-align: center;
  }

  .preview-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    overflow: hidden;
    cursor: crosshair;
    user-select: none;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .pdf-canvas {
    max-width: 100%;
    max-height: 600px;
    object-fit: contain;
  }

  .redact-overlay {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;

      .remove-icon {
        opacity: 1;
      }
    }
  }

  .remove-icon {
    font-size: 16px;
    color: white;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .selection-box {
    position: absolute;
    pointer-events: none;
    background: rgb(64 158 255 / 20%);
    border: 2px dashed var(--el-color-primary);
  }

  .preview-tip {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px 12px;
    margin-top: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-lighter);
    border-radius: 6px;
  }

  .tools-section {
    flex-shrink: 0;
    width: 300px;

    @media (width <= 900px) {
      width: 100%;
    }
  }

  .tool-panel {
    padding: 16px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .panel-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .search-form {
    .search-options {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .setting-label {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .areas-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .area-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    margin-bottom: 8px;
    background: var(--el-bg-color);
    border-radius: 6px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .area-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .area-type {
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .area-page {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .area-text {
    max-width: 150px;
    overflow: hidden;
    font-size: 11px;
    color: var(--el-text-color-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 24px;
  }

  .result-file-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 12px;
  }

  .result-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    padding: 4px 8px;
    font-size: 12px;
    border-radius: 4px;

    &.success {
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
    }
  }

  .result-file-name {
    max-width: 200px;
    margin-top: 12px;
    overflow: hidden;
    font-size: 14px;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .text-warning {
    display: flex;
    gap: 6px;
    align-items: center;
    color: var(--el-color-warning);
  }
</style>
