<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || 'PDF转图片'"
      :description="toolDescription || '将PDF文件的每一页转换为高质量图片'"
    />
    <PermissionGuard feature-id="pdf-to-image" feature-name="PDF转图片" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || 'PDF转图片' }}</span>
        </div>
        <div
          class="upload-area"
          :class="{ 'is-dragging': isDragging, 'has-files': hasFile }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <!-- 上传区域 -->
          <template v-if="!hasFile && !isProcessing && !processResult">
            <p class="text-base text-g-600 mb-2">将PDF文件拖拽到虚框内</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">点击上传PDF(小于100M)</ElButton>
            <p class="text-xs text-g-400 mt-3">支持 PDF 格式</p>
          </template>

          <!-- 文件已上传，显示预览和选项 -->
          <template v-if="hasFile && !isProcessing && !processResult">
            <div class="file-preview-container">
              <!-- PDF信息 -->
              <div class="pdf-info-card">
                <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                <div class="pdf-info-text">
                  <p class="pdf-name">{{ currentFile?.name }}</p>
                  <p class="pdf-meta"
                    >{{ formatFileSize(currentFile?.size || 0) }} · {{ totalPages }}页</p
                  >
                </div>
                <ElButton type="danger" link @click="clearFile">
                  <ElIcon><Close /></ElIcon>
                </ElButton>
              </div>

              <!-- 页面预览和选择 -->
              <div class="page-selection-section">
                <ElDivider content-position="left">页面选择</ElDivider>
                <div class="page-selection-header">
                  <ElRadioGroup v-model="pageSelectionMode" size="small">
                    <ElRadioButton value="all">全部页面</ElRadioButton>
                    <ElRadioButton value="custom">自定义选择</ElRadioButton>
                  </ElRadioGroup>
                  <span v-if="pageSelectionMode === 'custom'" class="selected-count">
                    已选择 {{ selectedPages.length }} 页
                  </span>
                </div>

                <!-- 页面缩略图网络-->
                <div v-if="pageSelectionMode === 'custom'" class="page-grid">
                  <div
                    v-for="page in pageInfoList"
                    :key="page.pageIndex"
                    class="page-thumbnail"
                    :class="{ selected: isPageSelected(page.pageIndex + 1) }"
                    @click="togglePageSelection(page.pageIndex + 1)"
                  >
                    <div class="thumbnail-image">
                      <img
                        v-if="pagePreviews[page.pageIndex]"
                        :src="pagePreviews[page.pageIndex]"
                        :alt="`第${page.pageIndex + 1}页`"
                      />
                      <div v-else class="thumbnail-loading">
                        <ElIcon class="animate-spin"><Loading /></ElIcon>
                      </div>
                    </div>
                    <div class="thumbnail-checkbox">
                      <ElCheckbox
                        :model-value="isPageSelected(page.pageIndex + 1)"
                        @change="togglePageSelection(page.pageIndex + 1)"
                      />
                    </div>
                    <span class="thumbnail-number">{{ page.pageIndex + 1 }}</span>
                  </div>
                </div>
              </div>

              <!-- 转换选项 -->
              <div class="options-section">
                <ElDivider content-position="left">转换设置</ElDivider>
                <div class="options-grid">
                  <div class="option-item">
                    <span class="option-label">输出格式</span>
                    <ElSelect v-model="options.format" class="option-select">
                      <ElOption label="JPG" value="jpg" />
                      <ElOption label="PNG" value="png" />
                    </ElSelect>
                  </div>
                  <div class="option-item">
                    <span class="option-label">图片质量(DPI)</span>
                    <ElSelect v-model="options.dpi" class="option-select">
                      <ElOption label="72 DPI (网页)" :value="72" />
                      <ElOption label="150 DPI (标准)" :value="150" />
                      <ElOption label="300 DPI (高清)" :value="300" />
                    </ElSelect>
                  </div>
                  <div class="option-item" v-if="options.format === 'jpg'">
                    <span class="option-label">压缩质量</span>
                    <ElSlider
                      v-model="options.quality"
                      :min="10"
                      :max="100"
                      :step="5"
                      show-input
                      class="option-slider"
                    />
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="file-actions">
                <ElButton type="primary" size="large" @click="handleConvert">
                  开始转换({{ pageSelectionMode === 'all' ? totalPages : selectedPages.length }}页)
                </ElButton>
                <ElButton size="large" @click="clearFile">重新选择</ElButton>
              </div>
            </div>
          </template>

          <!-- 处理中-->
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在转换文档" 
              :percentage="progress.progress"
              icon-from="ri:file-pdf-2-fill"
              icon-to="ri:image-fill"
            >
              <template #default>
                <p class="text-sm text-g-400 mt-2">
                  正在处理第 {{ progress.currentPage }} 页，共 {{ progress.totalPages }} 页
                </p>
              </template>
            </ToolResultView>
          </template>

          <!-- 处理结果 -->
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="转换完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <p class="text-sm text-g-500 mb-4">
                  成功转换 {{ processResult.data?.convertedPages }} 页
                </p>

                <!-- 图片预览网格 -->
                <div class="result-images-grid">
                  <div
                    v-for="image in processResult.data?.images.slice(0, 6)"
                    :key="image.pageIndex"
                    class="result-image-card"
                  >
                    <img :src="getImageUrl(image.blob)" :alt="image.fileName" />
                    <span class="result-image-name">{{ image.fileName }}</span>
                  </div>
                  <div
                    v-if="(processResult.data?.images.length || 0) > 6"
                    class="result-image-more"
                  >
                    +{{ (processResult.data?.images.length || 0) - 6 }} 张
                  </div>
                </div>
              </template>
              <template #actions>
                <ElButton
                  v-if="(processResult.data?.images.length || 0) === 1"
                  type="primary"
                  @click="downloadSingleImage"
                >
                  <ElIcon class="mr-1"><Download /></ElIcon>下载图片
                </ElButton>
                <template v-else>
                  <ElButton type="primary" @click="downloadAllAsZip">
                    <ElIcon class="mr-1"><Download /></ElIcon>下载ZIP压缩包
                  </ElButton>
                  <ElDropdown @command="handleDownloadCommand">
                    <ElButton>
                      单独下载<ElIcon class="ml-1"><ArrowDown /></ElIcon>
                    </ElButton>
                    <template #dropdown>
                      <ElDropdownMenu>
                        <ElDropdownItem
                          v-for="image in processResult.data?.images"
                          :key="image.pageIndex"
                          :command="image"
                        >
                          {{ image.fileName }}
                        </ElDropdownItem>
                      </ElDropdownMenu>
                    </template>
                  </ElDropdown>
                </template>
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
          accept="application/pdf,.pdf"
          hidden
          @change="handleFileSelect"
        />
      </ElCard>
    </PermissionGuard>

    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF转图片工具可以将PDF文件的每一页转换为高质量图片：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持选择全部页面或自定义选择特定页面</li>
          <li>支持JPG和PNG两种输出格式</li>
          <li>支持72/150/300 DPI多种分辨率</li>
          <li>支持自定义JPG压缩质量</li>
          <li>多页可打包为ZIP下载</li>
          <li>所有处理在浏览器本地完成</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onUnmounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    Loading,
    CircleCheck,
    CircleClose,
    Download,
    Close,
    ArrowDown
  } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { useHistory } from '@/hooks/core/useHistory'
  import {
    createPdfToImageProcessor,
    type PdfToImageOptions,
    type ImageFormat,
    type DpiSetting,
    type PdfPageInfo,
    type PageImageResult,
    type PdfToImageResult
  } from '@/processors/pdf/pdf-to-image'

  defineOptions({ name: 'PdfToImagePage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()

  // 使用历史记录hook
  const { addRecord } = useHistory()

  // 状态
  const currentFile = ref<File | null>(null)
  const isDragging = ref(false)
  const isProcessing = ref(false)
  const totalPages = ref(0)
  const pageInfoList = ref<PdfPageInfo[]>([])
  const pagePreviews = ref<Record<number, string>>({})
  const pageSelectionMode = ref<'all' | 'custom'>('all')
  const selectedPages = ref<number[]>([])
  const processResult = ref<{ success: boolean; data?: PdfToImageResult; error?: string } | null>(
    null
  )
  const imageUrls = ref<Map<Blob, string>>(new Map())

  // 进度状态
  const progress = ref({
    progress: 0,
    currentPage: 0,
    totalPages: 0
  })

  // 转换选项
  const options = ref<{
    format: ImageFormat
    dpi: DpiSetting
    quality: number
  }>({
    format: 'jpg',
    dpi: 150,
    quality: 85
  })

  // 处理器实例
  let processor = createPdfToImageProcessor()

  // 计算属性
  const hasFile = computed(() => currentFile.value !== null)

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  // 处理文件选择
  const handleFileSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      await loadPdfFile(input.files[0])
      input.value = ''
    }
  }

  // 拖拽处理
  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    isDragging.value = true
  }

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    isDragging.value = false
  }

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    isDragging.value = false

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        await loadPdfFile(file)
      } else {
        ElMessage.error('请选择PDF文件')
      }
    }
  }

  // 加载PDF文件
  const loadPdfFile = async (file: File) => {
    // 验证文件
    const validation = processor.validate(file)
    if (!validation.valid) {
      ElMessage.error(validation.errors.join('; '))
      return
    }

    currentFile.value = file
    processResult.value = null

    try {
      // 加载PDF并获取页面信息
      totalPages.value = await processor.loadDocument(file)
      pageInfoList.value = await processor.getPageInfoList(file)

      // 重置选择
      pageSelectionMode.value = 'all'
      selectedPages.value = []

      // 加载页面预览
      loadPagePreviews()
    } catch (error) {
      console.error('加载PDF失败:', error)
      ElMessage.error('加载PDF失败，请检查文件是否损坏')
      clearFile()
    }
  }

  // 加载页面预览
  const loadPagePreviews = async () => {
    if (!currentFile.value) return

    pagePreviews.value = {}

    for (let i = 0; i < Math.min(totalPages.value, 20); i++) {
      try {
        const preview = await processor.getPagePreview(currentFile.value, i + 1)
        pagePreviews.value[i] = preview
      } catch (error) {
        console.warn(`加载中{i + 1}页预览失败`, error)
      }
    }
  }

  // 页面选择相关
  const isPageSelected = (pageNumber: number): boolean => {
    return selectedPages.value.includes(pageNumber)
  }

  const togglePageSelection = (pageNumber: number) => {
    const index = selectedPages.value.indexOf(pageNumber)
    if (index === -1) {
      selectedPages.value.push(pageNumber)
      selectedPages.value.sort((a, b) => a - b)
    } else {
      selectedPages.value.splice(index, 1)
    }
  }

  // 清除文件
  const clearFile = () => {
    currentFile.value = null
    totalPages.value = 0
    pageInfoList.value = []
    pagePreviews.value = {}
    selectedPages.value = []
    processResult.value = null
    processor.cleanup()
    processor = createPdfToImageProcessor()
    cleanupImageUrls()
  }

  // 处理转换
  const handleConvert = async () => {
    if (!currentFile.value) {
      ElMessage.warning('请先选择PDF文件')
      return
    }

    const pagesToConvert =
      pageSelectionMode.value === 'all'
        ? 'all'
        : selectedPages.value.length > 0
          ? selectedPages.value
          : 'all'

    if (pageSelectionMode.value === 'custom' && selectedPages.value.length === 0) {
      ElMessage.warning('请至少选择一页')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    isProcessing.value = true
    progress.value = { progress: 0, currentPage: 0, totalPages: 0 }

    try {
      // 重新创建处理中
      processor = createPdfToImageProcessor()

      const convertOptions: PdfToImageOptions = {
        format: options.value.format,
        dpi: options.value.dpi,
        pages: pagesToConvert as 'all' | number[],
        quality: options.value.quality
      }

      const result = await processor.process(
        currentFile.value,
        convertOptions,
        (prog, currentPage, total) => {
          progress.value = {
            progress: prog,
            currentPage,
            totalPages: total
          }
        }
      )

      processResult.value = result

      if (result.success) {
        ElMessage.success('转换完成！')
        // 记录功能使用
        permissionGuardRef.value?.recordUsage()
        // 保存历史记录
        if (result.data) {
          addRecord({
            toolId: 'pdf-to-image',
            toolName: 'PDF转图片',
            fileName: currentFile.value.name,
            outputFileName: `${result.data.convertedPages}张图片`,
            fileSize: currentFile.value.size,
            outputFileSize: result.data.images.reduce((sum, img) => sum + img.blob.size, 0),
            processType: 'convert'
          })
        }
      } else {
        ElMessage.error(result.error || '转换失败')
      }
    } catch (e: any) {
      processResult.value = { success: false, error: e.message || '转换失败' }
      ElMessage.error(e.message || '转换失败')
    } finally {
      isProcessing.value = false
    }
  }

  // 获取图片URL
  const getImageUrl = (blob: Blob): string => {
    if (imageUrls.value.has(blob)) {
      return imageUrls.value.get(blob)!
    }
    const url = URL.createObjectURL(blob)
    imageUrls.value.set(blob, url)
    return url
  }

  // 清理图片URL
  const cleanupImageUrls = () => {
    imageUrls.value.forEach((url) => URL.revokeObjectURL(url))
    imageUrls.value.clear()
  }

  // 下载单张图片
  const downloadSingleImage = () => {
    if (!processResult.value?.data?.images.length) return
    const image = processResult.value.data.images[0]
    processor.downloadImage(
      image,
      `${currentFile.value?.name.replace('.pdf', '')}_${image.fileName}`
    )
  }

  // 下载全部为ZIP
  const downloadAllAsZip = async () => {
    if (!processResult.value?.data?.images.length) return

    try {
      const zipFileName = `${currentFile.value?.name.replace('.pdf', '')}_images.zip`
      const zipBlob = await processor.downloadAsZip(processResult.value.data.images, zipFileName)
      processor.downloadZip(zipBlob, zipFileName)
      ElMessage.success('ZIP下载已开始')
    } catch (error) {
      console.error('ZIP打包失败:', error)
      ElMessage.error('ZIP打包失败')
    }
  }

  // 处理下载命令
  const handleDownloadCommand = (image: PageImageResult) => {
    processor.downloadImage(
      image,
      `${currentFile.value?.name.replace('.pdf', '')}_${image.fileName}`
    )
  }

  // 继续转换
  const handleContinue = () => {
    processResult.value = null
    cleanupImageUrls()
  }

  // 重试
  const handleRetry = () => {
    processResult.value = null
    handleConvert()
  }

  // 监听页面选择模式变化
  watch(pageSelectionMode, (newMode) => {
    if (newMode === 'all') {
      selectedPages.value = []
    }
  })

  // 清理资源
  onUnmounted(() => {
    processor.cleanup()
    cleanupImageUrls()
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

  .file-preview-container {
    width: 100%;
  }

  .pdf-info-card {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 16px;
    margin-bottom: 20px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .pdf-info-text {
    flex: 1;
    text-align: left;
  }

  .pdf-name {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    word-break: break-all;
  }

  .pdf-meta {
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .page-selection-section {
    margin-bottom: 20px;
  }

  .page-selection-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .selected-count {
    font-size: 14px;
    color: var(--el-color-primary);
  }

  .page-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
    max-height: 300px;
    padding: 8px;
    overflow-y: auto;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .page-thumbnail {
    position: relative;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      border-color: var(--el-color-primary-light-5);
    }

    &.selected {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);
    }
  }

  .thumbnail-image {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 3/4;
    background: #fff;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  .thumbnail-loading {
    color: var(--el-text-color-secondary);
  }

  .thumbnail-checkbox {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .thumbnail-number {
    display: block;
    padding: 4px 0;
    font-size: 12px;
    color: var(--el-text-color-regular);
    text-align: center;
    background: var(--el-fill-color);
  }

  .options-section {
    width: 100%;
    max-width: 600px;
    margin: 0 auto 20px;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .option-item {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .option-label {
    min-width: 100px;
    font-size: 14px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  .option-select {
    flex: 1;
  }

  .option-slider {
    flex: 1;
  }

  .file-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .result-images-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    margin-bottom: 16px;
  }

  .result-image-card {
    width: 80px;
    text-align: center;

    img {
      width: 80px;
      height: 100px;
      object-fit: cover;
      border: 1px solid var(--el-border-color);
      border-radius: 4px;
    }
  }

  .result-image-name {
    display: block;
    margin-top: 4px;
    overflow: hidden;
    font-size: 11px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-image-more {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 100px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-lighter);
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

  @media (width <= 640px) {
    .options-grid {
      grid-template-columns: 1fr;
    }

    .page-grid {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    }
  }
</style>
