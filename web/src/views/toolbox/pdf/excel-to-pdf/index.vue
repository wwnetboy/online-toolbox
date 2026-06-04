<template>
  <ToolPageLayout
    feature-id="pdf-from-excel"
    feature-name="Excel转PDF"
    :title="toolName || 'Excel转PDF'"
    :description="toolDescription || '将Excel电子表格(.xls/.xlsx)转换为PDF格式'"
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
          <Icon icon="ri:file-excel-2-fill" class="text-6xl text-[#217346] mb-4" />
          <p class="text-base text-g-600 mb-2">将Excel文件拖拽到此处</p>
          <p class="text-sm text-g-400 mb-4">或者</p>
          <ElButton type="primary" @click="triggerFileSelect">选择Excel文件</ElButton>
          <p class="text-xs text-g-400 mt-3">支持 .xls, .xlsx 格式，最大50MB</p>
        </template>

        <!-- 已选择文件 -->
        <template v-if="hasFiles && !isProcessing && !hasResult">
          <div class="file-preview">
            <div class="file-icon">
              <Icon icon="ri:file-excel-2-fill" class="text-5xl text-[#217346]" />
            </div>
            <div class="file-info">
              <p class="file-name">{{ files[0]?.name }}</p>
              <p class="file-size">{{ formatFileSize(files[0]?.size || 0) }}</p>
            </div>
            <ElButton type="danger" text @click="clearFiles">
              <ElIcon><Close /></ElIcon>
            </ElButton>
          </div>
          <div class="action-buttons">
            <ElButton type="primary" size="large" @click="handleConvert">
              <ElIcon class="mr-1"><VideoPlay /></ElIcon>
              开始转换
            </ElButton>
            <ElButton size="large" @click="clearFiles">重新选择</ElButton>
          </div>
        </template>

        <!-- 处理中 -->
        <template v-if="isProcessing">
          <ToolResultView 
            type="loading" 
            loading-text="正在转换文档" 
            :percentage="progress.progress"
            icon-from="ri:file-excel-2-fill"
            icon-to="ri:file-pdf-2-fill"
          />
        </template>

        <!-- 处理结果 -->
        <template v-if="hasResult">
          <ToolResultView
            v-if="isSuccess"
            type="success"
            title="转换完成！"
          >
            <template #default>
              <div class="result-file-card">
                <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                <p class="result-file-name">{{ outputFileName }}</p>
              </div>
            </template>
            <template #actions>
              <ElButton type="primary" @click="handleDownload">
                <ElIcon class="mr-1"><Download /></ElIcon>下载PDF
              </ElButton>
              <ElButton @click="handleContinue">继续转换</ElButton>
            </template>
          </ToolResultView>
          <ToolResultView
            v-else
            type="error"
            title="转换失败"
            :message="errorMsg || '转换失败，请重试'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input ref="fileInputRef" type="file" accept=".xls,.xlsx" hidden @change="handleFileSelect" />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">Excel转PDF工具可以将Excel电子表格转换为PDF格式。</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持 .xls 和 .xlsx 格式</li>
          <li>保留单元格格式、边框和颜色</li>
          <li>多工作表自动分页</li>
          <li>单个文件最大50MB</li>
        </ul>
      </div>
    </template>
  </ToolPageLayout>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Loading, CircleClose, Download, Close, VideoPlay } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolPageLayout from '@/components/core/layouts/tool-page-layout/index.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useToolProcessor } from '@/hooks/core/useToolProcessor'
  import { useHistory } from '@/hooks/core/useHistory'
  import { createExcelToPdfProcessor } from '@/processors/pdf/convert'

  defineOptions({ name: 'ExcelToPdfPage' })

  // 工具信息
  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  // 文件上传
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
    clearFiles
  } = useUpload({ accept: '.xls,.xlsx', multiple: false, maxSize: 50, maxCount: 1 })

  // 工具处理器
  const processor = createExcelToPdfProcessor()
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
    featureId: 'pdf-from-excel',
    featureName: 'Excel转PDF',
    successMessage: '转换完成！',
    errorMessage: '转换失败'
  })

  // 历史记录
  const { addRecord } = useHistory()

  // 状态文本
  const statusText = computed(() => {
    if (progress.value.progress < 10) return '正在上传文件...'
    if (progress.value.progress < 90) return `正在转换... ${progress.value.progress}%`
    return '正在下载结果...'
  })

  // 计算输出文件名
  const outputFileName = computed(() => {
    if (!files.value[0]?.name) return 'output.pdf'
    const name = files.value[0].name.replace(/\.(xls|xlsx)$/i, '')
    return `${name}.pdf`
  })

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 处理转换
  const handleConvert = async () => {
    const result = await processFiles(
      files.value.map((f) => f.file),
      {}
    )

    // 保存历史记录
    if (result?.success && result.data?.blob) {
      const blobUrl = URL.createObjectURL(result.data.blob)
      addRecord({
        toolId: 'pdf-from-excel',
        toolName: 'Excel转PDF',
        fileName: files.value[0].name,
        outputFileName: outputFileName.value,
        fileSize: files.value[0].size,
        outputFileSize: result.data.blob.size,
        processType: 'convert',
        downloadUrl: blobUrl
      })
    }
  }

  // 下载结果
  const handleDownload = () => {
    downloadResult(outputFileName.value)
  }

  // 继续处理
  const handleContinue = () => {
    reset()
    clearFiles()
  }

  // 重试
  const handleRetry = () => {
    reset()
    handleConvert()
  }
</script>

<style scoped lang="scss">
  @import '../shared-styles';
</style>
