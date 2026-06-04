<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || 'PDF编辑'"
      :description="toolDescription || '直接编辑PDF内容，添加文字、图片和形状'"
    />
    <PermissionGuard feature-id="pdf-edit" feature-name="PDF编辑" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || 'PDF编辑' }}</span>
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

          <!-- 编辑区域 -->
          <template v-if="hasFiles && !isProcessing && !processResult">
            <div class="editor-container">
              <!-- 工具栏 -->
              <div class="editor-toolbar">
                <div class="toolbar-group">
                  <ElTooltip content="添加文字" placement="bottom">
                    <ElButton
                      :type="currentTool === 'text' ? 'primary' : 'default'"
                      @click="selectTool('text')"
                    >
                      <ElIcon><EditPen /></ElIcon>
                    </ElButton>
                  </ElTooltip>
                  <ElTooltip content="添加图片" placement="bottom">
                    <ElButton
                      :type="currentTool === 'image' ? 'primary' : 'default'"
                      @click="selectTool('image')"
                    >
                      <ElIcon><Picture /></ElIcon>
                    </ElButton>
                  </ElTooltip>
                  <ElTooltip content="矩形" placement="bottom">
                    <ElButton
                      :type="currentTool === 'rectangle' ? 'primary' : 'default'"
                      @click="selectTool('rectangle')"
                    >
                      <Icon icon="ri:checkbox-blank-line" />
                    </ElButton>
                  </ElTooltip>
                  <ElTooltip content="圆形" placement="bottom">
                    <ElButton
                      :type="currentTool === 'circle' ? 'primary' : 'default'"
                      @click="selectTool('circle')"
                    >
                      <Icon icon="ri:checkbox-blank-circle-line" />
                    </ElButton>
                  </ElTooltip>
                  <ElTooltip content="直线" placement="bottom">
                    <ElButton
                      :type="currentTool === 'line' ? 'primary' : 'default'"
                      @click="selectTool('line')"
                    >
                      <Icon icon="ri:subtract-line" />
                    </ElButton>
                  </ElTooltip>
                  <ElTooltip content="箭头" placement="bottom">
                    <ElButton
                      :type="currentTool === 'arrow' ? 'primary' : 'default'"
                      @click="selectTool('arrow')"
                    >
                      <Icon icon="ri:arrow-right-up-line" />
                    </ElButton>
                  </ElTooltip>
                  <ElTooltip content="高亮" placement="bottom">
                    <ElButton
                      :type="currentTool === 'highlight' ? 'primary' : 'default'"
                      @click="selectTool('highlight')"
                    >
                      <Icon icon="ri:mark-pen-line" />
                    </ElButton>
                  </ElTooltip>
                </div>

                <ElDivider direction="vertical" />

                <div class="toolbar-group">
                  <ElTooltip content="撤销" placement="bottom">
                    <ElButton :disabled="!canUndo" @click="handleUndo">
                      <Icon icon="ri:arrow-go-back-line" />
                    </ElButton>
                  </ElTooltip>
                  <ElTooltip content="重做" placement="bottom">
                    <ElButton :disabled="!canRedo" @click="handleRedo">
                      <Icon icon="ri:arrow-go-forward-line" />
                    </ElButton>
                  </ElTooltip>
                </div>

                <ElDivider direction="vertical" />

                <div class="toolbar-group">
                  <ElTooltip content="选择工具" placement="bottom">
                    <ElButton
                      :type="currentTool === 'select' ? 'primary' : 'default'"
                      @click="selectTool('select')"
                    >
                      <Icon icon="ri:cursor-line" />
                    </ElButton>
                  </ElTooltip>
                  <ElTooltip content="删除选中" placement="bottom">
                    <ElButton :disabled="!selectedElement" type="danger" @click="deleteSelected">
                      <ElIcon><Delete /></ElIcon>
                    </ElButton>
                  </ElTooltip>
                </div>
              </div>

              <!-- 属性面板 -->
              <div class="property-panel" v-if="currentTool !== 'select'">
                <!-- 文字属性 -->
                <template v-if="currentTool === 'text'">
                  <div class="property-row">
                    <span class="property-label">字号</span>
                    <ElInputNumber v-model="textOptions.fontSize" :min="8" :max="72" size="small" />
                  </div>
                  <div class="property-row">
                    <span class="property-label">颜色</span>
                    <ElColorPicker v-model="textOptions.color" size="small" />
                  </div>
                </template>

                <!-- 形状属性 -->
                <template v-if="['rectangle', 'circle', 'line', 'arrow'].includes(currentTool)">
                  <div class="property-row">
                    <span class="property-label">边框颜色</span>
                    <ElColorPicker v-model="shapeOptions.strokeColor" size="small" />
                  </div>
                  <div class="property-row">
                    <span class="property-label">填充颜色</span>
                    <ElColorPicker v-model="shapeOptions.fillColor" size="small" />
                  </div>
                  <div class="property-row">
                    <span class="property-label">边框宽度</span>
                    <ElInputNumber
                      v-model="shapeOptions.strokeWidth"
                      :min="1"
                      :max="10"
                      size="small"
                    />
                  </div>
                </template>

                <!-- 高亮属性 -->
                <template v-if="currentTool === 'highlight'">
                  <div class="property-row">
                    <span class="property-label">颜色</span>
                    <ElColorPicker v-model="highlightOptions.color" size="small" />
                  </div>
                  <div class="property-row">
                    <span class="property-label">透明度</span>
                    <ElSlider
                      v-model="highlightOptions.opacity"
                      :min="0.1"
                      :max="1"
                      :step="0.1"
                      size="small"
                    />
                  </div>
                </template>
              </div>

              <!-- 编辑画布区域 -->
              <div class="editor-main">
                <!-- 页面导航 -->
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

                <!-- PDF画布 -->
                <div
                  class="canvas-container"
                  ref="canvasContainerRef"
                  @mousedown="handleCanvasMouseDown"
                  @mousemove="handleCanvasMouseMove"
                  @mouseup="handleCanvasMouseUp"
                  @mouseleave="handleCanvasMouseUp"
                >
                  <canvas ref="pdfCanvasRef" class="pdf-canvas"></canvas>

                  <!-- 编辑元素覆盖层 -->
                  <div
                    v-for="element in currentPageElements"
                    :key="element.id"
                    class="edit-element"
                    :class="{
                      'is-selected': selectedElement?.id === element.id,
                      'is-text': element.type === 'add-text',
                      'is-image': element.type === 'add-image',
                      'is-shape': element.type === 'add-shape',
                      'is-annotation': element.type === 'add-annotation'
                    }"
                    :style="getElementStyle(element)"
                    @mousedown.stop="selectElement(element)"
                  >
                    <!-- 文字元素 -->
                    <template v-if="element.type === 'add-text'">
                      <span
                        class="text-content"
                        :style="{
                          fontSize: (element.data as TextEdit).fontSize + 'px',
                          color: (element.data as TextEdit).color
                        }"
                      >
                        {{ (element.data as TextEdit).text }}
                      </span>
                    </template>

                    <!-- 图片元素 -->
                    <template v-if="element.type === 'add-image'">
                      <img
                        v-if="getImagePreviewUrl(element)"
                        :src="getImagePreviewUrl(element)"
                        class="image-content"
                      />
                    </template>

                    <!-- 形状元素 -->
                    <template v-if="element.type === 'add-shape'">
                      <div
                        class="shape-content"
                        :class="'shape-' + (element.data as ShapeEdit).type"
                        :style="getShapeStyle(element.data as ShapeEdit)"
                      ></div>
                    </template>

                    <!-- 批注元素 -->
                    <template v-if="element.type === 'add-annotation'">
                      <div
                        class="annotation-content"
                        :class="'annotation-' + (element.data as AnnotationEdit).type"
                        :style="getAnnotationStyle(element.data as AnnotationEdit)"
                      ></div>
                    </template>

                    <!-- 选中时的调整手柄 -->
                    <template v-if="selectedElement?.id === element.id">
                      <div
                        class="resize-handle nw"
                        @mousedown.stop="startResize($event, 'nw')"
                      ></div>
                      <div
                        class="resize-handle ne"
                        @mousedown.stop="startResize($event, 'ne')"
                      ></div>
                      <div
                        class="resize-handle sw"
                        @mousedown.stop="startResize($event, 'sw')"
                      ></div>
                      <div
                        class="resize-handle se"
                        @mousedown.stop="startResize($event, 'se')"
                      ></div>
                    </template>
                  </div>

                  <!-- 绘制预览 -->
                  <div
                    v-if="isDrawing && drawPreview"
                    class="draw-preview"
                    :style="drawPreview"
                  ></div>
                </div>

                <!-- 元素列表 -->
                <div class="elements-panel" v-if="currentPageElements.length > 0">
                  <h4 class="panel-title">当前页元素({{ currentPageElements.length }})</h4>
                  <div class="elements-list">
                    <div
                      v-for="element in currentPageElements"
                      :key="element.id"
                      class="element-item"
                      :class="{ 'is-selected': selectedElement?.id === element.id }"
                      @click="selectElement(element)"
                    >
                      <Icon :icon="getElementIcon(element)" class="element-icon" />
                      <span class="element-name">{{ getElementName(element) }}</span>
                      <ElButton
                        size="small"
                        circle
                        type="danger"
                        @click.stop="deleteElement(element.id)"
                      >
                        <ElIcon><Delete /></ElIcon>
                      </ElButton>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="file-actions">
                <ElButton
                  type="primary"
                  size="large"
                  :disabled="!hasModifications"
                  @click="handleSave"
                >
                  <ElIcon class="mr-1"><Check /></ElIcon>保存编辑
                </ElButton>
                <ElButton size="large" @click="clearAllFiles">清空</ElButton>
              </div>
            </div>
          </template>

          <!-- 处理中 -->
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在保存编辑" 
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
              title="编辑保存完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                  <div class="result-badge success">
                    <ElIcon class="mr-1"><Check /></ElIcon>已编辑
                  </div>
                  <p class="result-file-name">{{ resultFileName }}</p>
                </div>
              </template>
              <template #actions>
                <ElButton type="primary" @click="downloadResult">
                  <ElIcon class="mr-1"><Download /></ElIcon>下载文件
                </ElButton>
                <ElButton @click="handleContinue">继续编辑</ElButton>
              </template>
            </ToolResultView>
            <ToolResultView
              v-else
              type="error"
              title="编辑保存失败"
              :message="processResult.error || '保存失败，请重试'"
              @retry="handleRetry"
              @reset="handleContinue"
            />
          </template>
        </div>
        <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
        <input
          ref="imageInputRef"
          type="file"
          accept="image/*"
          hidden
          @change="handleImageUpload"
        />
      </ElCard>
    </PermissionGuard>

    <!-- 文字输入对话框 -->
    <ElDialog v-model="showTextDialog" title="添加文字" width="400px">
      <ElInput v-model="newTextContent" type="textarea" :rows="3" placeholder="请输入文字内容" />
      <template #footer>
        <ElButton @click="showTextDialog = false">取消</ElButton>
        <ElButton type="primary" @click="confirmAddText">确定</ElButton>
      </template>
    </ElDialog>

    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF编辑工具可以直接编辑PDF内容。</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>添加、编辑和删除文字</li>
          <li>添加和移除图片</li>
          <li>添加形状（矩形、圆形、直线、箭头）</li>
          <li>添加高亮批注</li>
          <li>支持撤销/重做操作</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
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
    Check,
    Delete,
    ArrowLeft,
    ArrowRight,
    EditPen,
    Picture
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
    createPdfEditor,
    type EditOperation,
    type TextEdit,
    type ImageEdit,
    type ShapeEdit,
    type AnnotationEdit,
    type ShapeType,
    type AnnotationType
  } from '@/processors/pdf/editor'

  defineOptions({ name: 'PdfEditPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  // 工具类型
  type ToolType =
    | 'select'
    | 'text'
    | 'image'
    | 'rectangle'
    | 'circle'
    | 'line'
    | 'arrow'
    | 'highlight'

  // Refs
  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const imageInputRef = ref<HTMLInputElement>()
  const pdfCanvasRef = ref<HTMLCanvasElement>()
  const canvasContainerRef = ref<HTMLDivElement>()

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

  // Editor instance
  const editor = createPdfEditor()

  // State
  const currentPage = ref(1)
  const totalPages = ref(0)
  const pdfDoc = ref<any>(null)
  const currentTool = ref<ToolType>('select')
  const selectedElement = ref<EditOperation | null>(null)
  const processResult = ref<any>(null)
  const progressMessage = ref('正在处理...')

  // Tool options
  const textOptions = ref({
    fontSize: 14,
    color: '#000000'
  })

  const shapeOptions = ref({
    strokeColor: '#000000',
    fillColor: '',
    strokeWidth: 2
  })

  const highlightOptions = ref({
    color: '#FFFF00',
    opacity: 0.3
  })

  // Drawing state
  const isDrawing = ref(false)
  const drawStartPos = ref({ x: 0, y: 0 })
  const drawCurrentPos = ref({ x: 0, y: 0 })
  const drawPreview = ref<Record<string, string> | null>(null)

  // Text dialog
  const showTextDialog = ref(false)
  const newTextContent = ref('')
  const pendingTextPosition = ref({ x: 0, y: 0 })

  // Image preview URLs
  const imagePreviewUrls = ref<Map<string, string>>(new Map())

  // Computed
  const resultFileName = computed(() => {
    if (files.value.length > 0) {
      return files.value[0].name.replace(/\.pdf$/i, '_edited.pdf')
    }
    return 'edited.pdf'
  })

  const currentPageElements = computed(() => {
    return editor.getPageOperations(currentPage.value - 1)
  })

  const hasModifications = computed(() => {
    return editor.isModified()
  })

  const canUndo = computed(() => editor.canUndo())
  const canRedo = computed(() => editor.canRedo())

  // Methods
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const selectTool = (tool: ToolType) => {
    currentTool.value = tool
    selectedElement.value = null

    if (tool === 'image') {
      imageInputRef.value?.click()
    }
  }

  // Load PDF
  const loadPdf = async (file: File) => {
    try {
      // Load into editor
      await editor.load(file)

      // Load for preview
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
      selectedElement.value = null
    }
  })

  // Canvas event handlers
  const handleCanvasMouseDown = (e: MouseEvent) => {
    if (!canvasContainerRef.value) return

    const rect = canvasContainerRef.value.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = 100 - ((e.clientY - rect.top) / rect.height) * 100 // Flip Y for PDF coordinates

    if (currentTool.value === 'select') {
      selectedElement.value = null
      return
    }

    if (currentTool.value === 'text') {
      pendingTextPosition.value = { x, y }
      showTextDialog.value = true
      return
    }

    // Start drawing for shapes and annotations
    if (['rectangle', 'circle', 'line', 'arrow', 'highlight'].includes(currentTool.value)) {
      isDrawing.value = true
      drawStartPos.value = { x, y }
      drawCurrentPos.value = { x, y }
    }
  }

  const handleCanvasMouseMove = (e: MouseEvent) => {
    if (!isDrawing.value || !canvasContainerRef.value) return

    const rect = canvasContainerRef.value.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = 100 - ((e.clientY - rect.top) / rect.height) * 100

    drawCurrentPos.value = { x, y }

    // Update preview
    const minX = Math.min(drawStartPos.value.x, x)
    const maxX = Math.max(drawStartPos.value.x, x)
    const minY = Math.min(drawStartPos.value.y, y)
    const maxY = Math.max(drawStartPos.value.y, y)

    drawPreview.value = {
      left: `${minX}%`,
      bottom: `${minY}%`,
      width: `${maxX - minX}%`,
      height: `${maxY - minY}%`,
      border: `2px dashed ${shapeOptions.value.strokeColor}`,
      background:
        currentTool.value === 'highlight'
          ? `rgba(255, 255, 0, ${highlightOptions.value.opacity})`
          : 'transparent'
    }
  }

  const handleCanvasMouseUp = () => {
    if (!isDrawing.value) return

    const minX = Math.min(drawStartPos.value.x, drawCurrentPos.value.x)
    const maxX = Math.max(drawStartPos.value.x, drawCurrentPos.value.x)
    const minY = Math.min(drawStartPos.value.y, drawCurrentPos.value.y)
    const maxY = Math.max(drawStartPos.value.y, drawCurrentPos.value.y)

    const width = maxX - minX
    const height = maxY - minY

    // Minimum size check
    if (width < 1 || height < 1) {
      isDrawing.value = false
      drawPreview.value = null
      return
    }

    // Add shape or annotation
    if (['rectangle', 'circle', 'line', 'arrow'].includes(currentTool.value)) {
      editor.addShape(currentPage.value - 1, {
        type: currentTool.value as ShapeType,
        x: minX,
        y: minY,
        width,
        height,
        strokeColor: shapeOptions.value.strokeColor,
        fillColor: shapeOptions.value.fillColor || undefined,
        strokeWidth: shapeOptions.value.strokeWidth
      })
    } else if (currentTool.value === 'highlight') {
      editor.addAnnotation(currentPage.value - 1, {
        type: 'highlight' as AnnotationType,
        x: minX,
        y: minY,
        width,
        height,
        color: highlightOptions.value.color,
        opacity: highlightOptions.value.opacity
      })
    }

    isDrawing.value = false
    drawPreview.value = null
  }

  // Text dialog
  const confirmAddText = () => {
    if (!newTextContent.value.trim()) {
      ElMessage.warning('请输入文字内容')
      return
    }

    editor.addText(currentPage.value - 1, {
      text: newTextContent.value,
      x: pendingTextPosition.value.x,
      y: pendingTextPosition.value.y,
      fontSize: textOptions.value.fontSize,
      color: textOptions.value.color
    })

    newTextContent.value = ''
    showTextDialog.value = false
    currentTool.value = 'select'
  }

  // Image upload
  const handleImageUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement
    if (!input.files || input.files.length === 0) return

    const file = input.files[0]
    if (!file.type.startsWith('image/')) {
      ElMessage.warning('请选择图片文件')
      return
    }

    const imageBlob = file
    const previewUrl = URL.createObjectURL(file)

    // Add image at center of current view
    const operation = editor.addImage(currentPage.value - 1, {
      imageData: imageBlob,
      x: 30,
      y: 30,
      width: 20,
      height: 20
    })

    // Store preview URL
    imagePreviewUrls.value.set(operation.data.id, previewUrl)

    input.value = ''
    currentTool.value = 'select'
    ElMessage.success('图片已添加')
  }

  // Element selection
  const selectElement = (element: EditOperation) => {
    if (currentTool.value === 'select') {
      selectedElement.value = element
    }
  }

  // Delete element
  const deleteElement = (id: string) => {
    const element = currentPageElements.value.find((e) => e.data.id === id)
    if (!element) return

    switch (element.type) {
      case 'add-text':
        editor.deleteText(id)
        break
      case 'add-image': {
        editor.deleteImage(id)
        // Clean up preview URL
        const url = imagePreviewUrls.value.get(id)
        if (url) {
          URL.revokeObjectURL(url)
          imagePreviewUrls.value.delete(id)
        }
        break
      }
      case 'add-shape':
        editor.deleteShape(id)
        break
      case 'add-annotation':
        editor.deleteAnnotation(id)
        break
    }

    if (selectedElement.value?.data.id === id) {
      selectedElement.value = null
    }
  }

  const deleteSelected = () => {
    if (selectedElement.value) {
      deleteElement(selectedElement.value.data.id)
    }
  }

  // Undo/Redo
  const handleUndo = () => {
    const undone = editor.undo()
    if (undone) {
      selectedElement.value = null
    }
  }

  const handleRedo = () => {
    const redone = editor.redo()
    if (redone) {
      selectedElement.value = null
    }
  }

  // Resize handling
  const startResize = (e: MouseEvent) => {
    // Simplified resize - just prevent default for now
    e.preventDefault()
  }

  // Element styling helpers
  const getElementStyle = (element: EditOperation) => {
    const data = element.data as any
    return {
      left: `${data.x}%`,
      bottom: `${data.y}%`,
      width: data.width ? `${data.width}%` : 'auto',
      height: data.height ? `${data.height}%` : 'auto'
    }
  }

  const getShapeStyle = (data: ShapeEdit) => {
    const style: Record<string, string> = {
      borderColor: data.strokeColor,
      borderWidth: `${data.strokeWidth}px`,
      borderStyle: 'solid'
    }

    if (data.fillColor) {
      style.backgroundColor = data.fillColor
    }

    if (data.type === 'circle') {
      style.borderRadius = '50%'
    }

    return style
  }

  const getAnnotationStyle = (data: AnnotationEdit) => {
    return {
      backgroundColor: data.color,
      opacity: data.opacity ?? 0.3
    }
  }

  const getImagePreviewUrl = (element: EditOperation): string => {
    const data = element.data as ImageEdit
    return imagePreviewUrls.value.get(data.id) || ''
  }

  const getElementIcon = (element: EditOperation): string => {
    switch (element.type) {
      case 'add-text':
        return 'ri:text'
      case 'add-image':
        return 'ri:image-line'
      case 'add-shape':
        return 'ri:shape-line'
      case 'add-annotation':
        return 'ri:mark-pen-line'
      default:
        return 'ri:file-line'
    }
  }

  const getElementName = (element: EditOperation): string => {
    switch (element.type) {
      case 'add-text': {
        const text = (element.data as TextEdit).text
        return text.length > 10 ? text.substring(0, 10) + '...' : text
      }
      case 'add-image':
        return '图片'
      case 'add-shape':
        return `形状 (${(element.data as ShapeEdit).type})`
      case 'add-annotation':
        return `批注 (${(element.data as AnnotationEdit).type})`
      default:
        return '元素'
    }
  }

  // Save
  const handleSave = async () => {
    if (!hasModifications.value) {
      ElMessage.warning('没有需要保存的修改')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    try {
      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: files.value[0].name,
        processedCount: 0
      }

      const result = await editor.save((prog, msg) => {
        progress.value.progress = prog
        progressMessage.value = msg
      })

      processResult.value = result

      if (result.success) {
        ElMessage.success('编辑保存完成！')
        permissionGuardRef.value?.recordUsage()

        if (result.data) {
          const blobUrl = URL.createObjectURL(result.data)
          addRecord({
            toolId: 'pdf-edit',
            toolName: 'PDF编辑',
            fileName: files.value[0].name,
            outputFileName: resultFileName.value,
            fileSize: files.value[0].size,
            outputFileSize: result.data.size,
            processType: 'edit',
            downloadUrl: blobUrl
          })
        }
      } else {
        ElMessage.error(result.error || '保存失败')
      }
    } catch (e: any) {
      processResult.value = { success: false, error: e.message || '保存失败' }
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
    editor.reset()
    pdfDoc.value = null
    totalPages.value = 0
    currentPage.value = 1
    processResult.value = null
    selectedElement.value = null

    // Clean up image preview URLs
    imagePreviewUrls.value.forEach((url) => URL.revokeObjectURL(url))
    imagePreviewUrls.value.clear()
  }

  // Continue editing
  const handleContinue = () => {
    processResult.value = null
    // Reload the file to continue editing
    if (files.value.length > 0) {
      loadPdf(files.value[0].file)
    }
  }

  // Retry
  const handleRetry = () => {
    processResult.value = null
  }

  // Lifecycle
  onUnmounted(() => {
    imagePreviewUrls.value.forEach((url) => URL.revokeObjectURL(url))
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
      padding: 16px;
      border: none;
      background: transparent;
    }
  }

  .editor-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .toolbar-group {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .property-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
  }

  .property-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .property-label {
    font-size: 13px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  .editor-main {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .page-nav {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
  }

  .page-info {
    min-width: 80px;
    font-size: 14px;
    color: var(--el-text-color-regular);
    text-align: center;
  }

  .canvas-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 500px;
    overflow: hidden;
    cursor: crosshair;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .pdf-canvas {
    max-width: 100%;
    max-height: 700px;
    object-fit: contain;
  }

  .edit-element {
    position: absolute;
    cursor: move;
    user-select: none;

    &.is-selected {
      outline: 2px solid var(--theme-color);
      outline-offset: 2px;
    }
  }

  .text-content {
    white-space: pre-wrap;
    pointer-events: none;
  }

  .image-content {
    width: 100%;
    height: 100%;
    pointer-events: none;
    object-fit: contain;
  }

  .shape-content {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
  }

  .annotation-content {
    width: 100%;
    height: 100%;
  }

  .resize-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: var(--theme-color);
    border: 2px solid white;
    border-radius: 2px;

    &.nw {
      top: -5px;
      left: -5px;
      cursor: nw-resize;
    }

    &.ne {
      top: -5px;
      right: -5px;
      cursor: ne-resize;
    }

    &.sw {
      bottom: -5px;
      left: -5px;
      cursor: sw-resize;
    }

    &.se {
      right: -5px;
      bottom: -5px;
      cursor: se-resize;
    }
  }

  .draw-preview {
    position: absolute;
    pointer-events: none;
  }

  .elements-panel {
    padding: 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .panel-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .elements-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
  }

  .element-item {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    background: var(--el-bg-color);
    border-radius: 6px;
    transition: background 0.2s;

    &:hover {
      background: var(--el-fill-color);
    }

    &.is-selected {
      background: var(--theme-color-light-9);
      border: 1px solid var(--theme-color);
    }
  }

  .element-icon {
    font-size: 16px;
    color: var(--el-text-color-secondary);
  }

  .element-name {
    flex: 1;
    overflow: hidden;
    font-size: 13px;
    color: var(--el-text-color-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 16px;
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
    margin-top: 12px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
</style>
