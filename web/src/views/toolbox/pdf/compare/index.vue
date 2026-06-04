<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || 'PDF文档比较'"
      :description="toolDescription || '比较两个PDF文档，识别文档版本之间的差异'"
    />
    <PermissionGuard feature-id="pdf-compare" feature-name="PDF文档比较" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || 'PDF文档比较' }}</span>
        </div>
        <div class="upload-area" :class="{ 'has-files': hasFiles }">
          <!-- 上传区域 -->
          <template v-if="!hasFiles && !isProcessing && !comparisonResult">
            <div class="dual-upload">
              <div
                class="upload-box"
                :class="{ 'is-dragging': isDragging1, 'has-file': file1 }"
                @dragenter="handleDragEnter1"
                @dragleave="handleDragLeave1"
                @dragover="handleDragOver"
                @drop="handleDrop1"
                @click="triggerFileSelect1"
              >
                <template v-if="!file1">
                  <Icon icon="ri:file-pdf-2-line" class="text-4xl text-g-400 mb-2" />
                  <p class="text-sm text-g-600 mb-1">原始文件</p>
                  <p class="text-xs text-g-400">拖拽或点击上传</p>
                </template>
                <template v-else>
                  <Icon icon="ri:file-pdf-2-fill" class="text-4xl text-danger mb-2" />
                  <p class="text-sm text-g-600 truncate max-w-full px-2">{{ file1.name }}</p>
                  <p class="text-xs text-g-400">{{ formatFileSize(file1.size) }}</p>
                  <ElButton size="small" type="danger" plain class="mt-2" @click.stop="clearFile1">
                    移除
                  </ElButton>
                </template>
              </div>
              <div class="compare-arrow">
                <Icon icon="ri:arrow-left-right-line" class="text-2xl text-g-400" />
              </div>
              <div
                class="upload-box"
                :class="{ 'is-dragging': isDragging2, 'has-file': file2 }"
                @dragenter="handleDragEnter2"
                @dragleave="handleDragLeave2"
                @dragover="handleDragOver"
                @drop="handleDrop2"
                @click="triggerFileSelect2"
              >
                <template v-if="!file2">
                  <Icon icon="ri:file-pdf-2-line" class="text-4xl text-g-400 mb-2" />
                  <p class="text-sm text-g-600 mb-1">比较文件</p>
                  <p class="text-xs text-g-400">拖拽或点击上传</p>
                </template>
                <template v-else>
                  <Icon icon="ri:file-pdf-2-fill" class="text-4xl text-primary mb-2" />
                  <p class="text-sm text-g-600 truncate max-w-full px-2">{{ file2.name }}</p>
                  <p class="text-xs text-g-400">{{ formatFileSize(file2.size) }}</p>
                  <ElButton size="small" type="danger" plain class="mt-2" @click.stop="clearFile2">
                    移除
                  </ElButton>
                </template>
              </div>
            </div>
            <ElButton
              type="primary"
              size="large"
              class="mt-6"
              :disabled="!file1 || !file2"
              @click="handleCompare"
            >
              <ElIcon class="mr-1"><Search /></ElIcon>开始比较
            </ElButton>
          </template>

          <!-- 处理中-->
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在比较文档" 
              :percentage="progress"
              icon-from="ri:file-pdf-2-fill"
              icon-to="ri:file-pdf-2-fill"
            >
              <template #default>
                <p class="text-sm text-g-400 mt-2">{{ progressMessage }}</p>
              </template>
            </ToolResultView>
          </template>

          <!-- 比较结果 -->
          <template v-if="comparisonResult && !isProcessing">
            <div class="comparison-view">
              <!-- 结果概要 -->
              <div class="result-summary">
                <div class="summary-item">
                  <span class="summary-label">总变更</span>
                  <span class="summary-value">{{ comparisonResult.totalChanges }}</span>
                </div>
                <div class="summary-item addition">
                  <span class="summary-label">新增</span>
                  <span class="summary-value">{{ comparisonResult.additions.length }}</span>
                </div>
                <div class="summary-item deletion">
                  <span class="summary-label">删除</span>
                  <span class="summary-value">{{ comparisonResult.deletions.length }}</span>
                </div>
                <div class="summary-item modification">
                  <span class="summary-label">修改</span>
                  <span class="summary-value">{{ comparisonResult.modifications.length }}</span>
                </div>
              </div>

              <!-- 页面导航 -->
              <div class="page-navigation">
                <ElButton size="small" :disabled="currentPage <= 1" @click="currentPage--">
                  <ElIcon><ArrowLeft /></ElIcon>
                </ElButton>
                <span class="page-info">第 {{ currentPage }} 页 / 共 {{ maxPages }} 页</span>
                <ElButton size="small" :disabled="currentPage >= maxPages" @click="currentPage++">
                  <ElIcon><ArrowRight /></ElIcon>
                </ElButton>
              </div>

              <!-- 并排比较视图 -->
              <div class="side-by-side-view">
                <div class="view-panel left-panel">
                  <div class="panel-header">
                    <span class="panel-title">原始文件</span>
                    <span class="file-name">{{ file1?.name }}</span>
                  </div>
                  <div class="panel-content" ref="leftPanelRef">
                    <img
                      v-if="sideBySideView?.left"
                      :src="sideBySideView.left"
                      class="page-image"
                      alt="原始文件页面"
                    />
                    <!-- 删除高亮 -->
                    <div
                      v-for="highlight in deletionHighlights"
                      :key="highlight.id"
                      class="highlight deletion"
                      :style="getHighlightStyle(highlight)"
                      @click="scrollToChange(highlight.id)"
                    ></div>
                    <!-- 修改高亮 -->
                    <div
                      v-for="highlight in modificationHighlightsLeft"
                      :key="highlight.id"
                      class="highlight modification"
                      :style="getHighlightStyle(highlight)"
                      @click="scrollToChange(highlight.id)"
                    ></div>
                  </div>
                </div>
                <div class="view-panel right-panel">
                  <div class="panel-header">
                    <span class="panel-title">比较文件</span>
                    <span class="file-name">{{ file2?.name }}</span>
                  </div>
                  <div class="panel-content" ref="rightPanelRef">
                    <img
                      v-if="sideBySideView?.right"
                      :src="sideBySideView.right"
                      class="page-image"
                      alt="比较文件页面"
                    />
                    <!-- 新增高亮 -->
                    <div
                      v-for="highlight in additionHighlights"
                      :key="highlight.id"
                      class="highlight addition"
                      :style="getHighlightStyle(highlight)"
                      @click="scrollToChange(highlight.id)"
                    ></div>
                    <!-- 修改高亮 -->
                    <div
                      v-for="highlight in modificationHighlightsRight"
                      :key="highlight.id"
                      class="highlight modification"
                      :style="getHighlightStyle(highlight)"
                      @click="scrollToChange(highlight.id)"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- 差异列表 -->
              <div class="changes-list" v-if="currentPageChanges.length > 0">
                <h4 class="list-title">当前页变更({{ currentPageChanges.length }})</h4>
                <div class="changes-scroll">
                  <div
                    v-for="change in currentPageChanges"
                    :key="change.id"
                    class="change-item"
                    :class="change.changeType"
                    :id="`change-${change.id}`"
                  >
                    <div class="change-badge" :class="change.changeType">
                      {{ getChangeTypeLabel(change.changeType) }}
                    </div>
                    <div class="change-content">
                      {{ change.content.substring(0, 100)
                      }}{{ change.content.length > 100 ? '...' : '' }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="result-actions">
                <ElButton type="primary" @click="downloadReport">
                  <ElIcon class="mr-1"><Download /></ElIcon>下载比较报告
                </ElButton>
                <ElButton @click="handleReset">重新比较</ElButton>
              </div>
            </div>
          </template>
        </div>
        <input ref="fileInput1Ref" type="file" accept=".pdf" hidden @change="handleFileSelect1" />
        <input ref="fileInput2Ref" type="file" accept=".pdf" hidden @change="handleFileSelect2" />
      </ElCard>
    </PermissionGuard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF文档比较工具可以帮助您识别两个PDF文档之间的差异：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持检测文字的添加、删除和修改</li>
          <li>支持检测页数和布局变化</li>
          <li>提供并排比较视图，直观展示差异</li>
          <li>支持在差异之间快速导航</li>
          <li>可导出详细的比较报告</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Loading, Download, Search, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import { pdfjsLib, getDocumentOptions } from '@/utils/pdfjs-config'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { useHistory } from '@/hooks/core/useHistory'
  import {
    createCompareProcessor,
    type ComparisonResult,
    type SideBySideView,
    type Highlight,
    type ChangeType
  } from '@/processors/pdf/compare'

  defineOptions({ name: 'PdfComparePage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  // Refs
  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInput1Ref = ref<HTMLInputElement>()
  const fileInput2Ref = ref<HTMLInputElement>()
  const leftPanelRef = ref<HTMLDivElement>()
  const rightPanelRef = ref<HTMLDivElement>()

  const { addRecord } = useHistory()

  // State
  const file1 = ref<File | null>(null)
  const file2 = ref<File | null>(null)
  const isDragging1 = ref(false)
  const isDragging2 = ref(false)
  const isProcessing = ref(false)
  const progress = ref(0)
  const progressMessage = ref('正在处理...')
  const comparisonResult = ref<ComparisonResult | null>(null)
  const sideBySideView = ref<SideBySideView | null>(null)
  const currentPage = ref(1)

  // Computed
  const hasFiles = computed(() => file1.value && file2.value && comparisonResult.value)

  const maxPages = computed(() => {
    if (!comparisonResult.value) return 1
    return Math.max(comparisonResult.value.file1PageCount, comparisonResult.value.file2PageCount)
  })

  const currentPageChanges = computed(() => {
    if (!comparisonResult.value) return []
    const pageIndex = currentPage.value - 1
    return [
      ...comparisonResult.value.additions.filter((c) => c.pageIndex === pageIndex),
      ...comparisonResult.value.deletions.filter((c) => c.pageIndex === pageIndex),
      ...comparisonResult.value.modifications.filter((c) => c.pageIndex === pageIndex)
    ]
  })

  const additionHighlights = computed(() => {
    if (!sideBySideView.value) return []
    return sideBySideView.value.highlights.filter((h) => h.changeType === 'addition')
  })

  const deletionHighlights = computed(() => {
    if (!sideBySideView.value) return []
    return sideBySideView.value.highlights.filter((h) => h.changeType === 'deletion')
  })

  const modificationHighlightsLeft = computed(() => {
    if (!sideBySideView.value) return []
    return sideBySideView.value.highlights.filter((h) => h.changeType === 'modification')
  })

  const modificationHighlightsRight = computed(() => {
    if (!sideBySideView.value) return []
    return sideBySideView.value.highlights.filter((h) => h.changeType === 'modification')
  })

  // Methods
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const triggerFileSelect1 = () => {
    if (!file1.value) {
      fileInput1Ref.value?.click()
    }
  }

  const triggerFileSelect2 = () => {
    if (!file2.value) {
      fileInput2Ref.value?.click()
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter1 = (e: DragEvent) => {
    e.preventDefault()
    isDragging1.value = true
  }

  const handleDragLeave1 = (e: DragEvent) => {
    e.preventDefault()
    isDragging1.value = false
  }

  const handleDrop1 = (e: DragEvent) => {
    e.preventDefault()
    isDragging1.value = false
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      const f = files[0]
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        file1.value = f
      } else {
        ElMessage.warning('请上传PDF文件')
      }
    }
  }

  const handleDragEnter2 = (e: DragEvent) => {
    e.preventDefault()
    isDragging2.value = true
  }

  const handleDragLeave2 = (e: DragEvent) => {
    e.preventDefault()
    isDragging2.value = false
  }

  const handleDrop2 = (e: DragEvent) => {
    e.preventDefault()
    isDragging2.value = false
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      const f = files[0]
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        file2.value = f
      } else {
        ElMessage.warning('请上传PDF文件')
      }
    }
  }

  const handleFileSelect1 = (_e: Event) => {
    const input = _e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      file1.value = input.files[0]
    }
    input.value = ''
  }

  const handleFileSelect2 = (_e: Event) => {
    const input = _e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      file2.value = input.files[0]
    }
    input.value = ''
  }

  const clearFile1 = () => {
    file1.value = null
  }

  const clearFile2 = () => {
    file2.value = null
  }

  const handleCompare = async () => {
    if (!file1.value || !file2.value) {
      ElMessage.warning('请上传两个PDF文件')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    isProcessing.value = true
    progress.value = 0
    progressMessage.value = '正在比较文档...'

    try {
      const processor = createCompareProcessor()
      const result = await processor.compare(file1.value, file2.value, (prog, msg) => {
        progress.value = prog
        progressMessage.value = msg
      })

      if (result.success && result.data) {
        comparisonResult.value = result.data
        currentPage.value = 1
        await loadSideBySideView(1)

        ElMessage.success(`比较完成，发现 ${result.data.totalChanges} 处变更`)
        permissionGuardRef.value?.recordUsage()

        addRecord({
          toolId: 'pdf-compare',
          toolName: 'PDF文档比较',
          fileName: `${file1.value.name} vs ${file2.value.name}`,
          outputFileName: 'comparison_report.md',
          fileSize: file1.value.size + file2.value.size,
          outputFileSize: 0,
          processType: 'compare'
        })
      } else {
        ElMessage.error(result.error || '比较失败')
      }
    } catch (e: any) {
      ElMessage.error(e.message || '比较失败')
    } finally {
      isProcessing.value = false
    }
  }

  const loadSideBySideView = async (pageNum: number) => {
    if (!file1.value || !file2.value) return

    try {
      const processor = createCompareProcessor()
      sideBySideView.value = await processor.getSideBySideView(
        file1.value,
        file2.value,
        pageNum - 1,
        comparisonResult.value || undefined
      )
    } catch (e) {
      console.error('加载并排视图失败:', e)
    }
  }

  // Watch page changes
  watch(currentPage, async (newPage) => {
    await loadSideBySideView(newPage)
  })

  const getHighlightStyle = (highlight: Highlight) => {
    return {
      left: `${highlight.x}%`,
      top: `${highlight.y}%`,
      width: `${Math.max(highlight.width, 2)}%`,
      height: `${Math.max(highlight.height, 1)}%`
    }
  }

  const getChangeTypeLabel = (type: ChangeType): string => {
    switch (type) {
      case 'addition':
        return '新增'
      case 'deletion':
        return '删除'
      case 'modification':
        return '修改'
      default:
        return '变更'
    }
  }

  const scrollToChange = (id: string) => {
    const element = document.getElementById(`change-${id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('highlight-flash')
      setTimeout(() => element.classList.remove('highlight-flash'), 1000)
    }
  }

  const downloadReport = async () => {
    if (!comparisonResult.value) return

    try {
      const processor = createCompareProcessor()
      const reportBlob = await processor.generateReport(comparisonResult.value)

      const url = URL.createObjectURL(reportBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pdf_comparison_report.md'
      a.click()
      URL.revokeObjectURL(url)

      ElMessage.success('报告下载成功')
    } catch {
      ElMessage.error('生成报告失败')
    }
  }

  const handleReset = () => {
    file1.value = null
    file2.value = null
    comparisonResult.value = null
    sideBySideView.value = null
    currentPage.value = 1
    progress.value = 0
  }
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
    padding: 40px 20px;
    text-align: center;
    border: 2px dashed var(--el-border-color);
    border-radius: var(--custom-radius);
    transition: all 0.3s;

    &.has-files {
      padding: 24px;
      border: none;
      background: transparent;
    }
  }

  .dual-upload {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: center;
    justify-content: center;
  }

  .upload-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 200px;
    height: 200px;
    padding: 16px;
    cursor: pointer;
    border: 2px dashed var(--el-border-color);
    border-radius: 12px;
    transition: all 0.3s;

    &:hover,
    &.is-dragging {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }

    &.has-file {
      cursor: default;
      border-color: var(--el-border-color);
      border-style: solid;
    }
  }

  .compare-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .comparison-view {
    width: 100%;
  }

  .result-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    justify-content: center;
    margin-bottom: 20px;
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
    padding: 12px 24px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;

    &.addition {
      background: var(--el-color-success-light-9);

      .summary-value {
        color: var(--el-color-success);
      }
    }

    &.deletion {
      background: var(--el-color-danger-light-9);

      .summary-value {
        color: var(--el-color-danger);
      }
    }

    &.modification {
      background: var(--el-color-warning-light-9);

      .summary-value {
        color: var(--el-color-warning);
      }
    }
  }

  .summary-label {
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .summary-value {
    font-size: 24px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .page-navigation {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .page-info {
    min-width: 120px;
    font-size: 14px;
    color: var(--el-text-color-regular);
    text-align: center;
  }

  .side-by-side-view {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;

    @media (width <= 900px) {
      flex-direction: column;
    }
  }

  .view-panel {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--el-fill-color-lighter);
    border-bottom: 1px solid var(--el-border-color);
  }

  .panel-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .file-name {
    max-width: 150px;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .panel-content {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 400px;
    max-height: 600px;
    padding: 16px;
    overflow: auto;
    background: var(--el-fill-color-lighter);
  }

  .page-image {
    max-width: 100%;
    height: auto;
    box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
  }

  .highlight {
    position: absolute;
    pointer-events: auto;
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.6;
    }

    &.addition {
      background: var(--el-color-success);
    }

    &.deletion {
      background: var(--el-color-danger);
    }

    &.modification {
      background: var(--el-color-warning);
    }
  }

  .changes-list {
    padding: 16px;
    margin-bottom: 20px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .list-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .changes-scroll {
    max-height: 200px;
    overflow-y: auto;
  }

  .change-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 10px 12px;
    margin-bottom: 8px;
    background: var(--el-bg-color);
    border-radius: 6px;
    transition: background 0.3s;

    &:last-child {
      margin-bottom: 0;
    }

    &.highlight-flash {
      background: var(--el-color-primary-light-9);
    }
  }

  .change-badge {
    flex-shrink: 0;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 4px;

    &.addition {
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
    }

    &.deletion {
      color: var(--el-color-danger);
      background: var(--el-color-danger-light-9);
    }

    &.modification {
      color: var(--el-color-warning);
      background: var(--el-color-warning-light-9);
    }
  }

  .change-content {
    flex: 1;
    font-size: 13px;
    color: var(--el-text-color-regular);
    word-break: break-all;
  }

  .result-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
</style>
