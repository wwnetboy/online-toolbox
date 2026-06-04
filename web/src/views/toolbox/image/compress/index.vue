<template>
  <ToolPageLayout
    feature-id="image-compress"
    feature-name="图片压缩"
    :title="toolName || '图片压缩'"
    :description="toolDescription || '减小图片文件大小，支持按质量或尺寸压缩'"
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
          <p class="text-base text-g-600 mb-2">将图片拖拽到虚框内</p>
          <p class="text-sm text-g-400 mb-4">或者</p>
          <ElButton type="primary" @click="triggerFileSelect">点击上传图片(小于20M)</ElButton>
          <p class="text-xs text-g-400 mt-3">支持 JPG/PNG/WEBP 格式</p>
        </template>

        <!-- 文件列表和选项 -->
        <template v-if="hasFiles && !isProcessing && !hasResult">
          <div class="file-grid-container">
            <div class="file-grid">
              <div v-for="file in files" :key="file.id" class="file-card image-card">
                <div class="file-card-close" @click.stop="removeFile(file.id)">
                  <ElIcon><Close /></ElIcon>
                </div>
                <div class="file-card-preview">
                  <img v-if="file.preview" :src="file.preview" alt="preview" />
                  <Icon v-else icon="ri:image-line" class="text-4xl text-success" />
                </div>
                <p class="file-card-name">{{ file.name }}</p>
                <p class="file-card-size">{{ formatFileSize(file.size) }}</p>
              </div>
            </div>
            <div class="add-card-wrapper">
              <div class="file-card add-card" @click="triggerFileSelect">
                <ElIcon class="text-3xl text-g-400"><Plus /></ElIcon>
                <p class="text-xs text-g-400 mt-1">添加图片</p>
              </div>
            </div>

            <!-- 压缩设置 -->
            <div class="options-panel">
              <h4 class="options-title">压缩设置</h4>
              <ElForm :model="compressOptions" label-width="100px" size="default">
                <ElFormItem label="压缩模式">
                  <ElRadioGroup v-model="compressOptions.mode">
                    <ElRadioButton value="quality">按质量压缩</ElRadioButton>
                    <ElRadioButton value="size">按尺寸压缩</ElRadioButton>
                  </ElRadioGroup>
                </ElFormItem>
                <ElFormItem v-if="compressOptions.mode === 'quality'" label="图片质量">
                  <div class="slider-container">
                    <ElSlider
                      v-model="compressOptions.quality"
                      :min="10"
                      :max="100"
                      :step="10"
                      show-input
                    />
                    <p class="text-xs text-g-400 mt-1">质量越低，文件越小</p>
                  </div>
                </ElFormItem>
                <template v-if="compressOptions.mode === 'size'">
                  <ElFormItem label="最大宽度">
                    <ElInputNumber
                      v-model="compressOptions.maxWidth"
                      :min="100"
                      :max="10000"
                      :step="100"
                      placeholder="像素"
                    />
                    <span class="ml-2 text-g-400">像素</span>
                  </ElFormItem>
                  <ElFormItem label="最大高度">
                    <ElInputNumber
                      v-model="compressOptions.maxHeight"
                      :min="100"
                      :max="10000"
                      :step="100"
                      placeholder="像素"
                    />
                    <span class="ml-2 text-g-400">像素</span>
                  </ElFormItem>
                  <ElFormItem label="保持比例">
                    <ElSwitch v-model="compressOptions.maintainAspectRatio" />
                  </ElFormItem>
                </template>
              </ElForm>
              <div v-if="hasPreference" class="preference-hint">
                <span class="text-xs text-g-400">已记住您的偏好设置</span>
                <ElButton link type="primary" size="small" @click="resetToDefault"
                  >恢复默认</ElButton
                >
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="file-actions">
              <ElButton type="primary" size="large" @click="handleCompress"
                >开始压缩 ({{ fileCount }}个文件)</ElButton
              >
              <ElButton size="large" @click="clearFiles">清空</ElButton>
            </div>
          </div>
        </template>

        <!-- 处理中 -->
        <template v-if="isProcessing">
          <ToolResultView type="loading" :percentage="progress.progress">
            <template #progress>
              <p class="text-sm text-g-400 mb-2">{{ progress.currentFileName }}</p>
              <ElProgress :percentage="progress.progress" class="w-full max-w-md" />
              <p class="text-xs text-g-400 mt-2">正在处理第 {{ progress.currentIndex + 1 }} / {{ progress.totalFiles }} 个文件</p>
            </template>
          </ToolResultView>
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
              <div v-if="resultData?.files?.length === 1" class="result-preview-container">
                <div class="result-preview-image">
                  <img :src="getResultPreviewUrl()" alt="处理结果" />
                </div>
                <p class="result-file-name mt-3">{{ getResultFileName() }}</p>
              </div>
              <div v-else class="result-file-card">
                <Icon :icon="getResultFileIcon()" class="text-5xl text-primary" />
                <p class="result-file-name">批量压缩完成</p>
              </div>
            </template>
            <template #actions>
              <ElButton type="primary" @click="downloadResult">
                <ElIcon class="mr-1"><Download /></ElIcon>{{ resultData?.files?.length === 1 ? '下载文件' : '打包下载' }}
              </ElButton>
              <ElButton @click="handleContinue">继续处理</ElButton>
            </template>
          </ToolResultView>
          <ToolResultView
            v-else
            type="error"
            title="压缩失败"
            :message="errorMsg || '压缩失败'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        @change="handleFileSelect"
      />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">图片压缩工具可以有效减小图片文件大小：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持按质量压缩，自由调节压缩比例</li>
          <li>支持按尺寸压缩，限制最大宽高</li>
          <li>支持批量处理，最多50个文件</li>
          <li>支持 JPG/PNG/WEBP 格式</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
      </div>
    </template>
  </ToolPageLayout>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Loading, CircleClose, Download, Refresh, Plus, Close } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import { saveAs } from 'file-saver'
  import ToolPageLayout from '@/components/core/layouts/tool-page-layout/index.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useToolProcessor } from '@/hooks/core/useToolProcessor'
  import { usePreference } from '@/hooks/core/usePreference'
  import { useHistory } from '@/hooks/core/useHistory'
  import {
    createImageCompressProcessor,
    type ImageCompressOptions
  } from '@/processors/image/compress'

  defineOptions({ name: 'ImageCompressPage' })

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
    clearFiles,
    formatFileSize
  } = useUpload({
    accept: 'image/jpeg,image/png,image/webp',
    multiple: true,
    maxSize: 20,
    maxCount: 50
  })

  // 用户偏好
  const {
    options: compressOptions,
    hasPreference,
    resetToDefault
  } = usePreference<ImageCompressOptions>('image-compress', {
    mode: 'quality',
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    maintainAspectRatio: true
  })

  // 工具处理器
  const processor = createImageCompressProcessor()
  const {
    isProcessing,
    progress,
    hasResult,
    isSuccess,
    resultData,
    errorMsg,
    processFiles,
    downloadMultipleResults,
    reset
  } = useToolProcessor(processor, {
    featureId: 'image-compress',
    featureName: '图片压缩',
    successMessage: '图片压缩完成！',
    errorMessage: '压缩失败'
  })

  // 历史记录
  const { addRecord } = useHistory()

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 计算压缩率
  const calculateCompressionRatio = (originalSize: number, compressedSize: number): string => {
    const ratio = ((originalSize - compressedSize) / originalSize) * 100
    return ratio.toFixed(1)
  }

  // 获取结果文件图标
  const getResultFileIcon = () => {
    if (!resultData.value?.files?.length) return 'ri:image-line'
    return 'ri:file-image-line'
  }

  // 获取结果文件名
  const getResultFileName = () => {
    if (!resultData.value?.files) return ''
    const count = resultData.value.files.length
    if (count === 1) {
      return resultData.value.files[0].name
    }
    return `压缩完成 (${count}个文件)`
  }

  // 获取结果预览 URL
  const getResultPreviewUrl = () => {
    if (!resultData.value?.files?.length) return ''
    const file = resultData.value.files[0]
    return URL.createObjectURL(file.blob)
  }

  // 处理压缩
  const handleCompress = async () => {
    if (fileCount.value === 0) {
      ElMessage.warning('请先上传图片')
      return
    }

    const result = await processFiles(
      files.value.map((f) => f.file),
      compressOptions.value
    )

    // 保存历史记录
    if (result?.success && result.data?.files) {
      result.data.files.forEach((file: any) => {
        const blobUrl = URL.createObjectURL(file.blob)
        addRecord({
          toolId: 'image-compress',
          toolName: '图片压缩',
          fileName: file.name,
          outputFileName: file.name,
          fileSize: file.blob.size,
          outputFileSize: file.blob.size,
          processType: 'compress',
          downloadUrl: blobUrl
        })
      })
    }
  }

  // 下载结果
  const downloadResult = async () => {
    if (!resultData.value?.files) {
      ElMessage.error('没有可下载的文件')
      return
    }

    const resultFiles = resultData.value.files

    if (resultFiles.length === 1) {
      const file = resultFiles[0]
      saveAs(file.blob, file.name)
      ElMessage.success('文件下载成功')
    } else {
      await downloadMultipleResults(
        resultFiles.map((f: any) => ({ name: f.name, blob: f.blob })),
        `压缩结果_${Date.now()}.zip`
      )
    }
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

  .add-card-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }

  .file-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100px;
    padding: 12px 8px;
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

    &.image-card {
      width: 120px;
      padding: 8px;
    }
  }

  .file-card-close {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 1;
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

  .file-card-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 80px;
    margin-bottom: 8px;
    overflow: hidden;
    background: var(--el-fill-color);
    border-radius: 4px;

    img {
      width: 100% !important;
      height: 100% !important;
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
      display: block;
    }
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
    margin: 2px 0 0;
    font-size: 10px;
    color: var(--el-text-color-secondary);
  }

  .add-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 110px;
    cursor: pointer;
    background: transparent;
    border: 2px dashed var(--el-border-color);

    &:hover {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .options-panel {
    width: 100%;
    max-width: 500px;
    padding: 20px;
    margin-bottom: 20px;
    text-align: left;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .options-title {
    margin: 0 0 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .slider-container {
    width: 100%;
  }

  .preference-hint {
    display: flex;
    gap: 8px;
    align-items: center;
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);
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

  .result-preview-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 400px;
    margin-bottom: 16px;
  }

  .result-preview-image {
    width: 100%;
    max-width: 300px;
    max-height: 300px;
    overflow: hidden;
    background: var(--el-fill-color-lighter);
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    img {
      width: 100%;
      height: 100%;
      max-height: 300px;
      object-fit: contain;
      display: block;
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

  .result-extra-info {
    width: 100%;
    max-width: 280px;
    margin-top: 16px;
  }

  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    margin-bottom: 6px;
    background: var(--el-fill-color-lighter);
    border-radius: 6px;

    &.highlight {
      background: var(--el-color-success-light-9);

      .info-value {
        font-weight: 600;
        color: var(--el-color-success);
      }
    }
  }

  .info-label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .info-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
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
