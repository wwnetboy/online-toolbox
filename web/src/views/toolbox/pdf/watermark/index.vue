<template>
  <ToolPageLayout
    feature-id="pdf-watermark"
    feature-name="PDF水印"
    :title="toolName || 'PDF水印'"
    :description="toolDescription || '为PDF添加文字或图片水印'"
    :icon="toolIcon"
    :icon-url="toolIconUrl"
    :color="toolColor"
  >
    <template #content>
      <div
        class="upload-area"
        :class="{ 'is-dragging': isDragging, 'has-files': hasFiles }"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
        @dragover="handleDragOver"
        @drop="handleDrop"
      >
        <template v-if="!hasFiles && !isProcessing && !hasResult">
          <p class="text-base text-g-600 mb-2">将文件拖拽到虚框内</p>
          <p class="text-sm text-g-400 mb-4">或者</p>
          <ElButton type="primary" @click="triggerFileSelect">点击上传文件(小于100M)</ElButton>
        </template>

        <template v-if="hasFiles && !isProcessing && !hasResult">
          <div class="watermark-layout">
            <div class="preview-panel">
              <div class="preview-header">
                <div>
                  <h3 class="preview-title">实时预览</h3>
                  <p class="preview-subtitle">低分辨率预览，参数变更后即时刷新</p>
                </div>
                <div class="page-controls">
                  <ElButton
                    circle
                    size="small"
                    :disabled="currentPage <= 1"
                    @click="changePage(currentPage - 1)"
                  >
                    <ElIcon><ArrowLeft /></ElIcon>
                  </ElButton>
                  <div class="page-info">{{ currentPage }} / {{ totalPages }} 页</div>
                  <ElButton
                    circle
                    size="small"
                    :disabled="currentPage >= totalPages"
                    @click="changePage(currentPage + 1)"
                  >
                    <ElIcon><ArrowRight /></ElIcon>
                  </ElButton>
                </div>
              </div>
              <div
                ref="previewViewportRef"
                class="preview-viewport"
                @mousedown="startPan"
                @mousemove="onPan"
                @mouseup="stopPan"
                @mouseleave="stopPan"
              >
                <div class="preview-canvas-wrapper" :style="previewTransformStyle">
                  <canvas
                    ref="watermarkCanvasRef"
                    class="preview-canvas watermark-layer"
                    :style="watermarkLayerStyle"
                  ></canvas>
                  <canvas ref="pdfCanvasRef" class="preview-canvas pdf-layer"></canvas>
                </div>
              </div>
              <div class="preview-toolbar">
                <div class="zoom-controls">
                  <ElButton size="small" @click="zoomOut">
                    <ElIcon><ZoomOut /></ElIcon>
                  </ElButton>
                  <ElSlider v-model="zoom" :min="0.5" :max="2" :step="0.1" class="zoom-slider" />
                  <ElButton size="small" @click="zoomIn">
                    <ElIcon><ZoomIn /></ElIcon>
                  </ElButton>
                </div>
                <ElButton size="small" @click="resetView">重置视图</ElButton>
              </div>
            </div>

            <div class="config-panel">
              <div class="file-summary">
                <div class="file-summary-info">
                  <Icon icon="ri:file-pdf-2-fill" class="text-3xl text-danger" />
                  <div>
                    <p class="file-name">{{ files[0]?.name }}</p>
                    <p class="file-size">{{ formatFileSize(files[0]?.size || 0) }}</p>
                  </div>
                </div>
                <ElButton text @click="removeFile(files[0]?.id)">
                  <ElIcon><Close /></ElIcon>
                </ElButton>
              </div>

              <ElForm :model="watermarkOptions" label-width="88px" size="small" class="config-form">
                <ElFormItem label="水印类型">
                  <ElRadioGroup v-model="watermarkOptions.type">
                    <ElRadioButton value="text">文字水印</ElRadioButton>
                    <ElRadioButton value="image">图片水印</ElRadioButton>
                  </ElRadioGroup>
                </ElFormItem>

                <template v-if="watermarkOptions.type === 'text'">
                  <ElFormItem label="文字内容">
                    <ElInput
                      v-model="watermarkOptions.content"
                      placeholder="请输入水印文字"
                      maxlength="50"
                      show-word-limit
                    />
                  </ElFormItem>
                  <ElFormItem label="预设模板">
                    <div class="template-btns">
                      <ElButton size="small" @click="useTemplate('confidential')">
                        内部保密
                      </ElButton>
                      <ElButton size="small" @click="useTemplate('internal')">
                        仅限办公使用
                      </ElButton>
                    </div>
                  </ElFormItem>
                  <ElFormItem label="字体">
                    <ElSelect v-model="watermarkOptions.fontFamily" placeholder="选择字体">
                      <ElOption
                        v-for="font in fontOptions"
                        :key="font.value"
                        :label="font.label"
                        :value="font.value"
                      />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="字号">
                    <ElInputNumber v-model="watermarkOptions.fontSize" :min="8" :max="120" />
                  </ElFormItem>
                  <ElFormItem label="颜色">
                    <ElColorPicker v-model="watermarkOptions.color" />
                  </ElFormItem>
                </template>

                <template v-else>
                  <ElFormItem label="水印图片">
                    <ElUpload
                      :auto-upload="false"
                      :show-file-list="false"
                      accept=".png,.jpg,.jpeg,.svg"
                      :on-change="handleImageChange"
                    >
                      <ElButton size="small">选择图片</ElButton>
                    </ElUpload>
                    <span v-if="watermarkImageName" class="image-name">
                      {{ watermarkImageName }}
                    </span>
                  </ElFormItem>
                  <ElFormItem label="缩放比例">
                    <ElSlider
                      v-model="watermarkOptions.imageScale"
                      :min="0.1"
                      :max="2"
                      :step="0.05"
                    />
                  </ElFormItem>
                </template>

                <ElFormItem label="布局方式">
                  <ElRadioGroup v-model="watermarkOptions.layout">
                    <ElRadioButton value="single">单个</ElRadioButton>
                    <ElRadioButton value="tile">平铺</ElRadioButton>
                  </ElRadioGroup>
                </ElFormItem>

                <ElFormItem label="位置模式">
                  <ElRadioGroup v-model="watermarkOptions.positionMode">
                    <ElRadioButton value="grid">九宫格</ElRadioButton>
                    <ElRadioButton value="custom">精确坐标</ElRadioButton>
                  </ElRadioGroup>
                </ElFormItem>

                <ElFormItem v-if="watermarkOptions.positionMode === 'grid'" label="九宫格">
                  <div class="position-grid">
                    <ElButton
                      v-for="pos in positions"
                      :key="pos.value"
                      :type="watermarkOptions.position === pos.value ? 'primary' : 'default'"
                      size="small"
                      @click="watermarkOptions.position = pos.value"
                    >
                      {{ pos.label }}
                    </ElButton>
                  </div>
                </ElFormItem>

                <template v-else>
                  <ElFormItem label="X 坐标">
                    <ElInputNumber v-model="watermarkOptions.positionX" :min="0" :max="2000" />
                  </ElFormItem>
                  <ElFormItem label="Y 坐标">
                    <ElInputNumber v-model="watermarkOptions.positionY" :min="0" :max="2000" />
                  </ElFormItem>
                </template>

                <ElFormItem label="旋转角度">
                  <ElSlider v-model="watermarkOptions.rotation" :min="-180" :max="180" :step="1" />
                </ElFormItem>

                <ElFormItem label="透明度">
                  <ElSlider v-model="watermarkOptions.opacity" :min="0" :max="100" :step="1" />
                </ElFormItem>

                <ElFormItem label="层叠顺序">
                  <ElSelect v-model="watermarkOptions.layer">
                    <ElOption label="前景" value="foreground" />
                    <ElOption label="背景" value="background" />
                  </ElSelect>
                </ElFormItem>

                <ElFormItem label="页码范围">
                  <ElRadioGroup v-model="watermarkOptions.applyTo">
                    <ElRadio value="all">全部页面</ElRadio>
                    <ElRadio value="range">指定范围</ElRadio>
                  </ElRadioGroup>
                </ElFormItem>

                <ElFormItem v-if="watermarkOptions.applyTo === 'range'" label="范围">
                  <ElInput
                    v-model="watermarkOptions.pageRange"
                    placeholder="如 1-3,5,8"
                    @blur="validatePageRange"
                  />
                  <p v-if="pageRangeError" class="form-error">{{ pageRangeError }}</p>
                </ElFormItem>

                <ElFormItem label="输出标准">
                  <ElInput value="PDF/A-1b" readonly />
                </ElFormItem>
              </ElForm>

              <div v-if="hasPreference" class="preference-hint">
                <span class="text-xs text-g-400">已记住您的偏好设置</span>
                <ElButton link type="primary" size="small" @click="resetToDefault">
                  恢复默认
                </ElButton>
              </div>

              <div class="file-actions">
                <ElButton
                  type="primary"
                  size="large"
                  :disabled="!isWatermarkValid"
                  @click="handleAddWatermark"
                >
                  添加水印
                </ElButton>
                <ElButton size="large" @click="handleClear">清空</ElButton>
              </div>
            </div>
          </div>
        </template>

        <template v-if="isProcessing">
          <ToolResultView 
            type="loading" 
            loading-text="正在添加水印" 
            :percentage="progress.progress"
            icon-from="ri:file-pdf-2-fill"
            icon-to="ri:file-pdf-2-fill"
          />
        </template>

        <template v-if="hasResult">
          <ToolResultView
            v-if="isSuccess"
            type="success"
            title="水印添加完成！"
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
              <ElButton type="primary" @click="handleDownload">
                <ElIcon class="mr-1"><Download /></ElIcon>下载文件
              </ElButton>
              <ElButton @click="handleContinue">继续处理</ElButton>
            </template>
          </ToolResultView>
          <ToolResultView
            v-else
            type="error"
            title="处理失败"
            :message="errorMsg || '处理失败，请重试'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF水印工具支持文字与图片水印，实时预览并可指定页码范围。</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>文字水印支持字体、字号、颜色、旋转与透明度</li>
          <li>图片水印支持 PNG/JPG/SVG，提供缩放与旋转</li>
          <li>预览支持翻页、缩放与拖动查看</li>
          <li>输出文件通过 PDF/A-1b 合规性转换</li>
        </ul>
      </div>
    </template>
  </ToolPageLayout>
