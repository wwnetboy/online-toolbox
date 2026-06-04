<template>
  <ToolPageLayout
    feature-id="image-convert"
    feature-name="图片格式转换"
    :title="toolName || '图片格式转换'"
    :description="toolDescription || '支持 JPG/PNG/BMP/WEBP/GIF 格式互转'"
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
          <p class="text-xs text-g-400 mt-3">支持 JPG/PNG/BMP/WEBP/GIF 格式</p>
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

            <!-- 转换设置 -->
            <div class="options-panel">
              <h4 class="options-title">转换设置</h4>
              <ElForm :model="convertOptions" label-width="100px" size="default">
                <ElFormItem label="目标格式">
                  <ElRadioGroup v-model="convertOptions.targetFormat">
                    <ElRadioButton value="jpg">JPG</ElRadioButton>
                    <ElRadioButton value="png">PNG</ElRadioButton>
                    <ElRadioButton value="bmp">BMP</ElRadioButton>
                    <ElRadioButton value="webp">WEBP</ElRadioButton>
                    <ElRadioButton value="gif">GIF</ElRadioButton>
                  </ElRadioGroup>
                </ElFormItem>
                <ElFormItem label="图片质量">
                  <div class="slider-container">
                    <ElSlider
                      v-model="convertOptions.quality"
                      :min="10"
                      :max="100"
                      :step="10"
                      show-input
                    />
                    <p class="text-xs text-g-400 mt-1">质量越高，文件越大</p>
                  </div>
                </ElFormItem>
              </ElForm>
            </div>

            <!-- 操作按钮 -->
            <div class="file-actions">
              <ElButton type="primary" size="large" @click="handleConvert">
                开始转换 ({{ fileCount }}个文件)
              </ElButton>
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
            title="转换完成！"
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
                <p class="result-file-name">批量转换完成</p>
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
            title="转换失败"
            :message="errorMsg || '转换失败'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="handleFileSelect"
      />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">图片格式转换工具支持多种格式互转：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持 JPG、PNG、BMP、WEBP、GIF 格式互转</li>
          <li>可调节输出图片质量</li>
          <li>支持批量处理，最多50个文件</li>
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
  import { useHistory } from '@/hooks/core/useHistory'
  import { createImageConvertProcessor, type ImageConvertOptions } from '@/processors/image/convert'

  defineOptions({ name: 'ImageConvertPage' })

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
    accept: 'image/*',
    multiple: true,
    maxSize: 20,
    maxCount: 50
  })

  // 转换选项
  const convertOptions = ref<ImageConvertOptions>({
    targetFormat: 'jpg',
    quality: 90
  })

  // 工具处理器
  const processor = createImageConvertProcessor()
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
    featureId: 'image-convert',
    featureName: '图片格式转换',
    successMessage: '图片转换完成！',
    errorMessage: '转换失败'
  })

  // 历史记录
  const { addRecord } = useHistory()

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 获取结果文件图标
  const getResultFileIcon = () => {
    if (!resultData.value?.files?.length) return 'ri:image-line'
    const targetFormat = convertOptions.value.targetFormat
    switch (targetFormat) {
      case 'gif':
        return 'ri:file-gif-line'
      default:
        return 'ri:file-image-line'
    }
  }

  // 获取结果文件名
  const getResultFileName = () => {
    if (!resultData.value?.files) return ''
    const count = resultData.value.files.length
    if (count === 1) {
      return resultData.value.files[0].name
    }
    return `转换完成 (${count}个文件)`
  }

  // 获取结果预览 URL
  const getResultPreviewUrl = () => {
    if (!resultData.value?.files?.length) return ''
    const file = resultData.value.files[0]
    return URL.createObjectURL(file.blob)
  }

  // 处理转换
  const handleConvert = async () => {
    if (fileCount.value === 0) {
      ElMessage.warning('请先上传图片')
      return
    }

    const result = await processFiles(
      files.value.map((f) => f.file),
      convertOptions.value
    )

    // 保存历史记录
    if (result?.success && result.data?.files) {
      result.data.files.forEach((file: any) => {
        const blobUrl = URL.createObjectURL(file.blob)
        addRecord({
          toolId: 'image-convert',
          toolName: '格式转换',
          fileName: file.name,
          outputFileName: file.name,
          fileSize: file.blob.size,
          outputFileSize: file.blob.size,
          processType: 'convert',
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
        `转换结果_${Date.now()}.zip`
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

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
