<template>
  <ToolPageLayout
    feature-id="pdf-split"
    feature-name="PDF拆分"
    :title="toolName || 'PDF拆分'"
    :description="toolDescription || '将PDF文件拆分成多个部分'"
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

            <!-- 拆分选项 -->
            <div class="split-options">
              <ElRadioGroup v-model="splitMode" class="mb-4">
                <ElRadio value="range">按页码范围</ElRadio>
                <ElRadio value="equal">按份数均分</ElRadio>
              </ElRadioGroup>
              <ElInput
                v-if="splitMode === 'range'"
                v-model="pageRange"
                placeholder="例如: 1-3,5,7-10"
                class="mb-4"
              />
              <ElInputNumber
                v-if="splitMode === 'equal'"
                v-model="equalParts"
                :min="2"
                :max="100"
                placeholder="份数"
                class="mb-4"
              />
              <div v-if="hasPreference" class="preference-hint">
                <span class="text-xs text-g-400">已记住您的偏好设置</span>
                <ElButton link type="primary" size="small" @click="resetToDefault"
                  >恢复默认</ElButton
                >
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="file-actions">
              <ElButton type="primary" size="large" @click="handleSplit">开始拆分</ElButton>
              <ElButton size="large" @click="clearFiles">清空</ElButton>
            </div>
          </div>
        </template>

        <!-- 处理中 -->
        <template v-if="isProcessing">
          <ToolResultView 
            type="loading" 
            loading-text="正在拆分文档" 
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
            title="拆分完成！"
            @retry="handleRetry"
            @reset="handleContinue"
          >
            <template #default>
              <div class="result-file-card">
                <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                <p class="result-file-name">拆分完成 ({{ resultData?.files?.length || 0 }}个文件)</p>
              </div>
            </template>
            <template #actions>
              <ElButton type="primary" @click="downloadAll">
                <ElIcon class="mr-1"><Download /></ElIcon>打包下载
              </ElButton>
              <ElButton @click="handleContinue">继续拆分</ElButton>
            </template>
          </ToolResultView>
          <ToolResultView
            v-else
            type="error"
            title="拆分失败"
            :message="errorMsg || '拆分失败，请重试'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF拆分工具可以将PDF文件拆分成多个部分：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持按页码范围拆分</li>
          <li>支持按份数均分</li>
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
  import JSZip from 'jszip'
  import { saveAs } from 'file-saver'
  import ToolPageLayout from '@/components/core/layouts/tool-page-layout/index.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useToolProcessor } from '@/hooks/core/useToolProcessor'
  import { usePreference } from '@/hooks/core/usePreference'
  import { useHistory } from '@/hooks/core/useHistory'
  import { createPdfSplitProcessor, type PdfSplitOptions } from '@/processors/pdf/split'

  defineOptions({ name: 'PdfSplitPage' })

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
  } = usePreference('pdf-split', {
    splitMode: 'range' as 'range' | 'equal',
    pageRange: '1-5',
    equalParts: 2
  })

  const splitMode = computed({
    get: () => preferenceOptions.value.splitMode,
    set: (val) => {
      preferenceOptions.value.splitMode = val
    }
  })

  const pageRange = computed({
    get: () => preferenceOptions.value.pageRange,
    set: (val) => {
      preferenceOptions.value.pageRange = val
    }
  })

  const equalParts = computed({
    get: () => preferenceOptions.value.equalParts,
    set: (val) => {
      preferenceOptions.value.equalParts = val
    }
  })

  // 工具处理器
  const processor = createPdfSplitProcessor()
  const {
    isProcessing,
    progress,
    hasResult,
    isSuccess,
    resultData,
    errorMsg,
    processFiles,
    reset
  } = useToolProcessor(processor, {
    featureId: 'pdf-split',
    featureName: 'PDF拆分',
    successMessage: '拆分完成！',
    errorMessage: '拆分失败'
  })

  // 历史记录
  const { addRecord } = useHistory()

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 处理拆分
  const handleSplit = async () => {
    const options: PdfSplitOptions =
      splitMode.value === 'range'
        ? { mode: 'range' as const, ranges: pageRange.value }
        : { mode: 'equal' as const, equalParts: equalParts.value }

    const result = await processFiles(
      files.value.map((f) => f.file),
      options
    )

    // 保存历史记录
    if (result?.success && result.data?.files) {
      result.data.files.forEach((file: any) => {
        const blobUrl = URL.createObjectURL(file.blob)
        addRecord({
          toolId: 'pdf-split',
          toolName: 'PDF拆分',
          fileName: files.value[0].name,
          outputFileName: file.name,
          fileSize: files.value[0].size,
          outputFileSize: file.blob.size,
          processType: 'split',
          downloadUrl: blobUrl
        })
      })
    }
  }

  // 打包下载所有文件
  const downloadAll = async () => {
    if (!resultData.value?.files) return
    const zip = new JSZip()
    for (const file of resultData.value.files) {
      zip.file(file.name, file.blob)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, 'split_result.zip')
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

  .split-options {
    width: 100%;
    max-width: 300px;
    margin-bottom: 20px;
    text-align: center;
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