</template>

<script setup lang="ts">
  import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
  import { ElMessage } from 'element-plus'
  import type { UploadFile } from 'element-plus'
  import {
    Loading,
    CircleClose,
    Download,
    Close,
    ArrowLeft,
    ArrowRight,
    ZoomIn,
    ZoomOut
  } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import { pdfjsLib, getDocumentOptions } from '@/utils/pdfjs-config'
  import ToolPageLayout from '@/components/core/layouts/tool-page-layout/index.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useToolProcessor } from '@/hooks/core/useToolProcessor'
  import { usePreference } from '@/hooks/core/usePreference'
  import { useHistory } from '@/hooks/core/useHistory'
  import {
    createPdfWatermarkProcessor,
    type PdfWatermarkOptions,
    type WatermarkPosition
  } from '@/processors/pdf/watermark'

  defineOptions({ name: 'PdfWatermarkPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

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
    clearFiles,
    formatFileSize
  } = useUpload({ accept: '.pdf', multiple: false, maxSize: 100, maxCount: 1 })

  const {
    options: watermarkOptions,
    hasPreference,
    resetToDefault
  } = usePreference<PdfWatermarkOptions>('pdf-watermark', {
    type: 'text',
    content: '',
    position: 'center',
    positionMode: 'grid',
    positionX: 20,
    positionY: 20,
    opacity: 30,
    rotation: -45,
    fontSize: 48,
    color: '#666666',
    fontFamily: 'Helvetica',
    template: 'custom',
    layout: 'single',
    layer: 'foreground',
    applyTo: 'all',
    pageRange: '',
    imageScale: 0.5,
    outputStandard: 'pdfa-1b'
  })

  const positions: Array<{ value: WatermarkPosition; label: string }> = [
    { value: 'top-left', label: '左上' },
    { value: 'top-center', label: '上中' },
    { value: 'top-right', label: '右上' },
    { value: 'center-left', label: '左中' },
    { value: 'center', label: '居中' },
    { value: 'center-right', label: '右中' },
    { value: 'bottom-left', label: '左下' },
    { value: 'bottom-center', label: '下中' },
    { value: 'bottom-right', label: '右下' }
  ]

  const fontOptions = [
    { label: 'Helvetica', value: 'Helvetica' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Microsoft YaHei', value: 'Microsoft YaHei' },
    { label: 'PingFang SC', value: 'PingFang SC' },
    { label: 'SimSun', value: 'SimSun' }
  ]

  const processor = createPdfWatermarkProcessor()
  const {
    isProcessing,
    progress,
    hasResult,
    isSuccess,
    errorMsg,
    processFiles,
    downloadResult,
    reset
  } = useToolProcessor(processor, {
    featureId: 'pdf-watermark',
    featureName: 'PDF水印',
    successMessage: '水印添加完成！',
    errorMessage: '添加水印失败'
  })

  const { addRecord } = useHistory()

  const resultFileName = computed(() => {
    if (files.value.length > 0) {
      return files.value[0].name.replace(/\.pdf$/i, '_watermarked.pdf')
    }
    return 'watermarked.pdf'
  })

  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const pdfCanvasRef = ref<HTMLCanvasElement | null>(null)
  const watermarkCanvasRef = ref<HTMLCanvasElement | null>(null)
  const previewViewportRef = ref<HTMLDivElement | null>(null)
  const pdfDocRef = ref<any>(null)
  const pdfLoadingTaskRef = ref<any>(null)
  const totalPages = ref(0)
  const currentPage = ref(1)
  const previewScale = ref(0.6)
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const isPanning = ref(false)
  const panStart = ref({ x: 0, y: 0, originX: 0, originY: 0 })
  const pageViewport = ref<{ width: number; height: number } | null>(null)
  const watermarkImageFile = ref<File | null>(null)
  const watermarkImageUrl = ref<string | null>(null)
  const watermarkImageName = computed(() => watermarkImageFile.value?.name || '')
  const watermarkImageEl = ref<HTMLImageElement | null>(null)
  const pageRangeError = ref('')

  const previewTransformStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`
  }))

  const watermarkLayerStyle = computed(() => ({
    zIndex: watermarkOptions.value.layer === 'background' ? 1 : 3
  }))

  const isWatermarkValid = computed(() => {
    if (watermarkOptions.value.type === 'text') {
      return watermarkOptions.value.content?.trim().length > 0
    }
    return !!watermarkImageFile.value
  })

  const useTemplate = (template: 'confidential' | 'internal') => {
    watermarkOptions.value.content = template === 'confidential' ? '内部保密' : '仅限办公使用'
  }

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages.value) return
    currentPage.value = page
  }

  const resetView = () => {
    zoom.value = 1
    panX.value = 0
    panY.value = 0
  }

  const zoomIn = () => {
    zoom.value = Math.min(2, Number((zoom.value + 0.1).toFixed(2)))
  }

  const zoomOut = () => {
    zoom.value = Math.max(0.5, Number((zoom.value - 0.1).toFixed(2)))
  }

  const startPan = (event: MouseEvent) => {
    if (event.button !== 0) return
    isPanning.value = true
    panStart.value = {
      x: event.clientX,
      y: event.clientY,
      originX: panX.value,
      originY: panY.value
    }
  }

  const onPan = (event: MouseEvent) => {
    if (!isPanning.value) return
    const deltaX = event.clientX - panStart.value.x
    const deltaY = event.clientY - panStart.value.y
    panX.value = panStart.value.originX + deltaX
    panY.value = panStart.value.originY + deltaY
  }

  const stopPan = () => {
    isPanning.value = false
  }

  const handleImageChange = (file: UploadFile) => {
    if (!file?.raw) return
    if (watermarkImageUrl.value) {
      URL.revokeObjectURL(watermarkImageUrl.value)
    }
    watermarkImageFile.value = file.raw
    watermarkImageUrl.value = URL.createObjectURL(file.raw)
    const img = new Image()
    img.onload = () => {
      watermarkImageEl.value = img
      renderWatermarkLayer()
    }
    img.src = watermarkImageUrl.value
  }

  const parsePageRange = (rangeStr: string, maxPage: number): number[] => {
    const normalized = rangeStr.trim()
    if (!normalized) return []
    const pages = new Set<number>()
    const parts = normalized.split(',').map((s) => s.trim())
    for (const part of parts) {
      if (!part) continue
      if (part.includes('-')) {
        const [startRaw, endRaw] = part.split('-')
        const start = parseInt(startRaw.trim())
        const end = parseInt(endRaw.trim())
        if (Number.isNaN(start) || Number.isNaN(end) || start < 1 || end > maxPage || start > end) {
          throw new Error(`无效的页码范围: ${part}`)
        }
        for (let i = start; i <= end; i++) {
          pages.add(i)
        }
      } else {
        const page = parseInt(part)
        if (Number.isNaN(page) || page < 1 || page > maxPage) {
          throw new Error(`无效的页码: ${part}`)
        }
        pages.add(page)
      }
    }
    return Array.from(pages).sort((a, b) => a - b)
  }

  const validatePageRange = () => {
    pageRangeError.value = ''
    if (watermarkOptions.value.applyTo !== 'range') return
    if (!watermarkOptions.value.pageRange?.trim()) return
    try {
      parsePageRange(watermarkOptions.value.pageRange, totalPages.value || 1)
    } catch (error) {
      pageRangeError.value = error instanceof Error ? error.message : '页码范围无效'
    }
  }

  const isPageInRange = () => {
    if (watermarkOptions.value.applyTo !== 'range') return true
    if (!watermarkOptions.value.pageRange?.trim()) return false
    try {
      const pages = parsePageRange(watermarkOptions.value.pageRange, totalPages.value || 1)
      return pages.includes(currentPage.value)
    } catch {
      return false
    }
  }

  const renderPdfPage = async () => {
    if (!pdfDocRef.value || !pdfCanvasRef.value) return
    const page = await pdfDocRef.value.getPage(currentPage.value)
    const viewport = page.getViewport({ scale: previewScale.value })
    pageViewport.value = { width: viewport.width, height: viewport.height }
    const canvas = pdfCanvasRef.value
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: context, viewport }).promise
  }

  const resolveHexColor = (color: string, opacity: number) => {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16) || 0
    const g = parseInt(hex.substring(2, 4), 16) || 0
    const b = parseInt(hex.substring(4, 6), 16) || 0
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  const resolvePosition = (
    width: number,
    height: number,
    markWidth: number,
    markHeight: number
  ) => {
    if (watermarkOptions.value.positionMode === 'custom') {
      const x = (watermarkOptions.value.positionX || 0) * previewScale.value
      const y = (watermarkOptions.value.positionY || 0) * previewScale.value
      return { x, y }
    }
    const padding = 20 * previewScale.value
    const position = watermarkOptions.value.position || 'center'
    if (position === 'top-left') return { x: padding, y: padding }
    if (position === 'top-center') return { x: (width - markWidth) / 2, y: padding }
    if (position === 'top-right') return { x: width - markWidth - padding, y: padding }
    if (position === 'center-left') return { x: padding, y: (height - markHeight) / 2 }
    if (position === 'center') return { x: (width - markWidth) / 2, y: (height - markHeight) / 2 }
    if (position === 'center-right')
      return { x: width - markWidth - padding, y: (height - markHeight) / 2 }
    if (position === 'bottom-left') return { x: padding, y: height - markHeight - padding }
    if (position === 'bottom-center')
      return { x: (width - markWidth) / 2, y: height - markHeight - padding }
    return { x: width - markWidth - padding, y: height - markHeight - padding }
  }

  const drawRotated = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    draw: () => void
  ) => {
    ctx.save()
    ctx.translate(x + width / 2, y + height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-width / 2, -height / 2)
    draw()
    ctx.restore()
  }

  const renderWatermarkLayer = () => {
    if (!watermarkCanvasRef.value || !pageViewport.value) return
    const canvas = watermarkCanvasRef.value
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.width = pageViewport.value.width
    canvas.height = pageViewport.value.height
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (!isPageInRange()) return
    const opacity = (watermarkOptions.value.opacity || 0) / 100
    if (watermarkOptions.value.type === 'text') {
      const content = watermarkOptions.value.content || ''
      if (!content.trim()) return
      const fontSize = (watermarkOptions.value.fontSize || 48) * previewScale.value
      const fontFamily = watermarkOptions.value.fontFamily || 'Helvetica'
      context.font = `${fontSize}px ${fontFamily}`
      context.textBaseline = 'top'
      const metrics = context.measureText(content)
      const textWidth = metrics.width
      const textHeight = fontSize * 1.2
      const color = resolveHexColor(watermarkOptions.value.color || '#666666', opacity)
      context.fillStyle = color
      if (watermarkOptions.value.layout === 'tile') {
        const spacing = Math.max(40, fontSize)
        for (let y = -canvas.height; y < canvas.height * 2; y += textHeight + spacing) {
          for (let x = -canvas.width; x < canvas.width * 2; x += textWidth + spacing) {
            drawRotated(
              context,
              x,
              y,
              textWidth,
              textHeight,
              watermarkOptions.value.rotation || 0,
              () => {
                context.fillText(content, 0, 0)
              }
            )
          }
        }
      } else {
        const position = resolvePosition(canvas.width, canvas.height, textWidth, textHeight)
        drawRotated(
          context,
          position.x,
          position.y,
          textWidth,
          textHeight,
          watermarkOptions.value.rotation || 0,
          () => {
            context.fillText(content, 0, 0)
          }
        )
      }
      return
    }
    if (!watermarkImageEl.value) return
    const image = watermarkImageEl.value
    const scale = watermarkOptions.value.imageScale || 0.5
    const imageWidth = image.width * scale * previewScale.value
    const imageHeight = image.height * scale * previewScale.value
    context.globalAlpha = opacity
    if (watermarkOptions.value.layout === 'tile') {
      const spacing = 40 * previewScale.value
      for (let y = -canvas.height; y < canvas.height * 2; y += imageHeight + spacing) {
        for (let x = -canvas.width; x < canvas.width * 2; x += imageWidth + spacing) {
          drawRotated(
            context,
            x,
            y,
            imageWidth,
            imageHeight,
            watermarkOptions.value.rotation || 0,
            () => {
              context.drawImage(image, 0, 0, imageWidth, imageHeight)
            }
          )
        }
      }
    } else {
      const position = resolvePosition(canvas.width, canvas.height, imageWidth, imageHeight)
      drawRotated(
        context,
        position.x,
        position.y,
        imageWidth,
        imageHeight,
        watermarkOptions.value.rotation || 0,
        () => {
          context.drawImage(image, 0, 0, imageWidth, imageHeight)
        }
      )
    }
    context.globalAlpha = 1
  }

  const renderPreview = async () => {
    await renderPdfPage()
    renderWatermarkLayer()
  }

  const loadPdf = async () => {
    if (!files.value.length) return
    try {
      if (pdfDocRef.value?.cleanup) {
        await pdfDocRef.value.cleanup()
      }
      if (pdfLoadingTaskRef.value?.destroy) {
        await pdfLoadingTaskRef.value.destroy()
      }
      pdfDocRef.value = null
      pdfLoadingTaskRef.value = null
      const arrayBuffer = await files.value[0].file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument(getDocumentOptions(arrayBuffer))
      pdfLoadingTaskRef.value = loadingTask
      pdfDocRef.value = await loadingTask.promise
      totalPages.value = pdfDocRef.value.numPages
      currentPage.value = 1
      await nextTick()
      await renderPreview()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '加载PDF失败')
    }
  }

  const clearPreview = () => {
    if (pdfDocRef.value?.cleanup) {
      pdfDocRef.value.cleanup()
    }
    if (pdfLoadingTaskRef.value?.destroy) {
      pdfLoadingTaskRef.value.destroy()
    }
    pdfDocRef.value = null
    pdfLoadingTaskRef.value = null
    totalPages.value = 0
    currentPage.value = 1
    pageViewport.value = null
    if (pdfCanvasRef.value) {
      const ctx = pdfCanvasRef.value.getContext('2d')
      ctx?.clearRect(0, 0, pdfCanvasRef.value.width, pdfCanvasRef.value.height)
    }
    if (watermarkCanvasRef.value) {
      const ctx = watermarkCanvasRef.value.getContext('2d')
      ctx?.clearRect(0, 0, watermarkCanvasRef.value.width, watermarkCanvasRef.value.height)
    }
  }

  const handleAddWatermark = async () => {
    if (watermarkOptions.value.applyTo === 'range' && !watermarkOptions.value.pageRange?.trim()) {
      ElMessage.warning('请填写页码范围')
      return
    }
    if (pageRangeError.value) {
      ElMessage.warning(pageRangeError.value)
      return
    }
    if (watermarkOptions.value.type === 'text' && !watermarkOptions.value.content?.trim()) {
      ElMessage.warning('请输入水印内容')
      return
    }
    if (watermarkOptions.value.type === 'image' && !watermarkImageFile.value) {
      ElMessage.warning('请选择水印图片')
      return
    }

    const options: PdfWatermarkOptions = {
      ...watermarkOptions.value,
      imageFile: watermarkImageFile.value || undefined,
      outputStandard: 'pdfa-1b'
    }

    const result = await processFiles(
      files.value.map((f) => f.file),
      options
    )
    if (result?.success && result.data) {
      const blobUrl = URL.createObjectURL(result.data as Blob)
      addRecord({
        toolId: 'pdf-watermark',
        toolName: 'PDF水印',
        fileName: files.value[0].name,
        outputFileName: resultFileName.value,
        fileSize: files.value[0].size,
        outputFileSize: (result.data as Blob).size,
        processType: 'watermark',
        downloadUrl: blobUrl
      })
    }
  }

  const handleDownload = () => {
    downloadResult(resultFileName.value)
  }

  const handleContinue = () => {
    reset()
    handleClear()
  }

  const handleRetry = () => {
    reset()
  }

  const handleClear = () => {
    resetView()
    clearFiles()
    watermarkOptions.value.content = ''
    watermarkImageFile.value = null
    watermarkImageEl.value = null
    if (watermarkImageUrl.value) {
      URL.revokeObjectURL(watermarkImageUrl.value)
      watermarkImageUrl.value = null
    }
    clearPreview()
  }

  watch(
    () => files.value.length,
    async (length) => {
      if (length > 0) {
        await loadPdf()
      } else {
        clearPreview()
      }
    }
  )

  watch(
    () => currentPage.value,
    async () => {
      await renderPreview()
    }
  )

  watch(
    () => previewScale.value,
    async () => {
      await renderPreview()
    }
  )

  watch(
    () => watermarkOptions.value,
    () => {
      validatePageRange()
      renderWatermarkLayer()
    },
    { deep: true }
  )

  onBeforeUnmount(() => {
    if (pdfDocRef.value?.cleanup) {
      pdfDocRef.value.cleanup()
    }
    if (pdfLoadingTaskRef.value?.destroy) {
      pdfLoadingTaskRef.value.destroy()
    }
    if (watermarkImageUrl.value) {
      URL.revokeObjectURL(watermarkImageUrl.value)
    }
  })
</script>

<style scoped lang="scss">
  .watermark-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 20px;
    width: 100%;
  }

  .preview-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 16px;
    padding: 16px;
    min-height: 520px;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .preview-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .preview-subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .page-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-info {
    font-size: 13px;
    color: var(--el-text-color-regular);
    min-width: 80px;
    text-align: center;
  }

  .preview-viewport {
    flex: 1;
    background: var(--el-fill-color-lighter);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    cursor: grab;
  }

  .preview-canvas-wrapper {
    position: relative;
    transform-origin: center center;
  }

  .preview-canvas {
    display: block;
    max-width: 100%;
  }

  .pdf-layer {
    position: relative;
    z-index: 2;
  }

  .watermark-layer {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
  }

  .preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .zoom-slider {
    flex: 1;
    min-width: 140px;
  }

  .config-panel {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .file-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--el-fill-color-lighter);
    border-radius: 12px;
    padding: 12px 16px;
  }

  .file-summary-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .file-name {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .config-form {
    display: grid;
    gap: 6px;
  }

  .template-btns {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .position-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .image-name {
    margin-left: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .form-error {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--el-color-danger);
  }

  .file-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .preference-hint {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
  }

  @media (max-width: 1024px) {
    .watermark-layout {
      grid-template-columns: 1fr;
    }

    .preview-panel {
      min-height: 420px;
    }

    .file-actions {
      justify-content: stretch;
    }
  }
</style>
