<template>
  <ToolPageLayout
    feature-id="pdf-merge"
    feature-name="PDF合并"
    :title="toolName || 'PDF合并'"
    :description="toolDescription || '将多个PDF文件合并为一个文件'"
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
        <!-- 上传提示 -->
        <template v-if="!hasFiles && !isProcessing && !hasResult">
          <p class="text-base text-g-600 mb-2">将文件拖拽到虚框内</p>
          <p class="text-sm text-g-400 mb-4">或者</p>
          <ElButton type="primary" @click="triggerFileSelect">点击上传文件(小于100M)</ElButton>
        </template>

        <!-- 文件列表 -->
        <template v-if="hasFiles && !hasResult">
          <div class="file-grid-container">
            <VueDraggable v-model="files" class="file-grid" :animation="200">
              <div v-for="file in files" :key="file.id" class="file-card">
                <div class="file-card-close" @click.stop="removeFile(file.id)">
                  <ElIcon><Close /></ElIcon>
                </div>
                <div class="file-card-icon">
                  <Icon icon="ri:file-pdf-2-fill" class="text-4xl text-danger" />
                </div>
                <p class="file-card-name">{{ file.name }}</p>
              </div>
            </VueDraggable>
            <div class="add-card-wrapper">
              <div class="file-card add-card" @click="triggerFileSelect">
                <ElIcon class="text-3xl text-g-400"><Plus /></ElIcon>
                <p class="text-xs text-g-400 mt-1">添加文件</p>
              </div>
            </div>
            <div class="file-actions">
              <ElButton type="primary" size="large" :disabled="fileCount < 2" @click="handleMerge">
                开始合并 ({{ fileCount }}个文件)
              </ElButton>
              <ElButton size="large" @click="clearFiles">清空</ElButton>
            </div>
          </div>
        </template>

        <!-- 处理中 -->
        <template v-if="isProcessing">
          <ToolResultView 
            type="loading" 
            loading-text="正在合并文档" 
            :percentage="progress.progress"
            icon-from="ri:file-pdf-2-fill"
            icon-to="ri:file-pdf-2-fill"
          />
        </template>

        <!-- 处理结果 -->
        <template v-if="hasResult">
          <ToolResultView
            v-if="isSuccess"
            type="success"
            title="合并完成！"
            @retry="handleRetry"
            @reset="handleContinue"
          >
            <template #default>
              <div class="result-file-card">
                <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                <p class="result-file-name">{{ mergeOptions.outputName }}</p>
              </div>
            </template>
            <template #actions>
              <ElButton type="primary" @click="handleDownload">
                <ElIcon class="mr-1"><Download /></ElIcon>下载文件
              </ElButton>
              <ElButton @click="handleContinue">继续合并</ElButton>
            </template>
          </ToolResultView>
          <ToolResultView
            v-else
            type="error"
            title="合并失败"
            :message="errorMsg || '合并失败，请重试'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept=".pdf"
        multiple
        hidden
        @change="handleFileSelect"
      />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF合并工具可以将多个PDF文件合并为一个文件：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持拖拽排序，自由调整合并顺序</li>
          <li>支持批量上传，最多20个文件</li>
          <li>单个文件限制100MB</li>
          <li>所有处理在浏览器本地完成</li>
        </ul>
      </div>
    </template>
  </ToolPageLayout>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Loading, CircleClose, Download, Plus, Close } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import { VueDraggable } from 'vue-draggable-plus'
  import ToolPageLayout from '@/components/core/layouts/tool-page-layout/index.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useToolProcessor } from '@/hooks/core/useToolProcessor'
  import { useHistory } from '@/hooks/core/useHistory'
  import { createPdfMergeProcessor, type PdfMergeOptions } from '@/processors/pdf/merge'

  defineOptions({ name: 'PdfMergePage' })

  // 工具信息
  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  // 文件上传
  const fileInputRef = ref<HTMLInputElement>()
  const {
    files,
    isDragging,
    hasFiles,
    fileCount,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    clearFiles
  } = useUpload({ accept: '.pdf', multiple: true, maxSize: 100, maxCount: 20 })

  // 合并选项
  const mergeOptions = ref<PdfMergeOptions>({
    outputName: 'merged.pdf',
    preserveBookmarks: false
  })

  // 工具处理器
  const processor = createPdfMergeProcessor()
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
    featureId: 'pdf-merge',
    featureName: 'PDF合并',
    successMessage: '合并完成！',
    errorMessage: '合并失败'
  })

  // 历史记录
  const { addRecord } = useHistory()

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 处理合并
  const handleMerge = async () => {
    if (fileCount.value < 2) {
      ElMessage.warning('至少需要2个PDF文件')
      return
    }

    const result = await processFiles(
      files.value.map((f) => f.file),
      mergeOptions.value
    )

    // 保存历史记录
    if (result?.success && result.data?.file) {
      const blobUrl = URL.createObjectURL(result.data.file)
      const totalSize = files.value.reduce((sum, f) => sum + f.size, 0)
      addRecord({
        toolId: 'pdf-merge',
        toolName: 'PDF合并',
        fileName: `${fileCount.value}个PDF文件`,
        outputFileName: mergeOptions.value.outputName,
        fileSize: totalSize,
        outputFileSize: result.data.file.size,
        processType: 'merge',
        downloadUrl: blobUrl
      })
    }
  }

  // 下载结果
  const handleDownload = () => {
    downloadResult(mergeOptions.value.outputName)
  }

  // 继续处理
  const handleContinue = () => {
    reset()
    clearFiles()
  }

  // 重试
  const handleRetry = () => {
    reset()
  }
</script>

<style scoped lang="scss">
  // 拖拽相关样式
  .file-card {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .result-file-name {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
