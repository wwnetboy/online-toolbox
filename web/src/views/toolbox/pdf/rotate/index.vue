<template>
  <ToolPageLayout
    feature-id="pdf-rotate"
    feature-name="PDF旋转"
    :title="toolName || 'PDF旋转'"
    :description="toolDescription || '旋转PDF页面方向'"
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

            <!-- 旋转选项 -->
            <div class="rotate-options">
              <ElRadioGroup v-model="rotateAngle" class="angle-selector">
                <ElRadio :value="90">顺时针90°</ElRadio>
                <ElRadio :value="-90">逆时针90°</ElRadio>
                <ElRadio :value="180">180°</ElRadio>
              </ElRadioGroup>
            </div>

            <!-- 操作按钮 -->
            <div class="file-actions">
              <ElButton type="primary" size="large" @click="handleRotate">开始旋转</ElButton>
              <ElButton size="large" @click="clearFiles">清空</ElButton>
            </div>
          </div>
        </template>

        <!-- 处理中 -->
        <template v-if="isProcessing">
          <ToolResultView 
            type="loading" 
            loading-text="正在旋转文档" 
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
            title="旋转完成！"
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
              <ElButton @click="handleContinue">继续旋转</ElButton>
            </template>
          </ToolResultView>
          <ToolResultView
            v-else
            type="error"
            title="旋转失败"
            :message="errorMsg || '旋转失败，请重试'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF旋转工具可以旋转PDF页面方向：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持顺时针/逆时针90°旋转</li>
          <li>支持180°旋转</li>
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
  import { createPdfPageProcessor, type RotationAngle } from '@/processors/pdf/pages'

  defineOptions({ name: 'PdfRotatePage' })

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

  // 旋转角度
  const rotateAngle = ref<RotationAngle>(90)

  // 创建自定义处理器适配器
  const processor = createPdfPageProcessor()
  const rotateProcessor = {
    validate: (files: File[]) => processor.validate(files),
    process: async (
      files: File[],
      options: { angle: RotationAngle },
      onProgress?: (progress: number) => void
    ) => {
      return await processor.rotatePages(files[0], { pages: [], angle: options.angle }, onProgress)
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
  } = useToolProcessor(rotateProcessor, {
    featureId: 'pdf-rotate',
    featureName: 'PDF旋转',
    successMessage: '旋转完成！',
    errorMessage: '旋转失败'
  })

  // 历史记录
  const { addRecord } = useHistory()

  // 计算输出文件名
  const outputName = computed(
    () => files.value[0]?.name?.replace(/\.pdf$/i, '_rotated.pdf') || 'rotated.pdf'
  )

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 处理旋转
  const handleRotate = async () => {
    const result = await processFiles(
      files.value.map((f) => f.file),
      { angle: rotateAngle.value }
    )

    // 保存历史记录
    if (result?.success && result.data) {
      const blobUrl = URL.createObjectURL(result.data as Blob)
      addRecord({
        toolId: 'pdf-rotate',
        toolName: 'PDF旋转',
        fileName: files.value[0].name,
        outputFileName: outputName.value,
        fileSize: files.value[0].size,
        outputFileSize: (result.data as Blob).size,
        processType: 'rotate',
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

  .rotate-options {
    margin-bottom: 20px;
  }

  .angle-selector {
    display: flex;
    gap: 16px;
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
