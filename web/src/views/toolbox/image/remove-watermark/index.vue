<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '图片去水印'"
      :description="toolDescription || '基于 inpaint-web 的智能去水印工具，使用 AI 算法修复图片'"
    />
    <PermissionGuard
      feature-id="image-remove-watermark"
      feature-name="图片去水印"
      ref="permissionGuardRef"
    >
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '图片去水印' }}</span>
        </div>

        <div
          class="upload-area"
          :class="{ 'is-dragging': isDragging, 'has-image': !!currentImage }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <!-- 上传区域 -->
          <template v-if="!currentImage && !isProcessing">
            <Icon icon="ri:image-add-line" class="text-5xl text-g-300 mb-3" />
            <p class="text-base text-g-600 mb-2">点击或拖拽图片到此处上传</p>
            <p class="text-sm text-g-400 mb-4">支持 JPG/PNG/WEBP 格式，单个文件不超过 20MB</p>
            <ElButton type="primary" @click="triggerFileSelect">选择图片</ElButton>
          </template>

          <!-- 画布编辑区域 -->
          <div v-if="currentImage" class="canvas-container">
            <div class="canvas-wrapper" ref="canvasWrapperRef">
              <!-- 原始图片层 -->
              <canvas ref="imageCanvasRef" class="image-canvas"></canvas>
              <!-- 绘制层 -->
              <canvas
                ref="drawCanvasRef"
                class="draw-canvas"
                :style="{ cursor: getCursorStyle }"
                :class="{ 'pointer-events-none': isProcessing }"
                @pointerdown="handlePointerDown"
                @pointermove="handlePointerMove"
                @pointerup="handlePointerUp"
                @pointerleave="handlePointerLeave"
              ></canvas>

              <!-- 处理中高级加载效果 -->
              <div v-if="isProcessing" class="processing-overlay-advanced">
                <div class="processing-backdrop"></div>
                <div class="processing-content">
                  <div class="processing-spinner">
                    <svg class="spinner-ring" viewBox="0 0 50 50">
                      <circle
                        class="spinner-path"
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        stroke-width="3"
                      ></circle>
                    </svg>
                  </div>
                  <div class="processing-title">AI 处理中</div>
                  <div class="processing-subtitle">{{ processingStatus }}</div>
                </div>
              </div>
            </div>

            <!-- 工具栏 -->
            <div class="canvas-toolbar">
              <div class="toolbar-left">
                <!-- 工具选择 -->
                <div class="tool-selector">
                  <ElButton
                    :type="drawMode === 'brush' ? 'primary' : ''"
                    @click="drawMode = 'brush'"
                  >
                    <Icon icon="ri:brush-line" class="mr-1" />
                    画笔工具
                  </ElButton>

                  <ElButton :type="drawMode === 'rect' ? 'primary' : ''" @click="drawMode = 'rect'">
                    <Icon icon="ri:checkbox-blank-line" class="mr-1" />
                    矩形选框
                  </ElButton>
                </div>

                <ElDivider direction="vertical" />

                <!-- 画笔大小（仅画笔模式显示） -->
                <template v-if="drawMode === 'brush'">
                  <span class="tool-label">画笔大小</span>
                  <ElSlider
                    v-model="brushSize"
                    :min="5"
                    :max="100"
                    :step="5"
                    style="width: 120px"
                    @change="updateCursor"
                  />
                  <span class="size-value">{{ brushSize }}px</span>
                </template>

                <template v-else>
                  <span class="tool-label text-g-400">矩形选框模式</span>
                </template>
              </div>

              <div class="toolbar-right">
                <ElButton :disabled="!canUndo" @click="handleUndo">
                  <Icon icon="ri:arrow-go-back-line" class="mr-1" />
                  撤销
                </ElButton>

                <ElButton :disabled="!canRedo" @click="handleRedo">
                  <Icon icon="ri:arrow-go-forward-line" class="mr-1" />
                  重做
                </ElButton>

                <ElButton :disabled="!hasMask" @click="clearMask">
                  <Icon icon="ri:eraser-line" class="mr-1" />
                  清空选区
                </ElButton>

                <ElDivider direction="vertical" />

                <ElButton :disabled="!hasProcessedImage" @click="toggleOriginal">
                  <Icon :icon="showOriginal ? 'ri:eye-off-line' : 'ri:eye-line'" class="mr-1" />
                  {{ showOriginal ? '显示处理后' : '查看原图' }}
                </ElButton>
              </div>
            </div>

            <!-- 信息栏 -->
            <div class="info-bar">
              <span class="info-item">
                <Icon icon="ri:image-line" />
                {{ imageWidth }} × {{ imageHeight }} px
              </span>
              <span
                class="info-item"
                :class="{
                  processing: isProcessing,
                  highlight: !isProcessing && hasMask,
                  tip: !isProcessing && !hasMask
                }"
              >
                <Icon v-if="isProcessing" icon="ri:loader-4-line" class="animate-spin" />
                <Icon v-else-if="hasMask" icon="ri:brush-line" />
                <Icon v-else icon="ri:information-line" />
                <span v-if="isProcessing">正在处理...</span>
                <span v-else-if="hasMask">已标记水印区域（松开鼠标自动处理）</span>
                <span v-else
                  >使用{{ drawMode === 'brush' ? '画笔' : '矩形框' }}标记需要去除的区域</span
                >
              </span>
            </div>

            <!-- 操作按钮 -->
            <div class="file-actions">
              <ElButton size="large" @click="downloadResult" :disabled="!currentImage">
                <ElIcon class="mr-1"><Download /></ElIcon>
                下载图片
              </ElButton>
              <ElButton size="large" @click="resetAll">
                <ElIcon class="mr-1"><Refresh /></ElIcon>
                重新上传
              </ElButton>
            </div>
          </div>

          <!-- 处理中状态（已移到 Canvas 遮罩层） -->
        </div>

        <input ref="fileInputRef" type="file" accept="image/*" hidden @change="handleFileSelect" />
      </ElCard>
    </PermissionGuard>

    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">智能去除图片中的水印、文字、标记等不需要的内容，让图片更加干净美观。</p>

        <div class="mb-3">
          <div class="font-medium text-g-700 mb-2">使用方法：</div>
          <ol class="list-decimal list-inside space-y-1.5 text-g-500 ml-2">
            <li>上传需要处理的图片（支持 JPG、PNG、WEBP 格式）</li>
            <li>使用画笔或矩形框标记需要去除的水印区域</li>
            <li>松开鼠标后自动开始处理，无需点击按钮</li>
            <li>处理完成后可以查看原图对比效果</li>
            <li>满意后点击"下载图片"保存结果</li>
          </ol>
        </div>

        <div class="mb-3">
          <div class="font-medium text-g-700 mb-2">功能特点：</div>
          <ul class="list-disc list-inside space-y-1 text-g-500 ml-2">
            <li>AI 智能修复，自动填充去除区域，效果自然</li>
            <li>支持画笔和矩形框两种标记方式，灵活便捷</li>
            <li>支持撤销/重做，可以精确调整标记区域</li>
            <li>可以多次标记处理，逐步完善效果</li>
            <li>所有处理在浏览器本地完成，图片不会上传到服务器，保护隐私</li>
          </ul>
        </div>

        <div class="text-xs text-g-400 mt-3">
          <p
            >💡 提示：首次使用需要加载 AI 模型（约
            50MB），模型已内置在本地，无需联网下载。加载后会自动缓存在内存中，后续使用无需重新加载。</p
          >
        </div>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Download, Refresh } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useHistory } from '@/hooks/core/useHistory'
  import { saveAs } from 'file-saver'

  defineOptions({ name: 'ImageRemoveWatermarkPage' })

  // 调试模式控制 - 仅在开发环境且明确启用时输出日志
  const DEBUG = import.meta.env.DEV && import.meta.env.VITE_DEBUG === 'true'
  const debugLog = (...args: any[]) => {
    if (DEBUG) {
      console.log('[去水印]', ...args)
    }
  }

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()
  const { addRecord } = useHistory()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const canvasWrapperRef = ref<HTMLDivElement>()
  const imageCanvasRef = ref<HTMLCanvasElement>()
  const drawCanvasRef = ref<HTMLCanvasElement>()

  const currentImage = ref('')
  const currentFile = ref<File | null>(null)
  const imageWidth = ref(0)
  const imageHeight = ref(0)
  const brushSize = ref(30)
  const drawMode = ref<'brush' | 'rect'>('brush') // 绘制模式：画笔或矩形
  const isDrawing = ref(false)
  const hasMask = ref(false)
  const isProcessing = ref(false)
  const processingStatus = ref('初始化中...')
  const showOriginal = ref(false) // 是否显示原图
  const hasProcessedImage = ref(false) // 是否有处理后的图片

  // 矩形选框相关
  const rectStartPoint = ref<{ x: number; y: number } | null>(null)
  const rectCurrentPoint = ref<{ x: number; y: number } | null>(null)

  // 上一个绘制点（用于画线）
  const lastPoint = ref<{ x: number; y: number } | null>(null)

  // 历史记录 - 限制最大数量防止内存溢出
  const MAX_HISTORY = 10
  const historyStack = ref<ImageData[]>([])
  const redoStack = ref<ImageData[]>([])
  const canUndo = computed(() => historyStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  // Canvas contexts
  let imageCtx: CanvasRenderingContext2D | null = null
  let drawCtx: CanvasRenderingContext2D | null = null
  let originalImageData: ImageData | null = null
  let processedImageData: ImageData | null = null // 保存处理后的图片

  // Inpaint Worker
  let inpaintWorker: Worker | null = null

  // 自动处理的防抖定时器
  let autoProcessTimer: number | null = null

  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver } = useUpload({
    accept: 'image/*',
    multiple: false,
    maxSize: 20,
    maxCount: 1
  })

  const getCursorStyle = computed(() => {
    if (drawMode.value === 'rect') {
      return 'crosshair'
    }
    return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize.value}" height="${brushSize.value}" viewBox="0 0 ${brushSize.value} ${brushSize.value}"><circle cx="${brushSize.value / 2}" cy="${brushSize.value / 2}" r="${brushSize.value / 2 - 1}" fill="rgba(255,0,0,0.3)" stroke="red" stroke-width="2"/></svg>') ${brushSize.value / 2} ${brushSize.value / 2}, crosshair`
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

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
      img.onload = async () => {
        const actualWidth = img.naturalWidth || img.width
        const actualHeight = img.naturalHeight || img.height

        // 性能优化：对超大图片给出提示
        const pixels = actualWidth * actualHeight
        if (pixels > 4000000) { // 超过 4MP
          ElMessage.warning({
            message: `图片尺寸较大（${actualWidth}x${actualHeight}），处理可能需要较长时间。建议缩小图片尺寸以获得更快的处理速度。`,
            duration: 5000
          })
        }

        imageWidth.value = actualWidth
        imageHeight.value = actualHeight

        await nextTick()
        initCanvas(img)
      }
      img.onerror = () => {
        ElMessage.error('图片加载失败')
      }
      img.src = dataURL
    }
    reader.onerror = () => {
      ElMessage.error('文件读取失败')
    }
    reader.readAsDataURL(file)
  }

  const actualCanvasWidth = ref(0)
  const actualCanvasHeight = ref(0)

  // Canvas 显示尺寸限制（不影响实际处理尺寸）
  // 减小最大宽度以适配容器
  const MAX_DISPLAY_WIDTH = 900
  const MAX_DISPLAY_HEIGHT = 700

  // 计算 Canvas 的 CSS 显示尺寸
  const canvasDisplayStyle = computed(() => {
    if (!actualCanvasWidth.value || !actualCanvasHeight.value) {
      console.log('[canvasDisplayStyle] 尺寸未设置')
      return {}
    }

    let displayWidth = actualCanvasWidth.value
    let displayHeight = actualCanvasHeight.value

    if (displayWidth > MAX_DISPLAY_WIDTH || displayHeight > MAX_DISPLAY_HEIGHT) {
      const scale = Math.min(MAX_DISPLAY_WIDTH / displayWidth, MAX_DISPLAY_HEIGHT / displayHeight)
      displayWidth = Math.floor(displayWidth * scale)
      displayHeight = Math.floor(displayHeight * scale)
    }

    const style = {
      width: `${displayWidth}px`,
      height: `${displayHeight}px`
    }

    console.log('[canvasDisplayStyle] 计算结果:', {
      actual: `${actualCanvasWidth.value}x${actualCanvasHeight.value}`,
      display: `${displayWidth}x${displayHeight}`,
      style
    })

    return style
  })

  // 手动设置 Canvas 的 CSS 显示尺寸（不触发响应式更新）
  const updateCanvasDisplaySize = () => {
    if (!imageCanvasRef.value || !drawCanvasRef.value) return
    if (!actualCanvasWidth.value || !actualCanvasHeight.value) return

    let displayWidth = actualCanvasWidth.value
    let displayHeight = actualCanvasHeight.value

    if (displayWidth > MAX_DISPLAY_WIDTH || displayHeight > MAX_DISPLAY_HEIGHT) {
      const scale = Math.min(MAX_DISPLAY_WIDTH / displayWidth, MAX_DISPLAY_HEIGHT / displayHeight)
      displayWidth = Math.floor(displayWidth * scale)
      displayHeight = Math.floor(displayHeight * scale)
    }

    // 直接设置 style，不通过 Vue 响应式系统
    imageCanvasRef.value.style.width = `${displayWidth}px`
    imageCanvasRef.value.style.height = `${displayHeight}px`
    drawCanvasRef.value.style.width = `${displayWidth}px`
    drawCanvasRef.value.style.height = `${displayHeight}px`

    debugLog('已更新 Canvas 显示尺寸:', {
      actual: `${actualCanvasWidth.value}x${actualCanvasHeight.value}`,
      display: `${displayWidth}x${displayHeight}`
    })
  }

  const initCanvas = async (img: HTMLImageElement) => {
    const imageCanvas = imageCanvasRef.value
    const drawCanvas = drawCanvasRef.value

    debugLog('Canvas 元素引用:', {
      imageCanvas: !!imageCanvas,
      drawCanvas: !!drawCanvas,
      imageCanvasSize: imageCanvas ? `${imageCanvas.width}x${imageCanvas.height}` : 'null',
      drawCanvasSize: drawCanvas ? `${drawCanvas.width}x${drawCanvas.height}` : 'null'
    })

    if (!imageCanvas || !drawCanvas) {
      console.error('[去水印] Canvas 元素未找到')
      return
    }

    // 使用 naturalWidth/naturalHeight 获取真实尺寸
    const actualWidth = img.naturalWidth || img.width
    const actualHeight = img.naturalHeight || img.height

    debugLog('图片尺寸:', {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      width: img.width,
      height: img.height,
      actualWidth,
      actualHeight
    })

    // 保存原始尺寸
    actualCanvasWidth.value = actualWidth
    actualCanvasHeight.value = actualHeight

    // 手动设置 Canvas 尺寸（不使用响应式绑定，避免触发清空）
    imageCanvas.width = actualWidth
    imageCanvas.height = actualHeight
    drawCanvas.width = actualWidth
    drawCanvas.height = actualHeight

    debugLog('已手动设置 Canvas 尺寸:', {
      width: actualWidth,
      height: actualHeight
    })

    // 等待 Vue 更新 DOM
    await nextTick()

    // 再次获取 Canvas 元素（确保尺寸已更新）
    const updatedImageCanvas = imageCanvasRef.value
    const updatedDrawCanvas = drawCanvasRef.value

    if (!updatedImageCanvas || !updatedDrawCanvas) {
      console.error('[去水印] Canvas 元素更新后丢失')
      return
    }

    debugLog('Canvas 尺寸更新后:', {
      imageCanvas: `${updatedImageCanvas.width}x${updatedImageCanvas.height}`,
      drawCanvas: `${updatedDrawCanvas.width}x${updatedDrawCanvas.height}`
    })

    // 获取contexts
    imageCtx = updatedImageCanvas.getContext('2d', { willReadFrequently: true })
    drawCtx = updatedDrawCanvas.getContext('2d', { willReadFrequently: true, alpha: true })

    if (!imageCtx || !drawCtx) {
      console.error('[initCanvas] 无法获取 Canvas context')
      return
    }

    // 绘制原始图片
    imageCtx.drawImage(img, 0, 0, actualWidth, actualHeight)

    debugLog('图片已绘制到 Canvas')

    // 立即验证绘制结果（检查 alpha 通道，支持透明 PNG）
    const verifyData = imageCtx.getImageData(100, 100, 10, 10)
    const verifyPixels = Array.from(verifyData.data.slice(0, 40))

    // 检查是否有非透明像素（alpha > 0）
    let hasVisiblePixels = false
    for (let i = 3; i < verifyPixels.length; i += 4) {
      if (verifyPixels[i] > 0) {
        hasVisiblePixels = true
        break
      }
    }

    debugLog('绘制验证:', {
      samplePixels: verifyPixels,
      hasVisiblePixels,
      alphaValues: verifyPixels.filter((_, i) => (i + 1) % 4 === 0)
    })

    if (!hasVisiblePixels) {
      console.error('[去水印] ⚠️ 图片绘制后全透明，可能绘制失败！')
    }

    // 保存原始图片数据（用于"查看原图"功能）
    originalImageData = imageCtx.getImageData(0, 0, actualWidth, actualHeight)

    // 验证图片数据（检查是否有非透明像素）
    const samplePixels = Array.from(originalImageData.data.slice(0, 20))
    let hasContent = false
    for (let i = 3; i < Math.min(1000, originalImageData.data.length); i += 4) {
      if (originalImageData.data[i] > 0) {
        hasContent = true
        break
      }
    }

    debugLog('原始图片数据样本:', {
      width: originalImageData.width,
      height: originalImageData.height,
      dataLength: originalImageData.data.length,
      samplePixels,
      hasContent: samplePixels.some((v) => v !== 0)
    })

    // 清空绘制层，确保透明
    drawCtx.clearRect(0, 0, actualWidth, actualHeight)

    // 重置状态
    historyStack.value = []
    redoStack.value = []
    hasMask.value = false
    hasProcessedImage.value = false
    processedImageData = null
    showOriginal.value = false

    // 设置 Canvas 的 CSS 显示尺寸（不触发响应式更新）
    updateCanvasDisplaySize()
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (!drawCanvasRef.value || !drawCtx) return

    const canvas = drawCanvasRef.value
    if (!canvas) return

    canvas.setPointerCapture(event.pointerId)
    isDrawing.value = true

    const point = getCanvasPoint(event)
    if (!point) return

    if (drawMode.value === 'brush') {
      // 画笔模式
      lastPoint.value = point

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const actualBrushSize = brushSize.value * scaleX

      drawCtx.save()
      // 使用纯红色，不透明度为 1（确保能被检测到）
      drawCtx.strokeStyle = 'rgba(255, 0, 0, 1)'
      drawCtx.fillStyle = 'rgba(255, 0, 0, 1)'
      drawCtx.lineWidth = actualBrushSize
      drawCtx.lineCap = 'round'
      drawCtx.lineJoin = 'round'
      drawCtx.globalCompositeOperation = 'source-over'
      drawCtx.beginPath()
      drawCtx.moveTo(point.x, point.y)

      // 在起点绘制一个圆点（确保单击也能标记）
      drawCtx.arc(point.x, point.y, actualBrushSize / 2, 0, Math.PI * 2)
      drawCtx.fill()
      drawCtx.beginPath()
      drawCtx.moveTo(point.x, point.y)

      debugLog('画笔开始绘制:', {
        point,
        actualBrushSize,
        strokeStyle: drawCtx.strokeStyle,
        fillStyle: drawCtx.fillStyle
      })
    } else {
      // 矩形模式
      rectStartPoint.value = point
      rectCurrentPoint.value = point
    }
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDrawing.value || !drawCtx || !drawCanvasRef.value) return

    const point = getCanvasPoint(event)
    if (!point) return

    if (drawMode.value === 'brush') {
      // 画笔模式：绘制线条
      drawCtx.lineTo(point.x, point.y)
      drawCtx.stroke()
      lastPoint.value = point
    } else {
      // 矩形模式：实时预览矩形
      rectCurrentPoint.value = point

      // 清除之前的预览
      const canvas = drawCanvasRef.value
      drawCtx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制矩形预览
      if (rectStartPoint.value) {
        const x = Math.min(rectStartPoint.value.x, point.x)
        const y = Math.min(rectStartPoint.value.y, point.y)
        const width = Math.abs(point.x - rectStartPoint.value.x)
        const height = Math.abs(point.y - rectStartPoint.value.y)

        drawCtx.save()
        // 使用半透明红色用于预览（视觉效果）
        drawCtx.fillStyle = 'rgba(255, 0, 0, 0.3)'
        drawCtx.strokeStyle = 'red'
        drawCtx.lineWidth = 2
        drawCtx.fillRect(x, y, width, height)
        drawCtx.strokeRect(x, y, width, height)
        drawCtx.restore()
      }
    }
  }

  const handlePointerUp = () => {
    if (isDrawing.value) {
      isDrawing.value = false
      lastPoint.value = null

      if (drawMode.value === 'brush') {
        // 画笔模式：结束路径
        if (drawCtx) {
          drawCtx.restore()
        }
      } else {
        // 矩形模式：确认矩形
        if (rectStartPoint.value && rectCurrentPoint.value && drawCtx && drawCanvasRef.value) {
          const canvas = drawCanvasRef.value
          const x = Math.min(rectStartPoint.value.x, rectCurrentPoint.value.x)
          const y = Math.min(rectStartPoint.value.y, rectCurrentPoint.value.y)
          const width = Math.abs(rectCurrentPoint.value.x - rectStartPoint.value.x)
          const height = Math.abs(rectCurrentPoint.value.y - rectStartPoint.value.y)

          // 清除预览
          drawCtx.clearRect(0, 0, canvas.width, canvas.height)

          // 绘制最终矩形 - 使用不透明红色（确保能被检测到）
          drawCtx.save()
          drawCtx.fillStyle = 'rgba(255, 0, 0, 1)'
          drawCtx.fillRect(x, y, width, height)
          drawCtx.restore()

          debugLog('矩形绘制完成:', {
            x,
            y,
            width,
            height,
            area: width * height,
            fillStyle: 'rgba(255, 0, 0, 1)'
          })
        }

        rectStartPoint.value = null
        rectCurrentPoint.value = null
      }

      hasMask.value = true

      // 保存当前绘制层状态到历史栈（用于撤销/重做）
      if (drawCtx && drawCanvasRef.value) {
        const currentState = drawCtx.getImageData(
          0,
          0,
          drawCanvasRef.value.width,
          drawCanvasRef.value.height
        )
        historyStack.value.push(cloneImageData(currentState))
        // 限制历史记录数量
        if (historyStack.value.length > MAX_HISTORY) {
          historyStack.value.shift()
        }
        redoStack.value = [] // 清空重做栈
        debugLog('已保存绘制状态到历史栈，当前历史数:', historyStack.value.length)
      }

      // 松开鼠标后自动处理（防抖 500ms）
      scheduleAutoProcess()
    }
  }

  const handlePointerLeave = () => {
    if (isDrawing.value) {
      isDrawing.value = false
      lastPoint.value = null

      if (drawMode.value === 'brush') {
        if (drawCtx) {
          drawCtx.restore()
        }
      } else {
        rectStartPoint.value = null
        rectCurrentPoint.value = null
      }

      hasMask.value = true

      // 保存当前绘制层状态到历史栈
      if (drawCtx && drawCanvasRef.value) {
        const currentState = drawCtx.getImageData(
          0,
          0,
          drawCanvasRef.value.width,
          drawCanvasRef.value.height
        )
        historyStack.value.push(cloneImageData(currentState))
        // 限制历史记录数量
        if (historyStack.value.length > MAX_HISTORY) {
          historyStack.value.shift()
        }
        redoStack.value = []
        debugLog('已保存绘制状态到历史栈（离开画布）')
      }

      // 松开鼠标后自动处理
      scheduleAutoProcess()
    }
  }

  const getCanvasPoint = (event: PointerEvent) => {
    const canvas = drawCanvasRef.value
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    }
  }

  const clearMask = () => {
    if (!drawCtx || !drawCanvasRef.value) return

    const canvas = drawCanvasRef.value
    drawCtx.clearRect(0, 0, canvas.width, canvas.height)
    hasMask.value = false

    // 取消待处理的自动处理
    if (autoProcessTimer) {
      clearTimeout(autoProcessTimer)
      autoProcessTimer = null
    }
  }

  const updateCursor = () => {
    // 触发cursor样式更新
  }

  // 动态防抖时间（根据图片大小调整）
  const getDebounceTime = () => {
    const pixels = actualCanvasWidth.value * actualCanvasHeight.value
    if (pixels < 500000) return 300 // 小图片快速响应
    if (pixels < 2000000) return 500 // 中等图片
    return 800 // 大图片给用户更多时间调整
  }

  // 自动处理调度（防抖）
  const scheduleAutoProcess = () => {
    if (autoProcessTimer) {
      clearTimeout(autoProcessTimer)
    }

    autoProcessTimer = window.setTimeout(() => {
      processInpaint()
    }, getDebounceTime())
  }

  // 切换显示原图/处理后图片
  const toggleOriginal = () => {
    if (!imageCtx || !imageCanvasRef.value || !hasProcessedImage.value) return

    showOriginal.value = !showOriginal.value

    if (showOriginal.value) {
      // 显示原图（最初上传的图片）
      if (originalImageData) {
        imageCtx.putImageData(originalImageData, 0, 0)
      }
    } else {
      // 显示处理后的图片（最新的处理结果）
      if (processedImageData) {
        imageCtx.putImageData(processedImageData, 0, 0)
      }
    }
  }

  // 统一的 Canvas 尺寸检查和恢复函数（静默模式）
  const ensureCanvasSize = (expectedWidth: number, expectedHeight: number, silent = false): boolean => {
    if (!imageCanvasRef.value || !drawCanvasRef.value) return false

    const needsResize = 
      imageCanvasRef.value.width !== expectedWidth || 
      imageCanvasRef.value.height !== expectedHeight

    if (needsResize) {
      if (!silent) {
        console.warn('[去水印] Canvas 尺寸不匹配，正在恢复...', {
          current: `${imageCanvasRef.value.width}x${imageCanvasRef.value.height}`,
          expected: `${expectedWidth}x${expectedHeight}`
        })
      }

      // 重新设置尺寸
      imageCanvasRef.value.width = expectedWidth
      imageCanvasRef.value.height = expectedHeight
      drawCanvasRef.value.width = expectedWidth
      drawCanvasRef.value.height = expectedHeight

      // 重新获取 context
      imageCtx = imageCanvasRef.value.getContext('2d', { willReadFrequently: true })
      drawCtx = drawCanvasRef.value.getContext('2d', { willReadFrequently: true, alpha: true })

      // 恢复内容
      if (imageCtx) {
        if (
          processedImageData &&
          processedImageData.width === expectedWidth &&
          processedImageData.height === expectedHeight
        ) {
          imageCtx.putImageData(processedImageData, 0, 0)
          if (!silent) debugLog('已恢复处理后的图片')
        } else if (
          originalImageData &&
          originalImageData.width === expectedWidth &&
          originalImageData.height === expectedHeight
        ) {
          imageCtx.putImageData(originalImageData, 0, 0)
          if (!silent) debugLog('已恢复原始图片')
        }
      }

      updateCanvasDisplaySize()
    }

    return needsResize
  }

  const processInpaint = async () => {
    debugLog('开始处理')

    if (!imageCtx || !drawCtx || !imageCanvasRef.value || !drawCanvasRef.value) {
      console.error('[去水印] Canvas 未初始化')
      return
    }

    if (!hasMask.value) {
      console.warn('[去水印] 请先标记需要去除的水印区域')
      return
    }

    const width = actualCanvasWidth.value
    const height = actualCanvasHeight.value

    if (!width || !height) {
      ElMessage.error('图片尺寸无效')
      return
    }

    // 验证掩码区域（合并遍历优化）
    const maskData = drawCtx.getImageData(0, 0, width, height)
    const maskPixels = maskData.data
    let maskPixelCount = 0

    for (let i = 0; i < maskPixels.length; i += 4) {
      if (maskPixels[i] > 0) maskPixelCount++
    }

    const totalPixels = width * height
    const maskRatio = maskPixelCount / totalPixels

    debugLog('掩码区域验证:', {
      maskPixelCount,
      totalPixels,
      maskRatio: (maskRatio * 100).toFixed(3) + '%'
    })

    // 验证掩码区域大小
    if (maskPixelCount < 10) {
      ElMessage.warning('标记区域太小（少于10个像素），请标记更多需要去除的区域')
      return
    }

    if (maskRatio < 0.0001) {
      ElMessage.warning(
        `标记区域太小（${(maskRatio * 100).toFixed(4)}%），请标记更多需要去除的区域`
      )
      return
    }

    if (maskRatio > 0.5) {
      ElMessage.warning(`标记区域过大（${(maskRatio * 100).toFixed(2)}%，超过50%），请减小选区`)
      return
    }

    // 权限检查
    if (permissionGuardRef.value) {
      try {
        await permissionGuardRef.value.checkPermission()
      } catch (error) {
        console.error('[去水印] 权限检查失败:', error)
        return
      }
    }

    // 在设置 isProcessing 之前，保存所有需要的数据和引用
    const savedWidth = actualCanvasWidth.value
    const savedHeight = actualCanvasHeight.value
    const savedImageCanvas = imageCanvasRef.value
    const savedDrawCanvas = drawCanvasRef.value
    let savedImageData: ImageData | null = null
    let savedMaskData: ImageData | null = null

    if (imageCtx && savedImageCanvas) {
      try {
        savedImageData = imageCtx.getImageData(0, 0, savedWidth, savedHeight)
        debugLog('已保存 Canvas 状态:', {
          width: savedWidth,
          height: savedHeight,
          dataLength: savedImageData.data.length
        })
      } catch (e) {
        console.warn('[去水印] 无法保存 Canvas 状态:', e)
      }
    }

    if (drawCtx && savedDrawCanvas) {
      try {
        savedMaskData = drawCtx.getImageData(0, 0, savedWidth, savedHeight)
        debugLog('已保存 Mask 状态:', {
          width: savedMaskData.width,
          height: savedMaskData.height,
          dataLength: savedMaskData.data.length
        })
      } catch (e) {
        console.warn('[去水印] 无法保存 Mask 状态:', e)
      }
    }

    // 设置 isProcessing（这可能触发 Vue 重新渲染）
    isProcessing.value = true
    processingStatus.value = '处理中...'

    // 立即恢复 Canvas 尺寸（这是预期行为，不需要警告）
    if (savedImageCanvas && savedDrawCanvas) {
      if (savedImageCanvas.width !== savedWidth || savedImageCanvas.height !== savedHeight) {
        // 静默恢复，不输出警告
        savedImageCanvas.width = savedWidth
        savedImageCanvas.height = savedHeight
        savedDrawCanvas.width = savedWidth
        savedDrawCanvas.height = savedHeight

        // 重新获取 context
        imageCtx = savedImageCanvas.getContext('2d', { willReadFrequently: true })
        drawCtx = savedDrawCanvas.getContext('2d', { willReadFrequently: true, alpha: true })

        // 恢复内容
        if (imageCtx && savedImageData) {
          imageCtx.putImageData(savedImageData, 0, 0)
        }
        if (drawCtx && savedMaskData) {
          drawCtx.putImageData(savedMaskData, 0, 0)
        }

        updateCanvasDisplaySize()
      }
    }

    let backupImageData: ImageData | null = null

    try {
      // 使用保存的原始尺寸
      const width = actualCanvasWidth.value
      const height = actualCanvasHeight.value

      // 获取当前画布上显示的图片数据
      const currentImageData = imageCtx.getImageData(0, 0, width, height)

      // 验证数据有效性 - 多点采样（避免透明PNG左上角无内容导致误判）
      const sampleRegions = getSampleRegions(width, height)
      let hasValidData = false
      for (const region of sampleRegions) {
        const sampleData = imageCtx.getImageData(region.x, region.y, region.w, region.h)
        for (let i = 3; i < sampleData.data.length; i += 4) {
          if (sampleData.data[i] > 0) {
            hasValidData = true
            break
          }
        }
        if (hasValidData) break
      }

      if (!hasValidData) {
        throw new Error('Canvas 数据无效（图片完全透明或为空），请刷新页面重试')
      }

      // 保存当前图片数据的副本用于恢复（如果处理失败）
      backupImageData = cloneImageData(currentImageData)

      const imageData = currentImageData

      // 临时禁用 mix-blend-mode 以便正确读取 mask 数据
      const originalMixBlendMode = drawCanvasRef.value.style.mixBlendMode
      const originalOpacity = drawCanvasRef.value.style.opacity
      drawCanvasRef.value.style.mixBlendMode = 'normal'
      drawCanvasRef.value.style.opacity = '1'

      const maskData = drawCtx.getImageData(0, 0, width, height)

      // 恢复 mix-blend-mode
      drawCanvasRef.value.style.mixBlendMode = originalMixBlendMode
      drawCanvasRef.value.style.opacity = originalOpacity

      debugLog('发送处理请求')

      // 使用 Web Worker 处理
      const result = await runInpaintWorker(imageData, maskData)

      debugLog('收到处理结果:', {
        width: result.width,
        height: result.height
      })

      // 确保 Canvas 尺寸匹配
      if (!imageCanvasRef.value) {
        throw new Error('Canvas 元素丢失')
      }

      if (
        imageCanvasRef.value.width !== result.width ||
        imageCanvasRef.value.height !== result.height
      ) {
        imageCanvasRef.value.width = result.width
        imageCanvasRef.value.height = result.height

        if (drawCanvasRef.value) {
          drawCanvasRef.value.width = result.width
          drawCanvasRef.value.height = result.height
        }

        actualCanvasWidth.value = result.width
        actualCanvasHeight.value = result.height
        imageWidth.value = result.width
        imageHeight.value = result.height

        imageCtx = imageCanvasRef.value.getContext('2d', { willReadFrequently: true })
        if (drawCanvasRef.value) {
          drawCtx = drawCanvasRef.value.getContext('2d', { willReadFrequently: true, alpha: true })
        }

        if (!imageCtx) {
          throw new Error('无法获取 Canvas context')
        }
      }

      // 应用结果到 Canvas
      try {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = result.width
        tempCanvas.height = result.height
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })

        if (!tempCtx) {
          throw new Error('无法创建临时 Canvas context')
        }

        tempCtx.putImageData(result, 0, 0)
        imageCtx.drawImage(tempCanvas, 0, 0)

        // 验证结果不是全黑（多点采样，跳过透明区域）
        let hasColor = false
        for (const region of getSampleRegions(result.width, result.height)) {
          const sampleData = imageCtx.getImageData(region.x, region.y, region.w, region.h)
          for (let i = 0; i < sampleData.data.length; i += 4) {
            // 跳过透明像素（预乘 Alpha 下透明像素 RGB 均为 0）
            if (sampleData.data[i + 3] === 0) continue
            // 检查非透明像素是否有颜色
            if (sampleData.data[i] > 0 || sampleData.data[i + 1] > 0 || sampleData.data[i + 2] > 0) {
              hasColor = true
              break
            }
          }
          if (hasColor) break
        }

        if (!hasColor) {
          throw new Error('处理结果异常：图像为全黑')
        }

        await nextTick()

        if (imageCanvasRef.value) {
          imageCanvasRef.value.style.display = 'block'
          imageCanvasRef.value.style.opacity = '1'
          void imageCanvasRef.value.offsetHeight
        }
      } catch (error) {
        console.error('[去水印] 应用结果失败:', error)
        throw error
      }

      // 保存处理后的图片数据
      if (!hasProcessedImage.value && !originalImageData) {
        originalImageData = backupImageData
      }

      processedImageData = cloneImageData(result)
      hasProcessedImage.value = true
      showOriginal.value = false

      debugLog('处理完成，已保存结果')

      // 记录使用
      permissionGuardRef.value?.recordUsage().catch((err) => {
        console.warn('[去水印] 记录使用失败:', err)
      })

      // 清空 mask
      if (drawCtx && drawCanvasRef.value) {
        drawCtx.clearRect(0, 0, drawCanvasRef.value.width, drawCanvasRef.value.height)
      }
      hasMask.value = false
    } catch (error: any) {
      console.error('[去水印] 处理失败:', error)

      ElMessage({
        message: error.message || '处理失败，请重试',
        type: 'error',
        duration: 3000,
        showClose: true,
        offset: 60
      })

      // 恢复到之前的状态（同步操作）
      if (backupImageData && imageCtx && imageCanvasRef.value) {
        if (
          imageCanvasRef.value.width !== backupImageData.width ||
          imageCanvasRef.value.height !== backupImageData.height
        ) {
          imageCanvasRef.value.width = backupImageData.width
          imageCanvasRef.value.height = backupImageData.height
          imageCtx = imageCanvasRef.value.getContext('2d', { willReadFrequently: true })
        }

        if (imageCtx) {
          imageCtx.putImageData(backupImageData, 0, 0)
          debugLog('已恢复到处理前的图片')
        }
      } else if (originalImageData && imageCtx && imageCanvasRef.value) {
        if (
          imageCanvasRef.value.width !== originalImageData.width ||
          imageCanvasRef.value.height !== originalImageData.height
        ) {
          imageCanvasRef.value.width = originalImageData.width
          imageCanvasRef.value.height = originalImageData.height
          imageCtx = imageCanvasRef.value.getContext('2d', { willReadFrequently: true })
        }

        if (imageCtx) {
          imageCtx.putImageData(originalImageData, 0, 0)
          debugLog('已恢复到原始图片')
        }
      }
    } finally {
      isProcessing.value = false
      processingStatus.value = ''

      // 静默确保 Canvas 尺寸正确
      if (imageCanvasRef.value && drawCanvasRef.value) {
        const expectedWidth = actualCanvasWidth.value
        const expectedHeight = actualCanvasHeight.value

        if (
          imageCanvasRef.value.width !== expectedWidth ||
          imageCanvasRef.value.height !== expectedHeight
        ) {
          imageCanvasRef.value.width = expectedWidth
          imageCanvasRef.value.height = expectedHeight
          drawCanvasRef.value.width = expectedWidth
          drawCanvasRef.value.height = expectedHeight

          imageCtx = imageCanvasRef.value.getContext('2d', { willReadFrequently: true })
          drawCtx = drawCanvasRef.value.getContext('2d', { willReadFrequently: true, alpha: true })

          if (imageCtx) {
            if (
              processedImageData &&
              processedImageData.width === expectedWidth &&
              processedImageData.height === expectedHeight
            ) {
              imageCtx.putImageData(processedImageData, 0, 0)
            } else if (
              originalImageData &&
              originalImageData.width === expectedWidth &&
              originalImageData.height === expectedHeight
            ) {
              imageCtx.putImageData(originalImageData, 0, 0)
            }
          }

          updateCanvasDisplaySize()
        }
      }
    }
  }

  const runInpaintWorker = (imageData: ImageData, maskData: ImageData): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      if (!inpaintWorker) {
        try {
          debugLog('创建新的 Worker 实例')
          inpaintWorker = new Worker(new URL('./inpaint.worker.ts', import.meta.url), {
            type: 'module'
          })

          inpaintWorker.onerror = (error) => {
            console.error('[去水印] Worker 错误:', error)
          }
        } catch (error: any) {
          reject(new Error('无法启动处理引擎: ' + error.message))
          return
        }
      } else {
        debugLog('复用现有的 Worker 实例')
      }

      // 动态超时时间（根据图片大小）
      const pixels = imageData.width * imageData.height
      const timeoutDuration = pixels > 2000000 ? 600000 : 300000 // 大图片10分钟，小图片5分钟

      const timeout = setTimeout(() => {
        reject(new Error('处理超时。如果是首次使用，请检查模型文件是否存在并重试'))
      }, timeoutDuration)

      const messageHandler = (e: MessageEvent) => {
        if (e.data.type === 'progress') {
          const message = e.data.message || '处理中...'
          processingStatus.value = message.includes('下载') || message.includes('初始化') || message.includes('加载') ? message : '处理中...'
        } else if (e.data.type === 'success') {
          clearTimeout(timeout)
          inpaintWorker!.removeEventListener('message', messageHandler)
          resolve(e.data.result)
        } else if (e.data.type === 'error') {
          clearTimeout(timeout)
          inpaintWorker!.removeEventListener('message', messageHandler)
          reject(new Error(e.data.message || '处理失败'))
        }
      }

      inpaintWorker.addEventListener('message', messageHandler)

      try {
        inpaintWorker.postMessage({ type: 'inpaint', imageData, maskData })
      } catch (error: any) {
        clearTimeout(timeout)
        inpaintWorker.removeEventListener('message', messageHandler)
        reject(new Error('发送数据失败: ' + error.message))
      }
    })
  }

  const handleUndo = () => {
    if (!canUndo.value || !drawCtx || !drawCanvasRef.value) return

    const canvas = drawCanvasRef.value

    // 保存当前状态到重做栈
    const currentState = drawCtx.getImageData(0, 0, canvas.width, canvas.height)
    redoStack.value.push(cloneImageData(currentState))

    // 恢复上一个状态
    const lastState = historyStack.value.pop()
    if (lastState) {
      drawCtx.putImageData(lastState, 0, 0)

      // 检查是否还有掩码
      const maskData = drawCtx.getImageData(0, 0, canvas.width, canvas.height)
      let hasMaskPixels = false
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i] > 0) {
          hasMaskPixels = true
          break
        }
      }
      hasMask.value = hasMaskPixels

      debugLog('撤销成功，剩余历史:', historyStack.value.length)

      // 取消待处理的自动处理
      if (autoProcessTimer) {
        clearTimeout(autoProcessTimer)
        autoProcessTimer = null
      }
    }
  }

  const handleRedo = () => {
    if (!canRedo.value || !drawCtx || !drawCanvasRef.value) return

    const canvas = drawCanvasRef.value

    // 保存当前状态到历史栈
    const currentState = drawCtx.getImageData(0, 0, canvas.width, canvas.height)
    historyStack.value.push(cloneImageData(currentState))

    // 恢复下一个状态
    const nextState = redoStack.value.pop()
    if (nextState) {
      drawCtx.putImageData(nextState, 0, 0)

      // 检查是否有掩码
      const maskData = drawCtx.getImageData(0, 0, canvas.width, canvas.height)
      let hasMaskPixels = false
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i] > 0) {
          hasMaskPixels = true
          break
        }
      }
      hasMask.value = hasMaskPixels

      debugLog('重做成功，剩余重做:', redoStack.value.length)

      // 取消待处理的自动处理
      if (autoProcessTimer) {
        clearTimeout(autoProcessTimer)
        autoProcessTimer = null
      }
    }
  }

  const downloadResult = () => {
    if (!imageCanvasRef.value || !currentFile.value) return

    imageCanvasRef.value.toBlob((blob) => {
      if (!blob) {
        ElMessage.error('导出失败')
        return
      }

      const fileName = currentFile.value!.name.replace(/\.[^/.]+$/, '_removed.png')
      saveAs(blob, fileName)

      // 记录历史
      const blobUrl = URL.createObjectURL(blob)
      addRecord({
        toolId: 'image-remove-watermark',
        toolName: '图片去水印',
        fileName: currentFile.value!.name,
        outputFileName: fileName,
        fileSize: currentFile.value!.size,
        outputFileSize: blob.size,
        processType: 'remove-watermark',
        downloadUrl: blobUrl
      })
    }, 'image/png')
  }

  const resetAll = () => {
    currentImage.value = ''
    currentFile.value = null
    originalImageData = null
    processedImageData = null
    imageWidth.value = 0
    imageHeight.value = 0
    historyStack.value = []
    redoStack.value = []
    hasMask.value = false
    isProcessing.value = false
    hasProcessedImage.value = false
    showOriginal.value = false

    // 清除自动处理定时器
    if (autoProcessTimer) {
      clearTimeout(autoProcessTimer)
      autoProcessTimer = null
    }
  }

  /**
   * 获取多个采样区域（四角 + 中心），用于避免透明 PNG 单点采样误判
   * 每个区域取 10x10 像素
   */
  const getSampleRegions = (width: number, height: number) => {
    const s = Math.min(10, width, height)
    const regions = [
      { x: 0, y: 0, w: s, h: s },                                           // 左上
      { x: Math.max(0, width - s), y: 0, w: s, h: s },                      // 右上
      { x: 0, y: Math.max(0, height - s), w: s, h: s },                     // 左下
      { x: Math.max(0, width - s), y: Math.max(0, height - s), w: s, h: s }, // 右下
      { x: Math.max(0, Math.floor((width - s) / 2)), y: Math.max(0, Math.floor((height - s) / 2)), w: s, h: s }, // 中心
    ]
    return regions
  }

  const cloneImageData = (imageData: ImageData): ImageData => {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
  }



  // 预加载模型
  const preloadModel = () => {
    if (!inpaintWorker) {
      try {
        debugLog('预加载：创建 Worker 并初始化模型')
        inpaintWorker = new Worker(new URL('./inpaint.worker.ts', import.meta.url), {
          type: 'module'
        })

        // 监听预加载进度
        inpaintWorker.onmessage = (e) => {
          if (e.data.type === 'progress') {
            debugLog('预加载进度:', e.data.message)
          } else if (e.data.type === 'success') {
            debugLog('预加载成功:', e.data.message)
          } else if (e.data.type === 'error') {
            console.warn('[去水印] 预加载失败:', e.data.message)
          }
        }

        // 直接发送预加载指令，不需要测试数据
        debugLog('发送预加载请求...')
        inpaintWorker.postMessage({ type: 'preload' })
      } catch (error) {
        console.warn('[去水印] 预加载失败:', error)
      }
    }
  }



  // 组件挂载时预加载模型
  onMounted(() => {
    // 延迟 1 秒后开始预加载，避免影响页面初始渲染
    setTimeout(() => {
      debugLog('开始预加载模型...')
      preloadModel()
    }, 1000)
  })

  onUnmounted(() => {
    if (inpaintWorker) {
      debugLog('组件卸载，终止 Worker')
      inpaintWorker.terminate()
      inpaintWorker = null
    }
  })
