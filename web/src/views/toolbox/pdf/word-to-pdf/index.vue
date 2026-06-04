<template>
  <ToolPageLayout
    feature-id="pdf-from-word"
    feature-name="Word转PDF"
    :title="toolName || 'Word转PDF'"
    :description="toolDescription || '将Word文档(.doc/.docx)转换为PDF格式'"
    :icon="toolIcon"
    :icon-url="toolIconUrl"
    :color="toolColor"
  >
    <template #content>
      <PermissionGuard
        feature-id="pdf-from-word"
        feature-name="Word转PDF"
        ref="permissionGuardRef"
      >
        <div
          class="upload-area"
          :class="{ 
            'is-dragging': isDragging, 
            'has-files': hasFiles,
            'is-processing': isProcessing,
            'has-result': hasResult
          }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <!-- 上传提示 -->
          <template v-if="!hasFiles && !isProcessing && !hasResult">
            <Icon icon="ri:file-word-2-fill" class="text-6xl text-[#2b579a] mb-4" />
            <p class="text-base text-g-600 mb-2">将Word文件拖拽到此处</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">选择Word文件</ElButton>
            <p class="text-xs text-g-400 mt-3">支持 .doc, .docx 格式，最大50MB</p>
          </template>

          <!-- 已选择文件 -->
          <template v-if="hasFiles && !isProcessing && !hasResult">
            <div class="file-preview">
              <div class="file-icon">
                <Icon icon="ri:file-word-2-fill" class="text-5xl text-[#2b579a]" />
              </div>
              <div class="file-info">
                <p class="file-name">{{ files[0]?.name }}</p>
                <p class="file-size">{{ formatFileSize(files[0]?.size || 0) }}</p>
              </div>
              <ElButton type="danger" text @click="clearFiles">
                <ElIcon><Close /></ElIcon>
              </ElButton>
            </div>
            <div class="convert-options">
              <ElCheckbox v-model="options.preserveHyperlinks">保留超链接</ElCheckbox>
              <ElCheckbox v-model="options.preserveBookmarks">保留书签</ElCheckbox>
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
              icon-from="ri:file-word-2-fill"
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

        <input
          ref="fileInputRef"
          type="file"
          accept=".doc,.docx"
          hidden
          @change="handleFileSelect"
        />
      </PermissionGuard>
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">Word转PDF工具可以将Word文档转换为PDF格式。</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持 .doc 和 .docx 格式</li>
          <li>保留文档格式、字体和样式</li>
          <li>可选保留超链接和书签</li>
          <li>单个文件最大50MB</li>
        </ul>
      </div>
    </template>
  </ToolPageLayout>
</template>

<script setup lang="ts">
  import { ref, computed, watchEffect } from 'vue'
  import { CircleClose, Download, Close, VideoPlay } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolPageLayout from '@/components/core/layouts/tool-page-layout/index.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useToolProcessor } from '@/hooks/core/useToolProcessor'
  import { useHistory } from '@/hooks/core/useHistory'
  import { createWordToPdfProcessor } from '@/processors/pdf/convert'

  defineOptions({ name: 'WordToPdfPage' })

  // 工具信息
  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  // 权限守卫
  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()

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
  } = useUpload({ accept: '.doc,.docx', multiple: false, maxSize: 50, maxCount: 1 })

  // 转换选项
  const options = ref({
    preserveHyperlinks: true,
    preserveBookmarks: true
  })

  // 工具处理器
  const processor = createWordToPdfProcessor()
  const {
    permissionGuardRef: toolProcessorGuardRef,
    isProcessing,
    progress,
    hasResult,
    isSuccess,
    errorMsg,
    processFiles,
    downloadResult,
    reset
  } = useToolProcessor(processor, {
    featureId: 'pdf-from-word',
    featureName: 'Word转PDF',
    successMessage: '转换完成！',
    errorMessage: '转换失败',
    showErrorMessage: false // 不显示错误弹窗，只在页面上显示
  })

  // 同步 permissionGuardRef - 使用 watchEffect 确保响应式更新
  watchEffect(() => {
    if (permissionGuardRef.value) {
      toolProcessorGuardRef.value = permissionGuardRef.value
    }
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
    const name = files.value[0].name.replace(/\.(doc|docx)$/i, '')
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
      options.value
    )

    // 保存历史记录
    if (result?.success && result.data?.blob) {
      const blobUrl = URL.createObjectURL(result.data.blob)
      addRecord({
        toolId: 'pdf-from-word',
        toolName: 'Word转PDF',
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
  @use '../shared-styles';

  // 覆盖共享样式，在处理中和结果状态时移除虚线框
  .upload-area {
    &.is-processing,
    &.has-result {
      border: none;
      background: transparent;
      
      &:hover {
        border: none;
        background: transparent;
      }
    }
  }

  .convert-options {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 20px;
  }
</style>
