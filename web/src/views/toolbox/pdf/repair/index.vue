<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || 'PDF修复'"
      :description="toolDescription || '修复损坏的PDF文件，恢复文档内容'"
    />
    <PermissionGuard feature-id="pdf-repair" feature-name="PDF修复" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || 'PDF修复' }}</span>
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
            <ElButton type="primary" @click="triggerFileSelect">点击上传文件(小于200M)</ElButton>
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
                  <p class="file-card-size">{{ formatFileSize(file.size) }}</p>
                </div>
              </div>

              <!-- 诊断结果 -->
              <div v-if="diagnosisResult" class="diagnosis-section">
                <h4 class="section-title">
                  <ElIcon class="mr-2"><Document /></ElIcon>
                  诊断结果
                </h4>
                <div
                  class="diagnosis-summary"
                  :class="diagnosisResult.isCorrupted ? 'corrupted' : 'healthy'"
                >
                  <ElIcon class="summary-icon">
                    <WarningFilled v-if="diagnosisResult.isCorrupted" />
                    <SuccessFilled v-else />
                  </ElIcon>
                  <span>{{ diagnosisResult.summary }}</span>
                </div>

                <div v-if="diagnosisResult.issues.length > 0" class="issues-list">
                  <div
                    v-for="(issue, index) in diagnosisResult.issues"
                    :key="index"
                    class="issue-item"
                    :class="issue.severity"
                  >
                    <span class="issue-severity">{{ getSeverityText(issue.severity) }}</span>
                    <span class="issue-desc">{{ issue.description }}</span>
                    <span v-if="issue.repairable" class="issue-repairable">可修复</span>
                    <span v-else class="issue-unrepairable">无法修复</span>
                  </div>
                </div>

                <div class="diagnosis-info">
                  <div class="info-item">
                    <span class="info-label">页数:</span>
                    <span class="info-value">{{ diagnosisResult.pageCount || '未知' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">文件大小:</span>
                    <span class="info-value">{{ formatFileSize(diagnosisResult.fileSize) }}</span>
                  </div>
                  <div v-if="diagnosisResult.pdfVersion" class="info-item">
                    <span class="info-label">PDF版本:</span>
                    <span class="info-value">{{ diagnosisResult.pdfVersion }}</span>
                  </div>
                </div>
              </div>

              <!-- 修复选项 -->
              <div v-if="diagnosisResult?.canRepair" class="repair-options">
                <h4 class="section-title">
                  <ElIcon class="mr-2"><Setting /></ElIcon>
                  修复选项
                </h4>
                <div class="option-group">
                  <div class="option-item">
                    <span class="option-label">修复级别</span>
                    <ElRadioGroup v-model="repairOptions.repairLevel">
                      <ElRadio value="light">轻度修复</ElRadio>
                      <ElRadio value="deep">深度修复</ElRadio>
                    </ElRadioGroup>
                  </div>
                  <p class="option-hint">
                    <ElIcon class="mr-1"><InfoFilled /></ElIcon>
                    轻度修复速度快，深度修复可恢复更多内容但耗时较长
                  </p>
                </div>
              </div>

              <div class="file-actions">
                <ElButton
                  v-if="!diagnosisResult"
                  type="primary"
                  size="large"
                  @click="handleDiagnose"
                >
                  <ElIcon class="mr-1"><Search /></ElIcon>诊断文件
                </ElButton>
                <ElButton
                  v-else-if="diagnosisResult.canRepair && diagnosisResult.isCorrupted"
                  type="primary"
                  size="large"
                  @click="handleRepair"
                >
                  <ElIcon class="mr-1"><Tools /></ElIcon>开始修改
                </ElButton>
                <ElButton
                  v-else-if="!diagnosisResult.isCorrupted"
                  type="success"
                  size="large"
                  @click="handleDownloadOriginal"
                >
                  <ElIcon class="mr-1"><Download /></ElIcon>下载原文档
                </ElButton>
                <ElButton size="large" @click="clearAllFiles">清空</ElButton>
              </div>
            </div>
          </template>
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在修复文档" 
              :percentage="progress.progress"
              icon-from="ri:file-pdf-2-fill"
              icon-to="ri:file-pdf-2-fill"
            >
              <template #default>
                <p class="text-sm text-g-400 mt-2">{{ progressMessage }}</p>
              </template>
            </ToolResultView>
          </template>
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="修复完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                  <div class="result-badge success">
                    <ElIcon class="mr-1"><SuccessFilled /></ElIcon>已修复
                  </div>
                  <p class="result-file-name">{{ resultFileName }}</p>
                </div>

                <!-- 修复统计 -->
                <div class="repair-stats">
                  <div class="stat-item">
                    <span class="stat-label">恢复页数:</span>
                    <span class="stat-value">{{ processResult.data?.recoveredPages || 0 }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">原始大小:</span>
                    <span class="stat-value">{{
                      formatFileSize(processResult.data?.originalSize || 0)
                    }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">修复后大小:</span>
                    <span class="stat-value">{{
                      formatFileSize(processResult.data?.repairedSize || 0)
                    }}</span>
                  </div>
                </div>

                <!-- 修复日志 -->
                <div v-if="processResult.data?.repairLog?.length" class="repair-log">
                  <h4 class="log-title">修复日志</h4>
                  <div class="log-content">
                    <p
                      v-for="(log, index) in processResult.data.repairLog"
                      :key="index"
                      class="log-item"
                    >
                      {{ log }}
                    </p>
                  </div>
                </div>

                <!-- 丢失内容警告 -->
                <div v-if="processResult.data?.lostContent?.length" class="lost-content-warning">
                  <ElAlert title="部分内容无法恢复" type="warning" :closable="false" show-icon>
                    <template #default>
                      <ul class="lost-list">
                        <li v-for="(item, index) in processResult.data.lostContent" :key="index">
                          {{ item }}
                        </li>
                      </ul>
                    </template>
                  </ElAlert>
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
              title="修复失败"
              :message="processResult.error || '修复失败，请重试'"
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
        <p class="mb-3">PDF修复工具可以尝试修复损坏的PDF文件。</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>自动诊断PDF文件的损坏情况</li>
          <li>尝试恢复文件结构和内容</li>
          <li>支持轻度修复和深度修复两种模式</li>
          <li>显示详细的诊断报告和修复日志</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
        <p class="mt-3 text-warning">
          <ElIcon class="mr-1"><Warning /></ElIcon>
          严重损坏的文件可能无法完全恢复，建议保留原始文件备份
        </p>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onUnmounted, h, defineComponent } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    Loading,
    CircleClose,
    Download,
    Close,
    InfoFilled,
    Warning,
    Search,
    Setting,
    Document,
    WarningFilled,
    SuccessFilled
  } from '@element-plus/icons-vue'
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
    createRepairProcessor,
    defaultRepairOptions,
    type DiagnosisResult,
    type RepairResult,
    type IssueSeverity
  } from '@/processors/pdf/repair'

  // Custom Tools icon component
  const Tools = defineComponent({
    name: 'Tools',
    render() {
      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: '0 0 24 24',
          fill: 'currentColor',
          width: '1em',
          height: '1em'
        },
        [
          h('path', {
            d: 'M5.33 3.27a4.07 4.07 0 0 1 5.74 5.74l9.66 9.66-2.83 2.83-9.66-9.66a4.07 4.07 0 0 1-5.74-5.74l2.83 2.83 1.41-1.41-2.83-2.83zm10.61 1.41l2.83 2.83-1.41 1.41-2.83-2.83 1.41-1.41zm-5.66 5.66l2.83 2.83-1.41 1.41-2.83-2.83 1.41-1.41z'
          })
        ]
      )
    }
  })

  defineOptions({ name: 'PdfRepairPage' })

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
    clearFiles
  } = useUpload({ accept: '.pdf', multiple: false, maxSize: 200, maxCount: 1 })

  const { progress } = useFileProcessor()
  const { addRecord } = useHistory()

  // Local processing state (since useFileProcessor's isProcessing is computed/read-only)
  const isProcessing = ref(false)

  // State
  const diagnosisResult = ref<DiagnosisResult | null>(null)
  const repairOptions = ref({ ...defaultRepairOptions })
  const processResult = ref<{ success: boolean; data?: RepairResult; error?: string } | null>(null)
  const progressMessage = ref('正在处理...')

  // Computed
  const resultFileName = computed(() => {
    if (files.value.length > 0) {
      return files.value[0].name.replace(/\.pdf$/i, '_repaired.pdf')
    }
    return 'repaired.pdf'
  })

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get severity text
  const getSeverityText = (severity: IssueSeverity): string => {
    const texts: Record<IssueSeverity, string> = {
      low: '轻微',
      medium: '中等',
      high: '严重',
      critical: '致命'
    }
    return texts[severity]
  }

  // Trigger file select
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // Handle diagnose
  const handleDiagnose = async () => {
    if (!hasFiles.value) {
      ElMessage.warning('请先上传PDF文件')
      return
    }

    try {
      isProcessing.value = true
      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: files.value[0].name,
        processedCount: 0
      }

      const processor = createRepairProcessor()
      const file = files.value[0].file

      diagnosisResult.value = await processor.diagnose(file, (prog, msg) => {
        progress.value.progress = prog
        progressMessage.value = msg
      })

      if (!diagnosisResult.value.isCorrupted) {
        ElMessage.success('文件结构完整，无需修复')
      } else if (diagnosisResult.value.canRepair) {
        ElMessage.warning(`发现 ${diagnosisResult.value.issues.length} 个问题，可以尝试修复`)
      } else {
        ElMessage.error('文件损坏严重，无法修复')
      }
    } catch (e: any) {
      ElMessage.error(e.message || '诊断失败')
    } finally {
      isProcessing.value = false
    }
  }

  // Handle repair
  const handleRepair = async () => {
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
      isProcessing.value = true
      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: files.value[0].name,
        processedCount: 0
      }

      const processor = createRepairProcessor()
      const file = files.value[0].file

      const result = await processor.repair(file, repairOptions.value, (prog, msg) => {
        progress.value.progress = prog
        progressMessage.value = msg
      })

      processResult.value = result

      if (result.success) {
        ElMessage.success('PDF修复完成！')
        // Record usage
        permissionGuardRef.value?.recordUsage()
        // Save history
        if (result.data) {
          const blobUrl = URL.createObjectURL(result.data.file)
          addRecord({
            toolId: 'pdf-repair',
            toolName: 'PDF修复',
            fileName: files.value[0].name,
            outputFileName: resultFileName.value,
            fileSize: files.value[0].size,
            outputFileSize: result.data.repairedSize,
            processType: 'repair',
            downloadUrl: blobUrl
          })
        }
      } else {
        ElMessage.error(result.error || '修复失败')
      }
    } catch (e: any) {
      processResult.value = { success: false, error: e.message || '修复失败' }
    } finally {
      isProcessing.value = false
    }
  }

  // Download original file (for non-corrupted PDFs)
  const handleDownloadOriginal = () => {
    if (!hasFiles.value) return
    const file = files.value[0].file
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = files.value[0].name
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download result
  const downloadResult = () => {
    if (!processResult.value?.data?.file) return
    const url = URL.createObjectURL(processResult.value.data.file)
    const a = document.createElement('a')
    a.href = url
    a.download = resultFileName.value
    a.click()
    URL.revokeObjectURL(url)
  }

  // Clear all files
  const clearAllFiles = () => {
    clearFiles()
    diagnosisResult.value = null
    processResult.value = null
    repairOptions.value = { ...defaultRepairOptions }
  }

  // Continue processing
  const handleContinue = () => {
    processResult.value = null
    clearAllFiles()
  }

  // Retry
  const handleRetry = () => {
    processResult.value = null
    diagnosisResult.value = null
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (processResult.value?.data?.file) {
      URL.revokeObjectURL(URL.createObjectURL(processResult.value.data.file))
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
    width: 120px;
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

  .file-card-size {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  .diagnosis-section {
    width: 100%;
    max-width: 600px;
    margin-bottom: 20px;
    text-align: left;
  }

  .section-title {
    display: flex;
    align-items: center;
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .diagnosis-summary {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    margin-bottom: 12px;
    font-size: 14px;
    border-radius: 8px;

    &.corrupted {
      color: var(--el-color-warning-dark-2);
      background: var(--el-color-warning-light-9);
    }

    &.healthy {
      color: var(--el-color-success-dark-2);
      background: var(--el-color-success-light-9);
    }

    .summary-icon {
      margin-right: 8px;
      font-size: 18px;
    }
  }

  .issues-list {
    padding: 12px;
    margin-bottom: 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .issue-item {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 0;
    font-size: 13px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-child {
      border-bottom: none;
    }

    &.low .issue-severity {
      color: var(--el-color-info);
      background: var(--el-color-info-light-9);
    }

    &.medium .issue-severity {
      color: var(--el-color-warning);
      background: var(--el-color-warning-light-9);
    }

    &.high .issue-severity {
      color: var(--el-color-danger);
      background: var(--el-color-danger-light-9);
    }

    &.critical .issue-severity {
      color: #fff;
      background: var(--el-color-danger);
    }
  }

  .issue-severity {
    flex-shrink: 0;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 4px;
  }

  .issue-desc {
    flex: 1;
    color: var(--el-text-color-regular);
  }

  .issue-repairable {
    font-size: 11px;
    color: var(--el-color-success);
  }

  .issue-unrepairable {
    font-size: 11px;
    color: var(--el-color-danger);
  }

  .diagnosis-info {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .info-item {
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 13px;
  }

  .info-label {
    color: var(--el-text-color-secondary);
  }

  .info-value {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .repair-options {
    width: 100%;
    max-width: 600px;
    margin-bottom: 20px;
    text-align: left;
  }

  .option-group {
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .option-item {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 8px;
  }

  .option-label {
    min-width: 80px;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }

  .option-hint {
    display: flex;
    align-items: center;
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
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

  .repair-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    justify-content: center;
    padding: 12px 24px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .stat-item {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
  }

  .stat-label {
    color: var(--el-text-color-secondary);
  }

  .stat-value {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .repair-log {
    width: 100%;
    max-width: 500px;
    margin-bottom: 16px;
  }

  .log-title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .log-content {
    max-height: 150px;
    padding: 12px;
    overflow-y: auto;
    background: var(--el-fill-color-darker);
    border-radius: 8px;
  }

  .log-item {
    margin: 0 0 4px;
    font-family: monospace;
    font-size: 12px;
    color: var(--el-text-color-regular);

    &:last-child {
      margin-bottom: 0;
    }
  }

  .lost-content-warning {
    width: 100%;
    max-width: 500px;
    margin-bottom: 16px;
  }

  .lost-list {
    padding-left: 20px;
    margin: 8px 0 0;
    font-size: 12px;
  }

  .text-warning {
    display: flex;
    align-items: center;
    color: var(--el-color-warning);
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
