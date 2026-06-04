<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || 'OCR文字识别'"
      :description="toolDescription || '从扫描版PDF中提取文字，生成可搜索的PDF文档'"
    />
    <PermissionGuard feature-id="pdf-ocr" feature-name="OCR文字识别" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || 'OCR文字识别' }}</span>
        </div>
        <div
          class="upload-area"
          :class="{ 'is-dragging': isDragging, 'has-files': hasFile }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <!-- 上传状态-->
          <template v-if="!hasFile && !isProcessing && !processResult">
            <Icon icon="ri:scan-2-line" class="text-6xl text-[#9333ea] mb-4" />
            <p class="text-base text-g-600 mb-2">将PDF文件拖拽到此处</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">选择PDF文件</ElButton>
            <p class="text-xs text-g-400 mt-3">支持扫描版PDF，最大100MB</p>
          </template>

          <!-- 已选择文件 -->
          <template v-if="hasFile && !isProcessing && !processResult">
            <div class="file-preview">
              <div class="file-icon">
                <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
              </div>
              <div class="file-info">
                <p class="file-name">{{ selectedFile?.name }}</p>
                <p class="file-size">{{ formatFileSize(selectedFile?.size || 0) }}</p>
              </div>
              <ElButton type="danger" text @click="clearFile">
                <ElIcon><Close /></ElIcon>
              </ElButton>
            </div>

            <!-- OCR选项 -->
            <div class="ocr-options">
              <div class="option-group">
                <label class="option-label">识别语言</label>
                <ElCheckboxGroup v-model="options.languages" class="language-checkboxes">
                  <ElCheckbox label="chi_sim">简体中文</ElCheckbox>
                  <ElCheckbox label="chi_tra">繁体中文</ElCheckbox>
                  <ElCheckbox label="eng">英文</ElCheckbox>
                </ElCheckboxGroup>
              </div>

              <div class="option-group">
                <label class="option-label">页面选择</label>
                <ElRadioGroup v-model="pageSelection" class="page-selection">
                  <ElRadio label="all">全部页面</ElRadio>
                  <ElRadio label="custom">指定页面</ElRadio>
                </ElRadioGroup>
                <ElInput
                  v-if="pageSelection === 'custom'"
                  v-model="customPages"
                  placeholder="例如: 1,3,5-10"
                  class="mt-2 max-w-xs"
                />
              </div>

              <div class="option-group">
                <label class="option-label">输出格式</label>
                <ElRadioGroup v-model="options.outputType">
                  <ElRadio label="searchable-pdf">可搜索PDF</ElRadio>
                  <ElRadio label="text-only">仅文本</ElRadio>
                </ElRadioGroup>
              </div>

              <div class="option-group">
                <label class="option-label">识别质量</label>
                <ElSelect v-model="options.dpi" class="max-w-xs">
                  <ElOption :value="150" label="标准 (150 DPI)" />
                  <ElOption :value="300" label="高质量 (300 DPI)" />
                  <ElOption :value="600" label="最高质量 (600 DPI)" />
                </ElSelect>
              </div>
            </div>

            <div class="action-buttons">
              <ElButton
                type="primary"
                size="large"
                @click="handleOcr"
                :disabled="options.languages.length === 0"
              >
                <ElIcon class="mr-1"><VideoPlay /></ElIcon>
                开始识别
              </ElButton>
              <ElButton size="large" @click="clearFile">重新选择</ElButton>
            </div>
          </template>

          <!-- 处理中-->
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在识别文档" 
              :percentage="progress"
              icon-from="ri:file-pdf-2-fill"
              icon-to="ri:file-text-fill"
              tip-text="正在使用OCR技术识别文字，请保持页面打开"
            />
          </template>

          <!-- 处理结果 -->
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="识别完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon
                    :icon="
                      options.outputType === 'searchable-pdf'
                        ? 'ri:file-pdf-2-fill'
                        : 'ri:file-text-fill'
                    "
                    class="text-5xl"
                    :class="
                      options.outputType === 'searchable-pdf' ? 'text-danger' : 'text-primary'
                    "
                  />
                  <p class="result-file-name">{{ outputFileName }}</p>
                </div>

                <!-- 识别结果统计 -->
                <div v-if="ocrResult" class="ocr-stats mb-4">
                  <div class="stat-item">
                    <span class="stat-label">识别置信度</span>
                    <span class="stat-value" :class="getConfidenceClass(ocrResult.confidence)">
                      {{ ocrResult.confidence }}%
                    </span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">处理页数</span>
                    <span class="stat-value">{{ ocrResult.pageResults?.length || 0 }} 页</span>
                  </div>
                </div>

                <!-- 低置信度警告 -->
                <div v-if="hasLowConfidencePages" class="low-confidence-warning mb-4">
                  <ElAlert type="warning" :closable="false">
                    <template #title> 部分页面识别置信度较低，建议人工审核 </template>
                  </ElAlert>
                </div>
              </template>
              <template #actions>
                <ElButton type="primary" @click="downloadResult">
                  <ElIcon class="mr-1"><Download /></ElIcon>
                  下载{{ options.outputType === 'searchable-pdf' ? 'PDF' : '文本' }}
                </ElButton>
                <ElButton v-if="ocrResult?.text" @click="showTextPreview = true">
                  <ElIcon class="mr-1"><View /></ElIcon>
                  预览文本
                </ElButton>
                <ElButton @click="handleContinue">继续识别</ElButton>
              </template>
            </ToolResultView>
            <ToolResultView
              v-else
              type="error"
              title="识别失败"
              :message="processResult.error || '识别失败，请重试'"
              @retry="handleRetry"
              @reset="handleContinue"
            />
          </template>
        </div>
        <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
      </ElCard>
    </PermissionGuard>

    <!-- 文本预览弹窗 -->
    <ElDialog v-model="showTextPreview" title="识别文本预览" width="70%" top="5vh">
      <div class="text-preview-content">
        <pre class="whitespace-pre-wrap text-sm">{{ ocrResult?.text }}</pre>
      </div>
      <template #footer>
        <ElButton @click="copyText">
          <ElIcon class="mr-1"><CopyDocument /></ElIcon>
          复制文本
        </ElButton>
        <ElButton type="primary" @click="showTextPreview = false">关闭</ElButton>
      </template>
    </ElDialog>

    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">OCR文字识别工具可以从扫描版PDF中提取文字：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持简体中文、繁体中文和英文识别</li>
          <li>可生成可搜索的PDF或纯文本</li>
          <li>支持选择特定页面进行识别</li>
          <li>显示识别置信度，标记低置信度区域</li>
          <li>单个文件最大100MB</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    Loading,
    CircleClose,
    Download,
    Close,
    VideoPlay,
    View,
    CopyDocument
  } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { useHistory } from '@/hooks/core/useHistory'
  import {
    submitOcrTask,
    pollOcrTaskUntilComplete,
    downloadOcrResult,
    getOcrTextResult,
    TaskStatus,
    OcrOutputType,
    type OcrTask,
    type OcrResult
  } from '@/api/ocr'

  defineOptions({ name: 'OcrPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const selectedFile = ref<File | null>(null)
  const isDragging = ref(false)
  const isProcessing = ref(false)
  const progress = ref(0)
  const statusText = ref('')
  const processResult = ref<{ success: boolean; error?: string; blob?: Blob } | null>(null)
  const currentTask = ref<OcrTask | null>(null)
  const ocrResult = ref<OcrResult | null>(null)
  const showTextPreview = ref(false)
  const { addRecord } = useHistory()

  const pageSelection = ref<'all' | 'custom'>('all')
  const customPages = ref('')

  const options = ref({
    languages: ['chi_sim', 'eng'],
    outputType: OcrOutputType.SEARCHABLE_PDF,
    dpi: 300
  })

  const hasFile = computed(() => !!selectedFile.value)
  const outputFileName = computed(() => {
    if (!selectedFile.value) return 'output.pdf'
    const name = selectedFile.value.name.replace(/\.pdf$/i, '')
    const ext = options.value.outputType === OcrOutputType.SEARCHABLE_PDF ? '.pdf' : '.txt'
    return `${name}_ocr${ext}`
  })

  const hasLowConfidencePages = computed(() => {
    if (!ocrResult.value?.pageResults) return false
    return ocrResult.value.pageResults.some((p) => p.confidence < 70)
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getConfidenceClass = (confidence: number): string => {
    if (confidence >= 90) return 'text-success'
    if (confidence >= 70) return 'text-warning'
    return 'text-danger'
  }

  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const handleFileSelect = (_e: Event) => {
    const input = _e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]
      if (validateFile(file)) {
        selectedFile.value = file
      }
      input.value = ''
    }
  }

  const validateFile = (file: File): boolean => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      ElMessage.error('请选择PDF文件')
      return false
    }

    if (file.size > 100 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过100MB')
      return false
    }

    return true
  }

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = true
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = false
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = false

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      const file = files[0]
      if (validateFile(file)) {
        selectedFile.value = file
      }
    }
  }

  const clearFile = () => {
    selectedFile.value = null
    processResult.value = null
    ocrResult.value = null
  }

  const parsePages = (): number[] | 'all' => {
    if (pageSelection.value === 'all') return 'all'

    const pages: number[] = []
    const parts = customPages.value.split(',')

    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map((n) => parseInt(n.trim(), 10))
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (!pages.includes(i)) pages.push(i)
          }
        }
      } else {
        const num = parseInt(trimmed, 10)
        if (!isNaN(num) && !pages.includes(num)) {
          pages.push(num)
        }
      }
    }

    return pages.length > 0 ? pages.sort((a, b) => a - b) : 'all'
  }

  const handleOcr = async () => {
    if (!selectedFile.value) return
    if (options.value.languages.length === 0) {
      ElMessage.warning('请至少选择一种识别语言')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    isProcessing.value = true
    progress.value = 0
    statusText.value = '正在上传文件...'
    ocrResult.value = null

    try {
      // Submit OCR task
      const task = await submitOcrTask(selectedFile.value, {
        languages: options.value.languages,
        pages: parsePages(),
        outputType: options.value.outputType as OcrOutputType,
        dpi: options.value.dpi
      })

      currentTask.value = task
      statusText.value = '正在识别...'

      // Poll for completion
      const completedTask = await pollOcrTaskUntilComplete(task.taskId, (t) => {
        progress.value = t.progress
        if (t.status === TaskStatus.PROCESSING) {
          if (t.currentPage && t.totalPages) {
            statusText.value = `正在识别第 ${t.currentPage} / ${t.totalPages} 页... ${t.progress}%`
          } else {
            statusText.value = `正在识别... ${t.progress}%`
          }
        }
      })

      if (completedTask.status === TaskStatus.COMPLETED) {
        // Download the result
        statusText.value = '正在下载结果...'
        const blob = await downloadOcrResult(completedTask.taskId)

        // Get text result for preview
        try {
          ocrResult.value = await getOcrTextResult(completedTask.taskId)
        } catch {
          // Text result may not be available for all output types
        }

        processResult.value = { success: true, blob }
        ElMessage.success('识别完成！')

        // Record usage
        permissionGuardRef.value?.recordUsage()

        // Add to history
        addRecord({
          toolId: 'pdf-ocr',
          toolName: 'OCR文字识别',
          fileName: selectedFile.value.name,
          outputFileName: outputFileName.value,
          fileSize: selectedFile.value.size,
          outputFileSize: blob.size,
          processType: 'ocr',
          downloadUrl: URL.createObjectURL(blob)
        })
      } else {
        processResult.value = {
          success: false,
          error: completedTask.error || 'OCR识别失败'
        }
      }
    } catch (error: any) {
      processResult.value = {
        success: false,
        error: error.message || 'OCR识别失败，请稍后重试'
      }
    } finally {
      isProcessing.value = false
    }
  }

  const downloadResult = () => {
    if (!processResult.value?.blob) return

    const url = URL.createObjectURL(processResult.value.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = outputFileName.value
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyText = async () => {
    if (!ocrResult.value?.text) return

    try {
      await navigator.clipboard.writeText(ocrResult.value.text)
      ElMessage.success('文本已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }

  const handleContinue = () => {
    selectedFile.value = null
    processResult.value = null
    currentTask.value = null
    ocrResult.value = null
  }

  const handleRetry = () => {
    processResult.value = null
    handleOcr()
  }
</script>

<style scoped lang="scss">
  @import '../shared-styles';

  .ocr-options {
    @apply w-full max-w-lg mt-4 space-y-4;
  }

  .option-group {
    @apply flex flex-col gap-2;
  }

  .option-label {
    @apply text-sm font-medium text-g-700;
  }

  .language-checkboxes {
    @apply flex flex-wrap gap-4;
  }

  .page-selection {
    @apply flex gap-4;
  }

  .ocr-stats {
    @apply flex gap-6 justify-center;
  }

  .stat-item {
    @apply flex flex-col items-center;
  }

  .stat-label {
    @apply text-xs text-g-400;
  }

  .stat-value {
    @apply text-lg font-semibold;
  }

  .low-confidence-warning {
    @apply w-full max-w-md;
  }

  .text-preview-content {
    @apply max-h-[60vh] overflow-auto bg-g-50 p-4 rounded;
  }
</style>
