<template>
  <ToolPageLayout
    feature-id="pdf-reorder"
    feature-name="PDF重排页面"
    :title="toolName || 'PDF重排'"
    :description="toolDescription || '调整PDF页面顺序'"
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

        <!-- 文件列表和选项 -->
        <template v-if="hasFiles && !isProcessing && !hasResult">
          <div class="file-grid-container">
            <div class="file-grid">
              <div class="file-card">
                <div class="file-card-close" @click.stop="clearFiles">
                  <ElIcon><Close /></ElIcon>
                </div>
                <div class="file-card-icon">
                  <Icon icon="ri:file-pdf-2-fill" class="text-4xl text-danger" />
                </div>
                <p class="file-card-name">{{ files[0]?.name }}</p>
              </div>
            </div>

            <!-- 重排选项 -->
            <div class="reorder-options">
              <p class="text-sm text-g-500 mb-2">输入新的页面顺序（用逗号分隔）</p>
              <ElInput v-model="pageOrder" placeholder="例如: 3,1,2,5,4" class="max-w-xs" />
            </div>

            <!-- 操作按钮 -->
            <div class="file-actions">
              <ElButton type="primary" size="large" @click="handleReorder">开始重排</ElButton>
              <ElButton size="large" @click="clearFiles">清空</ElButton>
            </div>
          </div>
        </template>

        <!-- 处理中 -->
        <template v-if="isProcessing">
          <ToolResultView 
            type="loading" 
            loading-text="正在重排页面" 
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
            title="重排完成！"
            @retry="handleRetry"
            @reset="handleContinue"
          >
            <template #default>
              <div class="result-file-card">
                <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                <p class="result-file-name">{{ outputName }}</p>
              </div>
            </template>
            <template #actions>
              <ElButton type="primary" @click="handleDownload">
                <ElIcon class="mr-1"><Download /></ElIcon>下载文件
              </ElButton>
              <ElButton @click="handleContinue">继续重排</ElButton>
            </template>
          </ToolResultView>
          <ToolResultView
            v-else
            type="error"
            title="重排失败"
            :message="errorMsg || '重排失败，请重试'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF重排工具可以调整PDF页面顺序：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>自定义页面排列顺序</li>
          <li>支持任意页面组合</li>
          <li>单个文件限制100MB</li>
          <li>所有处理在浏览器本地完成</li>
        </ul>
      </div>
    </template>
  </ToolPageLayout>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Loading, CircleClose, Download, Close } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolPageLayout from '@/components/core/layouts/tool-page-layout/index.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useToolProcessor } from '@/hooks/core/useToolProcessor'
  import { useHistory } from '@/hooks/core/useHistory'
  import { createPdfPageProcessor } from '@/processors/pdf/pages'

  defineOptions({ name: 'PdfReorderPage' })

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
  } = useUpload({ accept: '.pdf', multiple: false, maxSize: 100, maxCount: 1 })

  // 重排选项
  const pageOrder = ref('1,2,3')

  // 创建自定义处理器适配器
  const processor = createPdfPageProcessor()
  const reorderProcessor = {
    validate: (files: File[]) => processor.validate(files),
    process: async (
      files: File[],
      options: { pageOrder: string },
      onProgress?: (progress: number) => void
    ) => {
      const newOrder = options.pageOrder
        .split(',')
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n))

      return await processor.reorderPages(files[0], { newOrder }, onProgress)
    }
  }

  // 工具处理器
  const {
    isProcessing,
    progress,
    hasResult,
    isSuccess,
    errorMsg,
    processFiles,
    downloadResult,
    reset
  } = useToolProcessor(reorderProcessor, {
    featureId: 'pdf-reorder',
    featureName: 'PDF重排页面',
    successMessage: '重排完成！',
    errorMessage: '重排失败'
  })

  // 历史记录
  const { addRecord } = useHistory()

  // 计算输出文件名
  const outputName = computed(
    () => files.value[0]?.name?.replace(/\.pdf$/i, '_reordered.pdf') || 'reordered.pdf'
  )

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 处理重排
  const handleReorder = async () => {
    const result = await processFiles(
      files.value.map((f) => f.file),
      { pageOrder: pageOrder.value }
    )

    // 保存历史记录
    if (result?.success && result.data) {
      const blobUrl = URL.createObjectURL(result.data as Blob)
      addRecord({
        toolId: 'pdf-reorder',
        toolName: 'PDF重排页面',
        fileName: files.value[0].name,
        outputFileName: outputName.value,
        fileSize: files.value[0].size,
        outputFileSize: (result.data as Blob).size,
        processType: 'reorder',
        downloadUrl: blobUrl
      })
    }
  }

  // 下载结果
  const handleDownload = () => {
    downloadResult(outputName.value)
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
  .reorder-options {
    margin-bottom: 20px;
    text-align: center;
  }
</style>
