<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '图片水印'"
      :description="toolDescription || '批量为图片添加文字或图片水印，保护版权'"
    />
    <PermissionGuard feature-id="image-watermark" feature-name="图片水印" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '图片水印' }}</span>
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
            <p class="text-base text-g-600 mb-2">将图片拖拽到虚框内</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">点击上传图片(小于20M)</ElButton>
            <p class="text-xs text-g-400 mt-3">支持 JPG/PNG 格式，最多50个文件</p>
          </template>
          <template v-if="hasFiles && !isProcessing && !processResult">
            <div class="file-grid-container">
              <div class="file-grid">
                <div v-for="file in files" :key="file.id" class="file-card image-card">
                  <div class="file-card-close" @click.stop="removeFile(file.id)">
                    <ElIcon><Close /></ElIcon>
                  </div>
                  <div class="file-card-preview">
                    <img v-if="file.preview" :src="file.preview" alt="preview" />
                    <Icon v-else icon="ri:image-line" class="text-4xl text-warning" />
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
              <div class="options-panel">
                <h4 class="options-title">水印设置</h4>
                <ElForm :model="watermarkOptions" label-width="100px" size="default">
                  <ElFormItem label="水印类型">
                    <ElRadioGroup v-model="watermarkOptions.type">
                      <ElRadioButton value="text">文字水印</ElRadioButton>
                      <ElRadioButton value="image">图片水印</ElRadioButton>
                    </ElRadioGroup>
                  </ElFormItem>
                  <template v-if="watermarkOptions.type === 'text'">
                    <ElFormItem label="水印文字">
                      <ElInput
                        v-model="watermarkOptions.content"
                        placeholder="请输入水印文字"
                        maxlength="50"
                        show-word-limit
                      />
                    </ElFormItem>
                    <ElFormItem label="字体大小">
                      <ElSlider
                        v-model="watermarkOptions.fontSize"
                        :min="12"
                        :max="100"
                        :step="2"
                        show-input
                      />
                    </ElFormItem>
                    <ElFormItem label="字体颜色">
                      <ElColorPicker v-model="watermarkOptions.fontColor" show-alpha />
                      <span class="ml-2 text-g-400">{{ watermarkOptions.fontColor }}</span>
                    </ElFormItem>
                  </template>
                  <template v-if="watermarkOptions.type === 'image'">
                    <ElFormItem label="水印图片">
                      <ElUpload
                        :auto-upload="false"
                        :show-file-list="false"
                        accept="image/png"
                        :on-change="handleWatermarkImageChange"
                      >
                        <ElButton
                          ><ElIcon class="mr-1"><Upload /></ElIcon>选择图片</ElButton
                        >
                      </ElUpload>
                      <p v-if="watermarkOptions.watermarkImage" class="text-sm text-g-400 mt-2"
                        >已选择水印图片</p
                      >
                    </ElFormItem>
                    <ElFormItem label="水印大小">
                      <ElSlider
                        v-model="watermarkOptions.watermarkSize"
                        :min="10"
                        :max="100"
                        :step="5"
                        show-input
                      />
                      <p class="text-xs text-g-400 mt-1">相对于图片宽度的百分比</p>
                    </ElFormItem>
                  </template>
                  <ElFormItem label="水印位置">
                    <ElSelect v-model="watermarkOptions.position" placeholder="选择位置">
                      <ElOption label="左上角" value="top-left" />
                      <ElOption label="顶部居中" value="top-center" />
                      <ElOption label="右上角" value="top-right" />
                      <ElOption label="左侧居中" value="center-left" />
                      <ElOption label="居中" value="center" />
                      <ElOption label="右侧居中" value="center-right" />
                      <ElOption label="左下角" value="bottom-left" />
                      <ElOption label="底部居中" value="bottom-center" />
                      <ElOption label="右下角" value="bottom-right" />
                    </ElSelect>
                  </ElFormItem>
                  <ElFormItem label="透明度">
                    <ElSlider
                      v-model="watermarkOptions.opacity"
                      :min="0"
                      :max="100"
                      :step="5"
                      show-input
                    />
                  </ElFormItem>
                  <ElFormItem v-if="watermarkOptions.type === 'text'" label="旋转角度">
                    <ElSlider
                      v-model="watermarkOptions.rotation"
                      :min="-180"
                      :max="180"
                      :step="15"
                      show-input
                    />
                  </ElFormItem>
                </ElForm>
              </div>
              <div class="file-actions">
                <ElButton
                  type="primary"
                  size="large"
                  :disabled="!isWatermarkValid"
                  @click="handleAddWatermark"
                  >添加水印 ({{ fileCount }}个文件)</ElButton
                >
                <ElButton size="large" @click="clearFiles">清空</ElButton>
              </div>
              <p v-if="!isWatermarkValid" class="text-xs text-g-400 mt-2">{{
                watermarkOptions.type === 'text' ? '请输入水印文字' : '请选择水印图片'
              }}</p>
            </div>
          </template>
          <template v-if="isProcessing">
            <ToolResultView type="loading" :percentage="progress.progress">
              <template #progress>
                <p class="text-sm text-g-400 mb-2">{{ progress.currentFileName }}</p>
                <ElProgress :percentage="progress.progress" class="w-full max-w-md" />
                <p class="text-xs text-g-400 mt-2">正在处理第 {{ progress.currentIndex + 1 }} / {{ progress.totalFiles }} 个文件</p>
              </template>
            </ToolResultView>
          </template>
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="水印添加完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-image-line" class="text-5xl text-primary" />
                  <p class="result-file-name">{{ getResultFileName() }}</p>
                </div>
              </template>
              <template #actions>
                <ElButton type="primary" @click="downloadResult">
                  <ElIcon class="mr-1"><Download /></ElIcon>{{ processResult.data?.files?.length === 1 ? '下载文件' : '打包下载' }}
                </ElButton>
                <ElButton @click="handleContinue">继续处理</ElButton>
              </template>
            </ToolResultView>
            <ToolResultView
              v-else
              type="error"
              title="添加水印失败"
              :message="processResult.error || '添加水印失败'"
              @retry="handleRetry"
              @reset="handleContinue"
            />
          </template>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          @change="handleFileSelect"
        />
      </ElCard>
    </PermissionGuard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">图片水印工具可以批量为图片添加水印：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持文字水印和图片水印</li>
          <li>可自定义水印位置、透明度、旋转角度</li>
          <li>支持批量处理，最多50个文件</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    Loading,
    CircleClose,
    Download,
    Refresh,
    Plus,
    Close,
    Upload
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
  import JSZip from 'jszip'
  import { saveAs } from 'file-saver'

  defineOptions({ name: 'ImageWatermarkPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
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
    accept: 'image/jpeg,image/png',
    multiple: true,
    maxSize: 20,
    maxCount: 50
  })

  const { isProcessing, progress } = useFileProcessor()

  // 历史记录
  const { addRecord } = useHistory()

  const watermarkOptions = ref({
    type: 'text' as 'text' | 'image',
    content: '版权所有',
    fontSize: 36,
    fontColor: 'rgba(255, 255, 255, 0.5)',
    watermarkImage: null as File | null,
    watermarkSize: 20,
    position: 'bottom-right' as string,
    opacity: 50,
    rotation: 0
  })

  const processResult = ref<any>(null)

  const isWatermarkValid = computed(() => {
    if (watermarkOptions.value.type === 'text') {
      return watermarkOptions.value.content.trim().length > 0
    }
    return watermarkOptions.value.watermarkImage !== null
  })

  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const handleWatermarkImageChange = (file: any) => {
    watermarkOptions.value.watermarkImage = file.raw
  }

  const getResultFileName = () => {
    if (!processResult.value?.data?.files) return ''
    const fileCount = processResult.value.data.files.length
    if (fileCount === 1) {
      return processResult.value.data.files[0].name
    }
    return `水印添加完成 (${fileCount}个文件)`
  }

  const addWatermarkToImage = async (
    imageFile: File,
    options: typeof watermarkOptions.value
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        ctx.globalAlpha = options.opacity / 100

        if (options.type === 'text') {
          ctx.font = `${options.fontSize}px Arial`
          ctx.fillStyle = options.fontColor
          const metrics = ctx.measureText(options.content)
          const textWidth = metrics.width
          const textHeight = options.fontSize
          const { x, y } = calculatePosition(
            canvas.width,
            canvas.height,
            textWidth,
            textHeight,
            options.position
          )
          ctx.save()
          ctx.translate(x + textWidth / 2, y + textHeight / 2)
          ctx.rotate((options.rotation * Math.PI) / 180)
          ctx.translate(-(x + textWidth / 2), -(y + textHeight / 2))
          ctx.fillText(options.content, x, y + textHeight)
          ctx.restore()
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob'))
            }
          }, 'image/png')
        } else if (options.type === 'image' && options.watermarkImage) {
          const watermarkImg = new Image()
          const watermarkReader = new FileReader()
          watermarkReader.onload = (e) => {
            watermarkImg.src = e.target?.result as string
          }
          watermarkImg.onload = () => {
            const watermarkWidth = (canvas.width * options.watermarkSize) / 100
            const watermarkHeight = (watermarkImg.height / watermarkImg.width) * watermarkWidth
            const { x, y } = calculatePosition(
              canvas.width,
              canvas.height,
              watermarkWidth,
              watermarkHeight,
              options.position
            )
            ctx.drawImage(watermarkImg, x, y, watermarkWidth, watermarkHeight)
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to create blob'))
              }
            }, 'image/png')
          }
          watermarkImg.onerror = () => reject(new Error('Failed to load watermark image'))
          watermarkReader.readAsDataURL(options.watermarkImage)
        }
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      reader.readAsDataURL(imageFile)
    })
  }

  const calculatePosition = (
    canvasWidth: number,
    canvasHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    position: string
  ) => {
    const padding = 20
    let x = 0,
      y = 0
    switch (position) {
      case 'top-left':
        x = padding
        y = padding
        break
      case 'top-center':
        x = (canvasWidth - watermarkWidth) / 2
        y = padding
        break
      case 'top-right':
        x = canvasWidth - watermarkWidth - padding
        y = padding
        break
      case 'center-left':
        x = padding
        y = (canvasHeight - watermarkHeight) / 2
        break
      case 'center':
        x = (canvasWidth - watermarkWidth) / 2
        y = (canvasHeight - watermarkHeight) / 2
        break
      case 'center-right':
        x = canvasWidth - watermarkWidth - padding
        y = (canvasHeight - watermarkHeight) / 2
        break
      case 'bottom-left':
        x = padding
        y = canvasHeight - watermarkHeight - padding
        break
      case 'bottom-center':
        x = (canvasWidth - watermarkWidth) / 2
        y = canvasHeight - watermarkHeight - padding
        break
      case 'bottom-right':
        x = canvasWidth - watermarkWidth - padding
        y = canvasHeight - watermarkHeight - padding
        break
    }
    return { x, y }
  }

  const handleAddWatermark = async () => {
    if (fileCount.value === 0) {
      ElMessage.warning('请先上传图片')
      return
    }
    if (!isWatermarkValid.value) {
      ElMessage.warning(
        watermarkOptions.value.type === 'text' ? '请输入水印文字' : '请选择水印图片'
      )
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    progress.value = {
      progress: 0,
      currentIndex: 0,
      totalFiles: files.value.length,
      currentFileName: '',
      processedCount: 0
    }
    try {
      const fileList = files.value.map((f) => f.file)
      const results: Array<{ name: string; blob: Blob }> = []
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        progress.value = {
          progress: Math.round(((i + 1) / fileList.length) * 100),
          currentIndex: i,
          totalFiles: fileList.length,
          currentFileName: file.name,
          processedCount: i
        }
        try {
          const blob = await addWatermarkToImage(file, watermarkOptions.value)
          results.push({ name: file.name.replace(/\.[^.]+$/, '_watermark.png'), blob })
        } catch {
          // 错误已在 addWatermarkToImage 中处理
        }
      }
      processResult.value = { success: true, data: { files: results } }

      // 保存历史记录
      results.forEach((file, index) => {
        const blobUrl = URL.createObjectURL(file.blob)
        addRecord({
          toolId: 'image-watermark',
          toolName: '图片水印',
          fileName: fileList[index].name,
          outputFileName: file.name,
          fileSize: fileList[index].size,
          outputFileSize: file.blob.size,
          processType: 'watermark',
          downloadUrl: blobUrl
        })
      })

      ElMessage.success('水印添加完成！')
      // 记录功能使用
      permissionGuardRef.value?.recordUsage()
    } catch (error: any) {
      ElMessage.error(error.message || '添加水印失败，请重试')
      processResult.value = { success: false, error: error.message || '添加水印失败，请重试' }
    }
  }

  const downloadResult = async () => {
    if (!processResult.value?.data?.files) {
      ElMessage.error('没有可下载的文件')
      return
    }
    const resultFiles = processResult.value.data.files
    if (resultFiles.length === 1) {
      saveAs(resultFiles[0].blob, resultFiles[0].name)
      ElMessage.success('文件下载成功')
    } else {
      const zip = new JSZip()
      resultFiles.forEach((file: any) => {
        zip.file(file.name, file.blob)
      })
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `水印图片_${Date.now()}.zip`)
      ElMessage.success('文件打包下载成功')
    }
  }

  const handleContinue = () => {
    processResult.value = null
    clearFiles()
  }
  const handleRetry = () => {
    processResult.value = null
  }

  // 清理 Blob URLs，防止内存泄漏
  onUnmounted(() => {
    if (processResult.value?.data?.files) {
      processResult.value.data.files.forEach((file: any) => {
        if (file.blob) {
          URL.revokeObjectURL(URL.createObjectURL(file.blob))
        }
      })
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
      width: 100%;
      height: 100%;
      object-fit: cover;
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

  .file-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
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
    max-width: 200px;
    margin: 12px 0 0;
    overflow: hidden;
    font-size: 14px;
    color: var(--el-text-color-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
