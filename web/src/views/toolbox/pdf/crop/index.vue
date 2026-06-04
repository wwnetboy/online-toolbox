<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '裁剪PDF'"
      :description="toolDescription || '裁剪PDF页面，移除不需要的边距或内容'"
    />
    <PermissionGuard feature-id="pdf-crop" feature-name="裁剪PDF" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '裁剪PDF' }}</span>
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
            <div class="crop-layout">
              <!-- 左侧：PDF预览和裁剪区域-->
              <div class="preview-section">
                <div class="preview-header">
                  <span class="preview-title">页面预览</span>
                  <span class="page-info-badge">{{ currentEditPage }} / {{ totalPages }} 页</span>
                </div>
                <div class="pdf-preview-container" ref="previewContainerRef">
                  <div
                    class="canvas-wrapper"
                    @mousedown="startCropDrag"
                    @mousemove="onCropDrag"
                    @mouseup="stopCropDrag"
                    @mouseleave="stopCropDrag"
                  >
                    <canvas ref="pdfCanvasRef" class="pdf-canvas"></canvas>
                    <!-- 裁剪遮罩层 -->
                    <div class="crop-mask">
                      <div class="mask-top" :style="maskTopStyle"></div>
                      <div class="mask-bottom" :style="maskBottomStyle"></div>
                      <div class="mask-left" :style="maskLeftStyle"></div>
                      <div class="mask-right" :style="maskRightStyle"></div>
                    </div>
                    <!-- 裁剪切-->
                    <div class="crop-box" :style="cropBoxStyle">
                      <div class="crop-handle nw" @mousedown.stop="startResize('nw', $event)"></div>
                      <div class="crop-handle ne" @mousedown.stop="startResize('ne', $event)"></div>
                      <div class="crop-handle sw" @mousedown.stop="startResize('sw', $event)"></div>
                      <div class="crop-handle se" @mousedown.stop="startResize('se', $event)"></div>
                      <div class="crop-handle n" @mousedown.stop="startResize('n', $event)"></div>
                      <div class="crop-handle s" @mousedown.stop="startResize('s', $event)"></div>
                      <div class="crop-handle w" @mousedown.stop="startResize('w', $event)"></div>
                      <div class="crop-handle e" @mousedown.stop="startResize('e', $event)"></div>
                      <div class="crop-size-info">
                        {{ Math.round(currentCropArea.width) }} ×
                        {{ Math.round(currentCropArea.height) }} pt
                      </div>
                    </div>
                  </div>
                  <!-- 加载指示器 -->
                  <div v-if="isLoadingPage" class="loading-overlay">
                    <ElIcon class="animate-spin text-3xl text-theme"><Loading /></ElIcon>
                  </div>
                </div>
                <!-- 页面导航 -->
                <div class="page-navigation">
                  <ElButton :disabled="currentEditPage <= 1" @click="goToPage(currentEditPage - 1)">
                    <ElIcon><ArrowLeft /></ElIcon>
                  </ElButton>
                  <ElInputNumber
                    v-model="currentEditPage"
                    :min="1"
                    :max="Math.max(1, totalPages)"
                    size="small"
                    controls-position="right"
                    @change="onPageChange"
                  />
                  <ElButton
                    :disabled="currentEditPage >= totalPages"
                    @click="goToPage(currentEditPage + 1)"
                  >
                    <ElIcon><ArrowRight /></ElIcon>
                  </ElButton>
                </div>
              </div>
              <!-- 右侧：裁剪选项 -->
              <div class="options-section">
                <div class="file-info">
                  <Icon icon="ri:file-pdf-2-fill" class="text-3xl text-danger" />
                  <div class="file-details">
                    <p class="file-name">{{ files[0]?.name }}</p>
                    <p class="file-meta"
                      >{{ totalPages }} 页 · {{ formatFileSize(files[0]?.size) }}</p
                    >
                  </div>
                  <ElButton text type="danger" @click="clearFiles">
                    <ElIcon><Close /></ElIcon>
                  </ElButton>
                </div>

                <!-- 裁剪模式 -->
                <div class="option-group">
                  <h4 class="option-title">裁剪模式</h4>
                  <ElRadioGroup v-model="cropOptions.mode" size="small" @change="onModeChange">
                    <ElRadioButton value="same">统一裁剪</ElRadioButton>
                    <ElRadioButton value="individual">逐页裁剪</ElRadioButton>
                  </ElRadioGroup>
                  <p class="option-hint">
                    {{
                      cropOptions.mode === 'same'
                        ? '所有页面使用相同的裁剪区域'
                        : '每页可设置不同的裁剪区域'
                    }}
                  </p>
                </div>

                <!-- 裁剪尺寸 -->
                <div class="option-group">
                  <h4 class="option-title">裁剪区域 (pt)</h4>
                  <div class="crop-inputs">
                    <div class="input-row">
                      <label>X</label>
                      <ElInputNumber
                        v-model="currentCropArea.x"
                        :min="0"
                        :max="Math.max(0, currentPageWidth - 10)"
                        :step="1"
                        size="small"
                        @change="onCropInputChange"
                      />
                    </div>
                    <div class="input-row">
                      <label>Y</label>
                      <ElInputNumber
                        v-model="currentCropArea.y"
                        :min="0"
                        :max="Math.max(0, currentPageHeight - 10)"
                        :step="1"
                        size="small"
                        @change="onCropInputChange"
                      />
                    </div>
                    <div class="input-row">
                      <label>宽</label>
                      <ElInputNumber
                        v-model="currentCropArea.width"
                        :min="10"
                        :max="Math.max(10, currentPageWidth - currentCropArea.x)"
                        :step="1"
                        size="small"
                        @change="onCropInputChange"
                      />
                    </div>
                    <div class="input-row">
                      <label>高</label>
                      <ElInputNumber
                        v-model="currentCropArea.height"
                        :min="10"
                        :max="Math.max(10, currentPageHeight - currentCropArea.y)"
                        :step="1"
                        size="small"
                        @change="onCropInputChange"
                      />
                    </div>
                  </div>
                  <p class="page-size-hint">
                    页面尺寸: {{ Math.round(currentPageWidth) }} ×
                    {{ Math.round(currentPageHeight) }} pt
                  </p>
                </div>

                <!-- 快捷操作 -->
                <div class="option-group">
                  <h4 class="option-title">快捷操作</h4>
                  <div class="quick-actions">
                    <ElButton size="small" @click="applyQuickCrop('margin-10')">边距10pt</ElButton>
                    <ElButton size="small" @click="applyQuickCrop('margin-20')">边距20pt</ElButton>
                    <ElButton size="small" @click="applyQuickCrop('margin-50')">边距50pt</ElButton>
                    <ElButton size="small" @click="applyQuickCrop('reset')">重置</ElButton>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="action-buttons">
                  <ElButton type="primary" size="large" @click="handleCrop" :loading="isProcessing">
                    裁剪PDF
                  </ElButton>
                </div>
              </div>
            </div>
          </template>
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在裁剪PDF" 
              :percentage="progress.progress"
              icon-from="ri:file-pdf-2-fill"
              icon-to="ri:file-pdf-2-fill"
            />
          </template>
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="裁剪完成！"
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
              title="裁剪失败"
              :message="processResult.error || '裁剪失败，请重试'"
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
        <p class="mb-3">PDF裁剪工具可以裁剪PDF页面，移除不需要的边距或内容：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>实时预览PDF页面内容</li>
          <li>可视化拖拽调整裁剪区域</li>
          <li>支持统一裁剪或逐页裁剪</li>
          <li>精确输入裁剪尺寸</li>
          <li>所有处理在浏览器本地完成</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, reactive, onUnmounted, nextTick } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    Loading,
    CircleClose,
    Download,
    Close,
    ArrowLeft,
    ArrowRight
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
  import {
    createCropProcessor,
    type CropOptions,
    type CropArea,
    type PageDimension,
    defaultCropOptions
  } from '@/processors/pdf/crop'

  defineOptions({ name: 'PdfCropPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const pdfCanvasRef = ref<HTMLCanvasElement>()
  const previewContainerRef = ref<HTMLDivElement>()

  const {
    files,
    isDragging,
    hasFiles,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    clearFiles: clearUploadFiles
  } = useUpload({ accept: '.pdf', multiple: false, maxSize: 100, maxCount: 1 })
  const { isProcessing, progress } = useFileProcessor()
  const { addRecord } = useHistory()

  // PDF state
  const pdfDoc = ref<any>(null)
  const pageDimensions = ref<PageDimension[]>([])
  const totalPages = ref(0)
  const currentEditPage = ref(1)
  const isLoadingPage = ref(false)
  const renderScale = 1.5 // PDF渲染缩放比例

  // Crop options
  const cropOptions = reactive<CropOptions>({ ...defaultCropOptions })
  const processResult = ref<any>(null)

  // Individual page crops storage
  const individualCrops = ref<Map<number, CropArea>>(new Map())

  // Current crop area
  const currentCropArea = reactive<CropArea>({
    x: 0,
    y: 0,
    width: 595,
    height: 842
  })

  // Drag/resize state
  const isDraggingCrop = ref(false)
  const isResizing = ref(false)
  const resizeHandle = ref('')
  const dragStart = reactive({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 })

  // Current page dimensions
  const currentPageWidth = computed(() => {
    if (pageDimensions.value.length === 0) return 595
    const page = pageDimensions.value[currentEditPage.value - 1]
    return page?.width || 595
  })

  const currentPageHeight = computed(() => {
    if (pageDimensions.value.length === 0) return 842
    const page = pageDimensions.value[currentEditPage.value - 1]
    return page?.height || 842
  })

  // Result filename
  const resultFileName = computed(() => {
    if (files.value.length > 0) {
      return files.value[0].name.replace(/\.pdf$/i, '_cropped.pdf')
    }
    return 'cropped.pdf'
  })

  // Crop box style (convert pt to canvas pixels)
  const cropBoxStyle = computed(() => {
    const scale = renderScale
    return {
      left: `${currentCropArea.x * scale}px`,
      top: `${currentCropArea.y * scale}px`,
      width: `${currentCropArea.width * scale}px`,
      height: `${currentCropArea.height * scale}px`
    }
  })

  // Mask styles
  const maskTopStyle = computed(() => {
    const scale = renderScale
    return { height: `${currentCropArea.y * scale}px` }
  })

  const maskBottomStyle = computed(() => {
    const scale = renderScale
    const bottom = currentPageHeight.value - currentCropArea.y - currentCropArea.height
    return { height: `${Math.max(0, bottom) * scale}px` }
  })

  const maskLeftStyle = computed(() => {
    const scale = renderScale
    return {
      top: `${currentCropArea.y * scale}px`,
      height: `${currentCropArea.height * scale}px`,
      width: `${currentCropArea.x * scale}px`
    }
  })

  const maskRightStyle = computed(() => {
    const scale = renderScale
    const right = currentPageWidth.value - currentCropArea.x - currentCropArea.width
    return {
      top: `${currentCropArea.y * scale}px`,
      height: `${currentCropArea.height * scale}px`,
      width: `${Math.max(0, right) * scale}px`
    }
  })

  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Load PDF document
  const loadPdf = async (file: File) => {
    try {
      isLoadingPage.value = true
      const arrayBuffer = await file.arrayBuffer()
      pdfDoc.value = await pdfjsLib.getDocument(getDocumentOptions(arrayBuffer)).promise
      totalPages.value = pdfDoc.value.numPages

      // Get page dimensions
      const processor = createCropProcessor()
      pageDimensions.value = await processor.getPageDimensions(file)

      currentEditPage.value = 1
      individualCrops.value.clear()

      // Initialize crop area to full page
      if (pageDimensions.value.length > 0) {
        const firstPage = pageDimensions.value[0]
        currentCropArea.x = 0
        currentCropArea.y = 0
        currentCropArea.width = firstPage.width
        currentCropArea.height = firstPage.height
        cropOptions.cropArea = { ...currentCropArea }
      }

      // Wait for DOM to update before rendering
      await nextTick()
      await renderPage(1)
    } catch (e) {
      console.error('Failed to load PDF:', e)
      ElMessage.error('PDF加载失败')
    } finally {
      isLoadingPage.value = false
    }
  }

  // Render PDF page to canvas
  const renderPage = async (pageNum: number) => {
    if (!pdfDoc.value) {
      console.warn('renderPage: pdfDoc is null')
      return
    }
    if (!pdfCanvasRef.value) {
      console.warn('renderPage: pdfCanvasRef is null, waiting...')
      await nextTick()
      if (!pdfCanvasRef.value) {
        console.error('renderPage: pdfCanvasRef still null after nextTick')
        return
      }
    }

    try {
      isLoadingPage.value = true
      const page = await pdfDoc.value.getPage(pageNum)
      const canvas = pdfCanvasRef.value
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('renderPage: failed to get 2d context')
        return
      }

      const viewport = page.getViewport({ scale: renderScale })
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise

      console.log(
        'renderPage: rendered page',
        pageNum,
        'size:',
        viewport.width,
        'x',
        viewport.height
      )
    } catch (e) {
      console.error('Failed to render page:', e)
    } finally {
      isLoadingPage.value = false
    }
  }

  // Watch for file changes
  watch(
    () => files.value,
    async (newFiles) => {
      if (newFiles.length > 0) {
        // Wait for template to render the canvas (hasFiles becomes true)
        await nextTick()
        await nextTick() // Double nextTick to ensure DOM is fully updated
        await loadPdf(newFiles[0].file)
      } else {
        pdfDoc.value = null
        pageDimensions.value = []
        totalPages.value = 0
      }
    }
  )

  // Page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      // Save current crop before switching
      if (cropOptions.mode === 'individual') {
        individualCrops.value.set(currentEditPage.value, { ...currentCropArea })
      }
      currentEditPage.value = page
    }
  }

  const onPageChange = (val: number | undefined) => {
    if (val && val >= 1 && val <= totalPages.value) {
      goToPage(val)
    }
  }

  // Watch page changes to render and load crop
  watch(currentEditPage, async (newPage) => {
    await renderPage(newPage)

    if (cropOptions.mode === 'individual') {
      // Load saved crop or initialize to full page
      if (individualCrops.value.has(newPage)) {
        const saved = individualCrops.value.get(newPage)!
        Object.assign(currentCropArea, saved)
      } else {
        const page = pageDimensions.value[newPage - 1]
        if (page) {
          currentCropArea.x = 0
          currentCropArea.y = 0
          currentCropArea.width = page.width
          currentCropArea.height = page.height
        }
      }
    }
  })

  // Mode change handler
  const onModeChange = () => {
    if (cropOptions.mode === 'same') {
      // Apply current crop to all pages
      cropOptions.cropArea = { ...currentCropArea }
      individualCrops.value.clear()
    }
  }

  // Crop input change handler
  const onCropInputChange = () => {
    // Clamp values
    currentCropArea.x = Math.max(0, Math.min(currentCropArea.x, currentPageWidth.value - 10))
    currentCropArea.y = Math.max(0, Math.min(currentCropArea.y, currentPageHeight.value - 10))
    currentCropArea.width = Math.max(
      10,
      Math.min(currentCropArea.width, currentPageWidth.value - currentCropArea.x)
    )
    currentCropArea.height = Math.max(
      10,
      Math.min(currentCropArea.height, currentPageHeight.value - currentCropArea.y)
    )

    saveCropArea()
  }

  // Save crop area based on mode
  const saveCropArea = () => {
    if (cropOptions.mode === 'same') {
      cropOptions.cropArea = { ...currentCropArea }
    } else {
      individualCrops.value.set(currentEditPage.value, { ...currentCropArea })
    }
  }

  // Quick crop presets
  const applyQuickCrop = (preset: string) => {
    const w = currentPageWidth.value
    const h = currentPageHeight.value

    switch (preset) {
      case 'margin-10':
        currentCropArea.x = 10
        currentCropArea.y = 10
        currentCropArea.width = w - 20
        currentCropArea.height = h - 20
        break
      case 'margin-20':
        currentCropArea.x = 20
        currentCropArea.y = 20
        currentCropArea.width = w - 40
        currentCropArea.height = h - 40
        break
      case 'margin-50':
        currentCropArea.x = 50
        currentCropArea.y = 50
        currentCropArea.width = w - 100
        currentCropArea.height = h - 100
        break
      case 'reset':
        currentCropArea.x = 0
        currentCropArea.y = 0
        currentCropArea.width = w
        currentCropArea.height = h
        break
    }
    saveCropArea()
  }

  // Convert mouse position to PDF coordinates
  const getMousePdfCoords = (e: MouseEvent) => {
    if (!pdfCanvasRef.value) return { x: 0, y: 0 }

    const rect = pdfCanvasRef.value.getBoundingClientRect()
    const scaleX = pdfCanvasRef.value.width / rect.width
    const scaleY = pdfCanvasRef.value.height / rect.height

    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY

    // Convert canvas pixels to PDF points
    const x = canvasX / renderScale
    const y = canvasY / renderScale

    return { x, y }
  }

  // Start crop box drag
  const startCropDrag = (e: MouseEvent) => {
    if (isResizing.value) return

    const coords = getMousePdfCoords(e)
    // Check if click is inside crop box
    if (
      coords.x >= currentCropArea.x &&
      coords.x <= currentCropArea.x + currentCropArea.width &&
      coords.y >= currentCropArea.y &&
      coords.y <= currentCropArea.y + currentCropArea.height
    ) {
      isDraggingCrop.value = true
      dragStart.x = coords.x
      dragStart.y = coords.y
      dragStart.cropX = currentCropArea.x
      dragStart.cropY = currentCropArea.y
    }
  }

  // Drag crop box
  const onCropDrag = (e: MouseEvent) => {
    if (!isDraggingCrop.value && !isResizing.value) return

    const coords = getMousePdfCoords(e)

    if (isDraggingCrop.value) {
      const dx = coords.x - dragStart.x
      const dy = coords.y - dragStart.y

      let newX = dragStart.cropX + dx
      let newY = dragStart.cropY + dy

      // Clamp to page bounds
      newX = Math.max(0, Math.min(newX, currentPageWidth.value - currentCropArea.width))
      newY = Math.max(0, Math.min(newY, currentPageHeight.value - currentCropArea.height))

      currentCropArea.x = Math.round(newX)
      currentCropArea.y = Math.round(newY)
    } else if (isResizing.value) {
      handleResize(coords)
    }
  }

  // Stop drag
  const stopCropDrag = () => {
    if (isDraggingCrop.value || isResizing.value) {
      saveCropArea()
    }
    isDraggingCrop.value = false
    isResizing.value = false
    resizeHandle.value = ''
  }

  // Start resize
  const startResize = (handle: string, e: MouseEvent) => {
    e.preventDefault()
    isResizing.value = true
    resizeHandle.value = handle

    const coords = getMousePdfCoords(e)
    dragStart.x = coords.x
    dragStart.y = coords.y
    dragStart.cropX = currentCropArea.x
    dragStart.cropY = currentCropArea.y
    dragStart.cropW = currentCropArea.width
    dragStart.cropH = currentCropArea.height

    document.addEventListener('mousemove', onDocumentMouseMove)
    document.addEventListener('mouseup', onDocumentMouseUp)
  }

  const onDocumentMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return
    const coords = getMousePdfCoords(e)
    handleResize(coords)
  }

  const onDocumentMouseUp = () => {
    if (isResizing.value) {
      saveCropArea()
    }
    isResizing.value = false
    resizeHandle.value = ''
    document.removeEventListener('mousemove', onDocumentMouseMove)
    document.removeEventListener('mouseup', onDocumentMouseUp)
  }

  // Handle resize based on handle position
  const handleResize = (coords: { x: number; y: number }) => {
    const minSize = 10
    const dx = coords.x - dragStart.x
    const dy = coords.y - dragStart.y

    let newX = dragStart.cropX
    let newY = dragStart.cropY
    let newW = dragStart.cropW
    let newH = dragStart.cropH

    const handle = resizeHandle.value

    // Horizontal resize
    if (handle.includes('w')) {
      newX = Math.max(
        0,
        Math.min(dragStart.cropX + dx, dragStart.cropX + dragStart.cropW - minSize)
      )
      newW = dragStart.cropW - (newX - dragStart.cropX)
    }
    if (handle.includes('e')) {
      newW = Math.max(
        minSize,
        Math.min(dragStart.cropW + dx, currentPageWidth.value - dragStart.cropX)
      )
    }

    // Vertical resize
    if (handle.includes('n')) {
      newY = Math.max(
        0,
        Math.min(dragStart.cropY + dy, dragStart.cropY + dragStart.cropH - minSize)
      )
      newH = dragStart.cropH - (newY - dragStart.cropY)
    }
    if (handle.includes('s')) {
      newH = Math.max(
        minSize,
        Math.min(dragStart.cropH + dy, currentPageHeight.value - dragStart.cropY)
      )
    }

    currentCropArea.x = Math.round(newX)
    currentCropArea.y = Math.round(newY)
    currentCropArea.width = Math.round(newW)
    currentCropArea.height = Math.round(newH)
  }

  // Crop handler
  const handleCrop = async () => {
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
      const processor = createCropProcessor()
      const file = files.value[0].file
      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: files.value[0].name,
        processedCount: 0
      }

      // Prepare options
      const options: CropOptions = {
        mode: cropOptions.mode,
        cropArea: cropOptions.mode === 'same' ? { ...currentCropArea } : cropOptions.cropArea
      }

      if (cropOptions.mode === 'individual') {
        // Save current page's crop
        individualCrops.value.set(currentEditPage.value, { ...currentCropArea })
        options.pageCrops = individualCrops.value
      }

      const result = await processor.process([file], options, (prog) => {
        progress.value.progress = prog
      })

      processResult.value = result

      if (result.success) {
        ElMessage.success('裁剪完成！')
        permissionGuardRef.value?.recordUsage()
        if (result.data) {
          const blobUrl = URL.createObjectURL(result.data)
          addRecord({
            toolId: 'pdf-crop',
            toolName: '裁剪PDF',
            fileName: files.value[0].name,
            outputFileName: resultFileName.value,
            fileSize: files.value[0].size,
            outputFileSize: result.data.size,
            processType: 'crop',
            downloadUrl: blobUrl
          })
        }
      } else {
        ElMessage.error(result.error || '裁剪失败')
      }
    } catch (e: any) {
      processResult.value = { success: false, error: e.message || '裁剪失败' }
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
    pdfDoc.value = null
    pageDimensions.value = []
    totalPages.value = 0
    cropOptions.mode = 'same'
    individualCrops.value.clear()
    currentCropArea.x = 0
    currentCropArea.y = 0
    currentCropArea.width = 595
    currentCropArea.height = 842
  }

  const handleContinue = () => {
    processResult.value = null
    clearFiles()
  }

  const handleRetry = () => {
    processResult.value = null
  }

  // Cleanup
  onUnmounted(() => {
    document.removeEventListener('mousemove', onDocumentMouseMove)
    document.removeEventListener('mouseup', onDocumentMouseUp)
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
      padding: 20px;
      border: none;
      background: transparent;
    }
  }

  .crop-layout {
    display: flex;
    gap: 24px;

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

  .page-info-badge {
    padding: 2px 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color);
    border-radius: 4px;
  }

  .pdf-preview-container {
    position: relative;
    min-height: 400px;
    max-height: 600px;
    overflow: auto;
    cursor: move;
    background: #f5f5f5;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
  }

  .canvas-wrapper {
    position: relative;
    display: inline-block;
    cursor: move;
  }

  .pdf-canvas {
    display: block;
  }

  .crop-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .mask-top,
  .mask-bottom,
  .mask-left,
  .mask-right {
    position: absolute;
    background: rgb(0 0 0 / 50%);
  }

  .mask-top {
    top: 0;
    right: 0;
    left: 0;
  }

  .mask-bottom {
    right: 0;
    bottom: 0;
    left: 0;
  }

  .mask-left {
    left: 0;
  }

  .mask-right {
    right: 0;
  }

  .crop-box {
    position: absolute;
    box-sizing: border-box;
    pointer-events: none;
    border: 2px dashed var(--el-color-primary);
  }

  .crop-handle {
    position: absolute;
    z-index: 10;
    width: 12px;
    height: 12px;
    pointer-events: auto;
    background: var(--el-color-primary);
    border: 2px solid #fff;
    border-radius: 50%;

    &.nw {
      top: -6px;
      left: -6px;
      cursor: nwse-resize;
    }

    &.ne {
      top: -6px;
      right: -6px;
      cursor: nesw-resize;
    }

    &.sw {
      bottom: -6px;
      left: -6px;
      cursor: nesw-resize;
    }

    &.se {
      right: -6px;
      bottom: -6px;
      cursor: nwse-resize;
    }

    &.n {
      top: -6px;
      left: 50%;
      cursor: ns-resize;
      transform: translateX(-50%);
    }

    &.s {
      bottom: -6px;
      left: 50%;
      cursor: ns-resize;
      transform: translateX(-50%);
    }

    &.w {
      top: 50%;
      left: -6px;
      cursor: ew-resize;
      transform: translateY(-50%);
    }

    &.e {
      top: 50%;
      right: -6px;
      cursor: ew-resize;
      transform: translateY(-50%);
    }
  }

  .crop-size-info {
    position: absolute;
    right: 4px;
    bottom: 4px;
    padding: 2px 6px;
    font-size: 11px;
    color: #fff;
    pointer-events: none;
    background: rgb(0 0 0 / 70%);
    border-radius: 3px;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(255 255 255 / 80%);
  }

  .page-navigation {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
    margin-top: 12px;
  }

  .options-section {
    flex-shrink: 0;
    width: 280px;

    @media (width <= 900px) {
      width: 100%;
    }
  }

  .file-info {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .file-details {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    margin: 0;
    overflow: hidden;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-meta {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .option-group {
    padding: 12px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .option-title {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .option-hint {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .crop-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .input-row {
    display: flex;
    gap: 8px;
    align-items: center;

    label {
      min-width: 20px;
      font-size: 12px;
      color: var(--el-text-color-regular);
    }

    .el-input-number {
      flex: 1;
    }
  }

  .page-size-hint {
    margin: 8px 0 0;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .action-buttons {
    margin-top: 20px;

    .el-button {
      width: 100%;
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

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
