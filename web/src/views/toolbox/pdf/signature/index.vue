<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || 'PDF签名'"
      :description="toolDescription || '为PDF文档添加电子签名'"
    />
    <PermissionGuard feature-id="pdf-signature" feature-name="PDF签名" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || 'PDF签名' }}</span>
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

          <!-- 签名编辑区域 -->
          <template v-if="hasFiles && !isProcessing && !processResult">
            <div class="signature-editor">
              <!-- PDF预览和签名放大-->
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
                <div class="preview-container" ref="previewContainerRef">
                  <canvas ref="pdfCanvasRef" class="pdf-canvas"></canvas>
                  <!-- 签名拖拽区 -->
                  <div
                    v-for="sig in currentPageSignatures"
                    :key="sig.id"
                    class="signature-overlay"
                    :style="getSignatureStyle(sig)"
                    @mousedown="startDrag($event, sig)"
                  >
                    <img
                      v-if="sig.previewUrl"
                      :src="sig.previewUrl"
                      class="signature-preview-img"
                    />
                    <div class="signature-actions">
                      <ElButton
                        size="small"
                        circle
                        type="danger"
                        @click.stop="removeSignature(sig.id)"
                      >
                        <ElIcon><Delete /></ElIcon>
                      </ElButton>
                    </div>
                    <div class="resize-handle" @mousedown.stop="startResize($event, sig)"></div>
                  </div>
                </div>
              </div>

              <!-- 签名工具面板 -->
              <div class="tools-section">
                <div class="tool-panel">
                  <h4 class="panel-title">创建签名</h4>
                  <ElTabs v-model="signatureMode" class="signature-tabs">
                    <!-- 绘制签名 -->
                    <ElTabPane label="绘制签名" name="draw">
                      <div class="draw-panel">
                        <canvas
                          ref="drawCanvasRef"
                          class="draw-canvas"
                          @mousedown="startDrawing"
                          @mousemove="draw"
                          @mouseup="stopDrawing"
                          @mouseleave="stopDrawing"
                          @touchstart="startDrawingTouch"
                          @touchmove="drawTouch"
                          @touchend="stopDrawing"
                        ></canvas>
                        <div class="draw-actions">
                          <ElButton size="small" @click="clearDrawCanvas">清除</ElButton>
                          <ElButton size="small" type="primary" @click="addDrawSignature"
                            >添加签名</ElButton
                          >
                        </div>
                      </div>
                    </ElTabPane>

                    <!-- 上传图片 -->
                    <ElTabPane label="上传图片" name="image">
                      <div class="image-panel">
                        <div
                          class="image-upload-area"
                          @click="triggerImageSelect"
                          @dragover.prevent
                          @drop.prevent="handleImageDrop"
                        >
                          <template v-if="!uploadedImageUrl">
                            <ElIcon class="upload-icon"><Upload /></ElIcon>
                            <p>点击或拖拽上传签名图片</p>
                            <p class="text-xs text-g-400">支持PNG、JPG格式</p>
                          </template>
                          <template v-else>
                            <img :src="uploadedImageUrl" class="uploaded-preview" />
                          </template>
                        </div>
                        <div class="image-actions">
                          <ElButton v-if="uploadedImageUrl" size="small" @click="clearUploadedImage"
                            >清除</ElButton
                          >
                          <ElButton
                            size="small"
                            type="primary"
                            :disabled="!uploadedImageUrl"
                            @click="addImageSignature"
                            >添加签名</ElButton
                          >
                        </div>
                        <input
                          ref="imageInputRef"
                          type="file"
                          accept="image/png,image/jpeg"
                          hidden
                          @change="handleImageSelect"
                        />
                      </div>
                    </ElTabPane>

                    <!-- 文字签名 -->
                    <ElTabPane label="文字签名" name="text">
                      <div class="text-panel">
                        <ElInput
                          v-model="textSignature"
                          placeholder="输入签名文字"
                          size="large"
                          class="mb-3"
                        />
                        <div class="text-options">
                          <div class="option-row">
                            <span class="option-label">字体大小</span>
                            <ElInputNumber
                              v-model="textFontSize"
                              :min="16"
                              :max="72"
                              size="small"
                            />
                          </div>
                          <div class="option-row">
                            <span class="option-label">颜色</span>
                            <ElColorPicker v-model="textColor" size="small" />
                          </div>
                        </div>
                        <div class="text-preview" v-if="textSignature">
                          <span
                            :style="{
                              fontSize: textFontSize + 'px',
                              color: textColor,
                              fontFamily: 'cursive'
                            }"
                          >
                            {{ textSignature }}
                          </span>
                        </div>
                        <ElButton
                          size="small"
                          type="primary"
                          :disabled="!textSignature"
                          @click="addTextSignature"
                          class="mt-3"
                        >
                          添加签名
                        </ElButton>
                      </div>
                    </ElTabPane>
                  </ElTabs>
                </div>

                <!-- 已添加的签名列表 -->
                <div class="signatures-list" v-if="signatures.length > 0">
                  <h4 class="panel-title">已添加签名({{ signatures.length }})</h4>
                  <div class="signature-items">
                    <div v-for="sig in signatures" :key="sig.id" class="signature-item">
                      <img v-if="sig.previewUrl" :src="sig.previewUrl" class="sig-thumb" />
                      <div class="sig-info">
                        <span class="sig-type">{{ getSignatureTypeLabel(sig.data.type) }}</span>
                        <span class="sig-page">第 {{ sig.placement.pageIndex + 1 }} 页</span>
                      </div>
                      <ElButton size="small" circle type="danger" @click="removeSignature(sig.id)">
                        <ElIcon><Delete /></ElIcon>
                      </ElButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="file-actions">
              <ElButton
                type="primary"
                size="large"
                :disabled="signatures.length === 0"
                @click="handleAddSignatures"
              >
                <ElIcon class="mr-1"><Check /></ElIcon>应用签名
              </ElButton>
              <ElButton size="large" @click="clearAllFiles">清空</ElButton>
            </div>
          </template>

          <!-- 处理中-->
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在添加签名" 
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
              title="签名添加完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                  <div class="result-badge success">
                    <ElIcon class="mr-1"><Check /></ElIcon>已签名
                  </div>
                  <p class="result-file-name">{{ resultFileName }}</p>
                </div>
                <p class="text-sm text-g-500 mt-4">共添加 {{ signatures.length }} 个签名</p>
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
              title="签名添加失败"
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
        <p class="mb-3">PDF签名工具可以为PDF文档添加电子签名。</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持鼠标或触摸绘制签名</li>
          <li>支持上传签名图片</li>
          <li>支持文字签名，可自定义字体大小和颜色</li>
          <li>支持在任意页面放置签名</li>
          <li>支持添加多个签名</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    Loading,
    CircleClose,
    Download,
    Check,
    Delete,
    ArrowLeft,
    ArrowRight,
    Upload
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
    createSignatureProcessor,
    type SignatureItem,
    type SignatureType
  } from '@/processors/pdf/signature'

  defineOptions({ name: 'PdfSignaturePage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  // Refs
  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const imageInputRef = ref<HTMLInputElement>()
  const pdfCanvasRef = ref<HTMLCanvasElement>()
  const drawCanvasRef = ref<HTMLCanvasElement>()
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
  const signatureMode = ref<'draw' | 'image' | 'text'>('draw')
  const signatures = ref<(SignatureItem & { previewUrl?: string })[]>([])
  const processResult = ref<any>(null)
  const progressMessage = ref('正在处理...')

  // Drawing state
  const isDrawing = ref(false)
  const drawCtx = ref<CanvasRenderingContext2D | null>(null)

  // Image upload state
  const uploadedImageUrl = ref('')
  const uploadedImageBlob = ref<Blob | null>(null)

  // Text signature state
  const textSignature = ref('')
  const textFontSize = ref(32)
  const textColor = ref('#000000')

  // Drag state
  const dragState = ref<{
    isDragging: boolean
    isResizing: boolean
    signatureId: string | null
    startX: number
    startY: number
    startSigX: number
    startSigY: number
    startWidth: number
    startHeight: number
  }>({
    isDragging: false,
    isResizing: false,
    signatureId: null,
    startX: 0,
    startY: 0,
    startSigX: 0,
    startSigY: 0,
    startWidth: 0,
    startHeight: 0
  })

  // Computed
  const resultFileName = computed(() => {
    if (files.value.length > 0) {
      return files.value[0].name.replace(/\.pdf$/i, '_signed.pdf')
    }
    return 'signed.pdf'
  })

  const currentPageSignatures = computed(() => {
    return signatures.value.filter((sig) => sig.placement.pageIndex === currentPage.value - 1)
  })

  // Methods
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const triggerImageSelect = () => {
    imageInputRef.value?.click()
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
        initDrawCanvas()
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

  // Initialize draw canvas
  const initDrawCanvas = () => {
    nextTick(() => {
      if (!drawCanvasRef.value) return
      const canvas = drawCanvasRef.value
      canvas.width = 300
      canvas.height = 150
      drawCtx.value = canvas.getContext('2d')
      if (drawCtx.value) {
        drawCtx.value.strokeStyle = '#000000'
        drawCtx.value.lineWidth = 2
        drawCtx.value.lineCap = 'round'
        drawCtx.value.lineJoin = 'round'
      }
    })
  }

  // Drawing methods
  const startDrawing = (e: MouseEvent) => {
    if (!drawCtx.value) return
    isDrawing.value = true
    const rect = drawCanvasRef.value!.getBoundingClientRect()
    drawCtx.value.beginPath()
    drawCtx.value.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: MouseEvent) => {
    if (!isDrawing.value || !drawCtx.value) return
    const rect = drawCanvasRef.value!.getBoundingClientRect()
    drawCtx.value.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    drawCtx.value.stroke()
  }

  const stopDrawing = () => {
    isDrawing.value = false
  }

  const startDrawingTouch = (e: TouchEvent) => {
    e.preventDefault()
    if (!drawCtx.value) return
    isDrawing.value = true
    const rect = drawCanvasRef.value!.getBoundingClientRect()
    const touch = e.touches[0]
    drawCtx.value.beginPath()
    drawCtx.value.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
  }

  const drawTouch = (e: TouchEvent) => {
    e.preventDefault()
    if (!isDrawing.value || !drawCtx.value) return
    const rect = drawCanvasRef.value!.getBoundingClientRect()
    const touch = e.touches[0]
    drawCtx.value.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
    drawCtx.value.stroke()
  }

  const clearDrawCanvas = () => {
    if (!drawCtx.value || !drawCanvasRef.value) return
    drawCtx.value.clearRect(0, 0, drawCanvasRef.value.width, drawCanvasRef.value.height)
  }

  // Add draw signature
  const addDrawSignature = () => {
    if (!drawCanvasRef.value) return
    const dataUrl = drawCanvasRef.value.toDataURL('image/png')

    // Check if canvas is empty
    const ctx = drawCanvasRef.value.getContext('2d')
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, drawCanvasRef.value.width, drawCanvasRef.value.height)
    const isEmpty = !imageData.data.some((channel, index) => index % 4 === 3 && channel !== 0)

    if (isEmpty) {
      ElMessage.warning('请先绘制签名')
      return
    }

    const newSignature: SignatureItem & { previewUrl?: string } = {
      id: `sig-${Date.now()}`,
      data: {
        type: 'draw',
        drawData: dataUrl
      },
      placement: {
        pageIndex: currentPage.value - 1,
        x: 60,
        y: 10,
        width: 20,
        height: 10
      },
      previewUrl: dataUrl
    }

    signatures.value.push(newSignature)
    clearDrawCanvas()
    ElMessage.success('签名已添加')
  }

  // Image upload methods
  const handleImageSelect = (_e: Event) => {
    const input = _e.target as HTMLInputElement
    if (!input.files || input.files.length === 0) return
    processImageFile(input.files[0])
  }

  const handleImageDrop = (e: DragEvent) => {
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) {
      ElMessage.warning('请上传图片文件')
      return
    }
    processImageFile(file)
  }

  const processImageFile = (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      ElMessage.warning('请上传PNG或JPG格式的图片')
      return
    }
    uploadedImageBlob.value = file
    uploadedImageUrl.value = URL.createObjectURL(file)
  }

  const clearUploadedImage = () => {
    if (uploadedImageUrl.value) {
      URL.revokeObjectURL(uploadedImageUrl.value)
    }
    uploadedImageUrl.value = ''
    uploadedImageBlob.value = null
  }

  // Add image signature
  const addImageSignature = () => {
    if (!uploadedImageBlob.value) {
      ElMessage.warning('请先上传签名图片')
      return
    }

    const newSignature: SignatureItem & { previewUrl?: string } = {
      id: `sig-${Date.now()}`,
      data: {
        type: 'image',
        imageData: uploadedImageBlob.value
      },
      placement: {
        pageIndex: currentPage.value - 1,
        x: 60,
        y: 10,
        width: 20,
        height: 10
      },
      previewUrl: uploadedImageUrl.value
    }

    signatures.value.push(newSignature)
    clearUploadedImage()
    ElMessage.success('签名已添加')
  }

  // Add text signature
  const addTextSignature = async () => {
    if (!textSignature.value.trim()) {
      ElMessage.warning('请输入签名文字')
      return
    }

    try {
      const processor = createSignatureProcessor()
      const blob = await processor.createSignatureFromText(textSignature.value, {
        fontSize: textFontSize.value,
        color: textColor.value
      })
      const previewUrl = URL.createObjectURL(blob)

      const newSignature: SignatureItem & { previewUrl?: string } = {
        id: `sig-${Date.now()}`,
        data: {
          type: 'text',
          text: textSignature.value,
          fontSize: textFontSize.value,
          color: textColor.value
        },
        placement: {
          pageIndex: currentPage.value - 1,
          x: 60,
          y: 10,
          width: 20,
          height: 8
        },
        previewUrl
      }

      signatures.value.push(newSignature)
      textSignature.value = ''
      ElMessage.success('签名已添加')
    } catch {
      ElMessage.error('生成文字签名失败')
    }
  }

  // Remove signature
  const removeSignature = (id: string) => {
    const index = signatures.value.findIndex((s) => s.id === id)
    if (index !== -1) {
      const sig = signatures.value[index]
      if (sig.previewUrl) {
        URL.revokeObjectURL(sig.previewUrl)
      }
      signatures.value.splice(index, 1)
    }
  }

  // Get signature type label
  const getSignatureTypeLabel = (type: SignatureType): string => {
    switch (type) {
      case 'draw':
        return '绘制'
      case 'image':
        return '图片'
      case 'text':
        return '文字'
      default:
        return '未知'
    }
  }

  // Get signature style for overlay
  const getSignatureStyle = (sig: SignatureItem & { previewUrl?: string }) => {
    return {
      left: `${sig.placement.x}%`,
      bottom: `${sig.placement.y}%`,
      width: `${sig.placement.width}%`,
      height: `${sig.placement.height}%`
    }
  }

  // Drag and resize methods
  const startDrag = (e: MouseEvent, sig: SignatureItem & { previewUrl?: string }) => {
    e.preventDefault()
    dragState.value = {
      isDragging: true,
      isResizing: false,
      signatureId: sig.id,
      startX: e.clientX,
      startY: e.clientY,
      startSigX: sig.placement.x,
      startSigY: sig.placement.y,
      startWidth: sig.placement.width,
      startHeight: sig.placement.height
    }
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }

  const startResize = (e: MouseEvent, sig: SignatureItem & { previewUrl?: string }) => {
    e.preventDefault()
    dragState.value = {
      isDragging: false,
      isResizing: true,
      signatureId: sig.id,
      startX: e.clientX,
      startY: e.clientY,
      startSigX: sig.placement.x,
      startSigY: sig.placement.y,
      startWidth: sig.placement.width,
      startHeight: sig.placement.height
    }
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }

  const handleDragMove = (e: MouseEvent) => {
    if (!previewContainerRef.value) return
    const container = previewContainerRef.value
    const rect = container.getBoundingClientRect()
    const sig = signatures.value.find((s) => s.id === dragState.value.signatureId)
    if (!sig) return

    const deltaX = ((e.clientX - dragState.value.startX) / rect.width) * 100
    const deltaY = ((dragState.value.startY - e.clientY) / rect.height) * 100

    if (dragState.value.isDragging) {
      sig.placement.x = Math.max(
        0,
        Math.min(100 - sig.placement.width, dragState.value.startSigX + deltaX)
      )
      sig.placement.y = Math.max(
        0,
        Math.min(100 - sig.placement.height, dragState.value.startSigY + deltaY)
      )
    } else if (dragState.value.isResizing) {
      sig.placement.width = Math.max(5, Math.min(50, dragState.value.startWidth + deltaX))
      sig.placement.height = Math.max(3, Math.min(30, dragState.value.startHeight - deltaY))
    }
  }

  const handleDragEnd = () => {
    dragState.value.isDragging = false
    dragState.value.isResizing = false
    dragState.value.signatureId = null
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
  }

  // Process signatures
  const handleAddSignatures = async () => {
    if (signatures.value.length === 0) {
      ElMessage.warning('请至少添加一个签名')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    try {
      const processor = createSignatureProcessor()
      const file = files.value[0].file

      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: files.value[0].name,
        processedCount: 0
      }

      // Prepare signatures for processor (remove previewUrl)
      const signaturesForProcessor = signatures.value.map((sig) => ({
        id: sig.id,
        data: sig.data,
        placement: sig.placement
      }))

      const result = await processor.process(
        file,
        { signatures: signaturesForProcessor },
        (prog, msg) => {
          progress.value.progress = prog
          progressMessage.value = msg
        }
      )

      processResult.value = result

      if (result.success) {
        ElMessage.success('签名添加完成！')
        permissionGuardRef.value?.recordUsage()

        if (result.data) {
          const blobUrl = URL.createObjectURL(result.data)
          addRecord({
            toolId: 'pdf-signature',
            toolName: 'PDF签名',
            fileName: files.value[0].name,
            outputFileName: resultFileName.value,
            fileSize: files.value[0].size,
            outputFileSize: result.data.size,
            processType: 'signature',
            downloadUrl: blobUrl
          })
        }
      } else {
        ElMessage.error(result.error || '添加签名失败')
      }
    } catch (e: any) {
      processResult.value = { success: false, error: e.message || '添加签名失败' }
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
    signatures.value.forEach((sig) => {
      if (sig.previewUrl) URL.revokeObjectURL(sig.previewUrl)
    })
    signatures.value = []
    pdfDoc.value = null
    totalPages.value = 0
    currentPage.value = 1
    processResult.value = null
    clearUploadedImage()
    textSignature.value = ''
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
  onMounted(() => {
    initDrawCanvas()
  })

  onUnmounted(() => {
    signatures.value.forEach((sig) => {
      if (sig.previewUrl) URL.revokeObjectURL(sig.previewUrl)
    })
    if (uploadedImageUrl.value) URL.revokeObjectURL(uploadedImageUrl.value)
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

  .signature-editor {
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
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .pdf-canvas {
    max-width: 100%;
    max-height: 600px;
    object-fit: contain;
  }

  .signature-overlay {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: move;
    background: rgb(255 255 255 / 80%);
    border: 2px dashed var(--theme-color);
    transition: border-color 0.2s;

    &:hover {
      border-color: var(--el-color-primary);

      .signature-actions {
        opacity: 1;
      }

      .resize-handle {
        opacity: 1;
      }
    }
  }

  .signature-preview-img {
    max-width: 100%;
    max-height: 100%;
    pointer-events: none;
    object-fit: contain;
  }

  .signature-actions {
    position: absolute;
    top: -12px;
    right: -12px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .resize-handle {
    position: absolute;
    right: -4px;
    bottom: -4px;
    width: 12px;
    height: 12px;
    cursor: se-resize;
    background: var(--theme-color);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .tools-section {
    flex-shrink: 0;
    width: 320px;

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

  .signature-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 12px;
    }
  }

  .draw-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .draw-canvas {
    width: 100%;
    height: 150px;
    touch-action: none;
    cursor: crosshair;
    background: #fff;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
  }

  .draw-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .image-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .image-upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 120px;
    cursor: pointer;
    border: 2px dashed var(--el-border-color);
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .upload-icon {
    margin-bottom: 8px;
    font-size: 32px;
    color: var(--el-text-color-secondary);
  }

  .uploaded-preview {
    max-width: 90%;
    max-height: 100px;
    object-fit: contain;
  }

  .image-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .text-panel {
    display: flex;
    flex-direction: column;
  }

  .text-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .option-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .option-label {
    min-width: 60px;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .text-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50px;
    padding: 12px;
    text-align: center;
    background: #fff;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
  }

  .signatures-list {
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .signature-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .signature-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 8px;
    background: #fff;
    border-radius: 4px;
  }

  .sig-thumb {
    width: 48px;
    height: 32px;
    object-fit: contain;
    border: 1px solid var(--el-border-color);
    border-radius: 2px;
  }

  .sig-info {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
  }

  .sig-type {
    font-size: 13px;
    color: var(--el-text-color-primary);
  }

  .sig-page {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .file-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 20px;
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

  .result-badge {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    margin-top: 8px;
    font-size: 12px;
    border-radius: 4px;

    &.success {
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
    }
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
