<template>
  <ToolPageLayout
    feature-id="pdf-compress"
    feature-name="PDF压缩"
    :title="toolName || 'PDF压缩'"
    :description="toolDescription || '压缩PDF文件大小'"
    :icon="toolIcon"
    :icon-url="toolIconUrl"
    :color="toolColor"
    ref="layoutRef"
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

            <!-- 压缩选项 -->
            <div class="compress-options">
              <ElRadioGroup v-model="compressLevel" class="level-selector">
                <ElRadio value="light">轻度压缩</ElRadio>
                <ElRadio value="medium">中度压缩</ElRadio>
                <ElRadio value="heavy">重度压缩</ElRadio>
              </ElRadioGroup>
              <div v-if="hasPreference" class="preference-hint">
                <span class="text-xs text-g-400">已记住您的偏好设置</span>
                <ElButton link type="primary" size="small" @click="resetToDefault"
                  >恢复默认</ElButton
                >
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="file-actions">
              <ElButton type="primary" size="large" @click="handleCompress">开始压缩</ElButton>
              <ElButton size="large" @click="clearFiles">清空</ElButton>
            </div>
          </div>
        </template>

        <!-- 处理中 -->
        <template v-if="isProcessing">
          <ToolResultView 
            type="loading" 
            loading-text="正在压缩文档" 
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
            title="压缩完成！"
            @retry="handleRetry"
            @reset="handleContinue"
          >
            <template #default>
              <div class="result-file-card">
                <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                <p class="result-file-name">{{ outputName }}</p>
                <p class="text-xs text-success mt-2">
                  压缩率: {{ resultData?.compressionRatio?.toFixed(1) || 0 }}%
                </p>
              </div>
            </template>
            <template #actions>
              <ElButton type="primary" @click="handleDownload">
                <ElIcon class="mr-1"><Download /></ElIcon>下载文件
              </ElButton>
              <ElButton @click="handleContinue">继续压缩</ElButton>
            </template>
          </ToolResultView>
          <ToolResultView
            v-else
            type="error"
            title="压缩失败"
            :message="errorMsg || '压缩失败，请重试'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF压缩工具可以减小PDF文件大小：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>轻度压缩：保持较高画质</li>
          <li>中度压缩：平衡画质与大小</li>
          <li>重度压缩：最大程度减小文件</li>
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
  import { usePreference } from '@/hooks/core/usePreference'
  import { useHistory } from '@/hooks/core/useHistory'
  import { createPdfCompressProcessor } from '@/processors/pdf/compress'

  defineOptions({ name: 'PdfCompressPage' })

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

  // 用户偏好
  const {
    options: preferenceOptions,
    hasPreference,
    resetToDefault
  } = usePreference('pdf-compress', {
    level: 'medium' as 'light' | 'medium' | 'heavy'
  })

  const compressLevel = computed({
    get: () => preferenceOptions.value.level,
    set: (val) => {
      preferenceOptions.value.level = val
    }
  })

  // 工具处理器
  const processor = createPdfCompressProcessor()
  const {
    isProcessing,
    progress,
    hasResult,
    isSuccess,
    resultData,
    errorMsg,
    processFiles,
    downloadResult,
    reset
  } = useToolProcessor(processor, {
    featureId: 'pdf-compress',
    featureName: 'PDF压缩',
    successMessage: '压缩完成！',
    errorMessage: '压缩失败'
  })

  // 历史记录
  const { addRecord } = useHistory()

  // 布局引用
  const layoutRef = ref()

  // 计算输出文件名
  const outputName = computed(
    () => files.value[0]?.name?.replace(/\.pdf$/i, '_compressed.pdf') || 'compressed.pdf'
  )

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 处理压缩
  const handleCompress = async () => {
    const result = await processFiles(
      files.value.map((f) => f.file),
      {
        level: compressLevel.value
      }
    )

    // 保存历史记录
    if (result?.success && result.data?.file) {
      const blobUrl = URL.createObjectURL(result.data.file)
      addRecord({
        toolId: 'pdf-compress',
        toolName: 'PDF压缩',
        fileName: files.value[0].name,
        outputFileName: outputName.value,
        fileSize: files.value[0].size,
        outputFileSize: result.data.file.size,
        processType: 'compress',
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
    margin-bottom: 16px;
  }

  .file-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 90px;
    padding: 16px 8px;
    text-align: center;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;

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

  .compress-options {
    margin-bottom: 20px;
  }

  .level-selector {
    display: flex;
    gap: 16px;
  }

  .preference-hint {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    margin-top: 8px;
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

  .result-file-name {
    margin: 12px 0 0;
    font-size: 14px;
    color: var(--el-text-color-regular);
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