</script>

<style scoped lang="scss">
  .tool-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;

    .tool-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }

  .upload-area {
    min-height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--el-border-color);
    border-radius: 12px;
    padding: 24px;
    transition: all 0.3s;
    cursor: pointer;

    &:not(.has-image):hover,
    &.is-dragging {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    &.has-image {
      cursor: default;
      border: none;
      padding: 0;
      min-height: auto;
      background: transparent;
    }
  }

  .canvas-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    min-height: 500px; // 设置最小高度，防止布局跳动
  }

  .canvas-wrapper {
    position: relative;
    display: inline-block;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    max-width: 100%;
    overflow: hidden; // 确保子元素被裁剪
    // 防止内容变化时的布局跳动
    contain: layout;

    .image-canvas {
      display: block;
      opacity: 1;
      filter: none;
      transition: none; // 移除过渡效果，避免闪烁
      border-radius: 8px; // 添加圆角
    }

    .draw-canvas {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
      background: transparent;
      pointer-events: auto;
      // 使用 CSS 混合模式让红色标记看起来半透明
      mix-blend-mode: multiply;
      opacity: 0.5;
      border-radius: 8px; // 添加圆角
      // 防止清空时的闪烁
      will-change: auto;

      &.pointer-events-none {
        pointer-events: none;
      }
    }
  }

  // 高级处理加载效果
  .processing-overlay-advanced {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    overflow: hidden;
    animation: overlay-fade-in 0.3s ease-out;

    .processing-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px) saturate(150%);
      -webkit-backdrop-filter: blur(10px) saturate(150%);
    }

    .processing-content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      z-index: 1;
    }

    .processing-spinner {
      width: 80px;
      height: 80px;
      position: relative;

      .spinner-ring {
        width: 100%;
        height: 100%;
        animation: rotate 2s linear infinite;
        filter: drop-shadow(0 2px 8px rgba(64, 158, 255, 0.3));

        .spinner-path {
          stroke: var(--el-color-primary);
          stroke-linecap: round;
          stroke-dasharray: 90, 150;
          stroke-dashoffset: 0;
          animation: dash 1.5s ease-in-out infinite;
        }
      }
    }

    .processing-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      letter-spacing: 0.5px;
      text-shadow: 0 2px 4px rgba(255, 255, 255, 0.8);
    }

    .processing-subtitle {
      font-size: 14px;
      color: var(--el-text-color-secondary);
      text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
    }
  }

  @keyframes overlay-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124;
    }
  }

  .canvas-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--el-fill-color-light);
    border-radius: 8px;
    gap: 16px;
    flex-wrap: wrap;

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tool-selector {
      display: flex;
      gap: 8px;

      .el-button {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    .tool-label {
      font-size: 14px;
      color: var(--el-text-color-regular);
      white-space: nowrap;
    }

    .size-value {
      font-size: 14px;
      color: var(--el-text-color-primary);
      font-weight: 500;
      min-width: 45px;
    }

    // 按钮图标和文字间距
    .el-button {
      .mr-1 {
        margin-right: 4px;
      }
    }
  }

  .info-bar {
    display: flex;
    gap: 20px;
    padding: 12px 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
    flex-wrap: wrap;
    min-height: 45px; // 固定最小高度，避免跳动
    align-items: center; // 垂直居中

    .info-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
      transition: color 0.2s ease; // 平滑过渡颜色变化

      &.highlight {
        color: var(--el-color-success);
        font-weight: 500;
      }

      &.processing {
        color: var(--el-color-primary);
        font-weight: 500;
      }

      &.tip {
        color: var(--el-color-info);
      }
    }
  }

  .file-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 20px;
    flex-wrap: wrap;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    .canvas-toolbar {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;

      .toolbar-left,
      .toolbar-right {
        width: 100%;
        justify-content: flex-start;
        flex-wrap: wrap;
      }

      .tool-selector {
        width: 100%;

        .el-button {
          flex: 1;
          justify-content: center;
        }
      }

      .toolbar-right {
        .el-button {
          flex: 1;
        }
      }
    }

    .file-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }

  // 小屏幕优化
  @media (max-width: 480px) {
    .canvas-toolbar {
      .toolbar-left,
      .toolbar-right {
        gap: 6px;
      }

      .el-button {
        font-size: 13px;
        padding: 8px 12px;
      }
    }
  }
</style>
