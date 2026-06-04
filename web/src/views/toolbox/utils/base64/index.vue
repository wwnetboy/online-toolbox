<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || 'Base64转换'"
      :description="toolDescription || '图片与Base64编码互相转换，方便开发使用'"
    />
    <PermissionGuard
      feature-id="base64-converter"
      feature-name="Base64转换"
      ref="permissionGuardRef"
    >
      <!-- 转换模式选择 -->
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || '转换模式' }}</span>
        </div>
        <div class="mode-selector">
          <ElRadioGroup v-model="convertMode" size="large">
            <ElRadioButton value="imageToBase64">图片转Base64</ElRadioButton>
            <ElRadioButton value="base64ToImage">Base64转图片</ElRadioButton>
          </ElRadioGroup>
        </div>
      </ElCard>
      <!-- 图片转Base64模式 -->
      <template v-if="convertMode === 'imageToBase64'">
        <ElRow :gutter="16">
          <ElCol :span="12" :xs="24" :sm="24" :md="12">
            <ElCard shadow="never" class="art-card">
              <div class="text-base font-medium text-g-800 mb-4">上传图片</div>
              <div
                class="upload-area"
                :class="{ 'is-dragging': isDragging }"
                @click="triggerFileSelect"
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
                @dragover="handleDragOver"
                @drop="handleDrop"
              >
                <template v-if="!imagePreview">
                  <Icon icon="ri:image-add-line" class="text-5xl text-g-300 mb-3" />
                  <p class="text-base text-g-600 mb-2">点击或拖拽图片到此处上传</p>
                  <p class="text-sm text-g-400">支持 JPG/PNG/GIF/WEBP/BMP 格式</p>
                </template>
                <template v-else>
                  <div class="image-preview">
                    <img :src="imagePreview" alt="preview" />
                    <div class="image-info">
                      <p class="text-sm text-g-700">{{ selectedFile?.name }}</p>
                      <p class="text-xs text-g-400">{{
                        formatFileSize(selectedFile?.size || 0)
                      }}</p>
                    </div>
                    <div class="image-remove" @click.stop="clearImage"
                      ><ElIcon><Close /></ElIcon
                    ></div>
                  </div>
                </template>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                hidden
                @change="handleFileSelect"
              />
              <template v-if="imagePreview">
                <div class="options-section">
                  <div class="text-sm font-medium text-g-600 mb-3">输出格式</div>
                  <ElRadioGroup v-model="preferenceOptions.format">
                    <ElRadio value="data-uri">带Data URI前缀</ElRadio>
                    <ElRadio value="pure">纯Base64</ElRadio>
                  </ElRadioGroup>
                  <p class="text-xs text-g-400 mt-2">{{
                    preferenceOptions.format === 'data-uri'
                      ? '格式: data:image/xxx;base64,...'
                      : '格式: 纯Base64字符串'
                  }}</p>
                </div>
                <div class="action-section">
                  <ElButton
                    type="primary"
                    size="large"
                    @click="convertToBase64"
                    :loading="isConverting"
                    >开始转换</ElButton
                  >
                </div>
              </template>
            </ElCard>
          </ElCol>
          <ElCol :span="12" :xs="24" :sm="24" :md="12">
            <ElCard shadow="never" class="art-card h-full">
              <div class="text-base font-medium text-g-800 mb-4">转换结果</div>
              <template v-if="base64Result">
                <div class="result-info">
                  <div class="info-row"
                    ><span class="label">字符长度：</span
                    ><span class="value">{{ base64Result.size.toLocaleString() }}</span></div
                  >
                  <div class="info-row"
                    ><span class="label">MIME类型：</span
                    ><span class="value">{{ base64Result.mimeType }}</span></div
                  >
                </div>
                <ElInput
                  v-model="base64Result.base64"
                  type="textarea"
                  :rows="10"
                  readonly
                  class="result-textarea"
                />
                <div class="result-actions">
                  <ElButton type="primary" @click="copyBase64"
                    ><ElIcon class="mr-1"><CopyDocument /></ElIcon>一键复制</ElButton
                  >
                </div>
              </template>
              <div v-else class="empty-result">
                <Icon icon="ri:file-code-line" class="text-5xl text-g-300 mb-3" />
                <p class="text-g-400">上传图片后转换结果将显示在这里</p>
              </div>
            </ElCard>
          </ElCol>
        </ElRow>
      </template>
      <!-- Base64转图片模式 -->
      <template v-else>
        <ElRow :gutter="16">
          <ElCol :span="12" :xs="24" :sm="24" :md="12">
            <ElCard shadow="never" class="art-card">
              <div class="text-base font-medium text-g-800 mb-4">输入Base64</div>
              <ElInput
                v-model="base64Input"
                type="textarea"
                :rows="14"
                placeholder="请粘贴Base64编码字符串（支持带Data URI前缀或纯Base64）"
                @input="validateBase64Input"
              />
              <div v-if="base64Error" class="error-message">
                <ElIcon class="mr-1"><Warning /></ElIcon>{{ base64Error }}
              </div>
              <div class="action-section">
                <ElButton
                  type="primary"
                  size="large"
                  @click="convertToImage"
                  :loading="isConverting"
                  :disabled="!base64Input || !!base64Error"
                  >转换为图片</ElButton
                >
                <ElButton size="large" @click="clearBase64Input">清空</ElButton>
              </div>
            </ElCard>
          </ElCol>
          <ElCol :span="12" :xs="24" :sm="24" :md="12">
            <ElCard shadow="never" class="art-card h-full">
              <div class="text-base font-medium text-g-800 mb-4">图片预览</div>
              <template v-if="imageResult">
                <div class="preview-image">
                  <img :src="imageResultUrl" alt="preview" />
                </div>
                <div class="result-info mt-4">
                  <div class="info-row"
                    ><span class="label">文件名：</span
                    ><span class="value">{{ imageResult.fileName }}</span></div
                  >
                  <div class="info-row"
                    ><span class="label">尺寸：</span
                    ><span class="value"
                      >{{ imageResult.width }} × {{ imageResult.height }}</span
                    ></div
                  >
                  <div class="info-row"
                    ><span class="label">类型：</span
                    ><span class="value">{{ imageResult.mimeType }}</span></div
                  >
                </div>
                <div class="result-actions">
                  <ElButton type="primary" @click="downloadImage"
                    ><ElIcon class="mr-1"><Download /></ElIcon>下载图片</ElButton
                  >
                </div>
              </template>
              <div v-else class="empty-result">
                <Icon icon="ri:image-line" class="text-5xl text-g-300 mb-3" />
                <p class="text-g-400">输入Base64后转换结果将显示在这里</p>
              </div>
            </ElCard>
          </ElCol>
        </ElRow>
      </template>
    </PermissionGuard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">Base64转换工具支持图片与Base64编码的互相转换：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>图片转Base64：将图片转换为Base64编码字符串</li>
          <li>Base64转图片：将Base64编码还原为图片文件</li>
          <li>支持多种图片格式：JPG/PNG/GIF/WEBP/BMP</li>
          <li>所有处理在浏览器本地完成</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Close, CopyDocument, Download, Warning } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import {
    imageToBase64,
    base64ToImage,
    validateBase64,
    type ImageToBase64Options,
    type ImageToBase64Result,
    type Base64ToImageResult
  } from '@/processors/image/base64'
  import { usePreference } from '@/hooks/core/usePreference'
  import { saveAs } from 'file-saver'

  defineOptions({ name: 'Base64Page' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const fileInputRef = ref<HTMLInputElement>()
  const { options: preferenceOptions } = usePreference('base64-converter', {
    convertMode: 'imageToBase64' as 'imageToBase64' | 'base64ToImage',
    format: 'data-uri' as 'data-uri' | 'pure'
  })
  const convertMode = computed({
    get: () => preferenceOptions.value.convertMode,
    set: (val) => {
      preferenceOptions.value.convertMode = val
    }
  })
  const isDragging = ref(false)
  const isConverting = ref(false)
  const selectedFile = ref<File | null>(null)
  const imagePreview = ref<string>('')
  const base64Options = computed({
    get: () => ({ format: preferenceOptions.value.format, quality: 100 }) as ImageToBase64Options,
    set: (val) => {
      preferenceOptions.value.format = val.format
    }
  })
  const base64Result = ref<ImageToBase64Result | null>(null)
  const base64Input = ref('')
  const base64Error = ref('')
  const imageResult = ref<Base64ToImageResult | null>(null)
  const imageResultUrl = computed(() =>
    imageResult.value ? URL.createObjectURL(imageResult.value.file) : ''
  )

  // 清理 Blob URLs，防止内存泄漏
  onUnmounted(() => {
    if (imageResultUrl.value) {
      URL.revokeObjectURL(imageResultUrl.value)
    }
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  const triggerFileSelect = () => {
    if (!imagePreview.value) fileInputRef.value?.click()
  }
  const handleFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) processFile(file)
  }
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = true
  }
  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = false
  }
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
  }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = false
    const file = e.dataTransfer?.files?.[0]
    if (file) processFile(file)
  }
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      ElMessage.error('请选择图片文件')
      return
    }
    selectedFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
    base64Result.value = null
  }
  const clearImage = () => {
    selectedFile.value = null
    imagePreview.value = ''
    base64Result.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
  const convertToBase64 = async () => {
    if (!selectedFile.value) {
      ElMessage.warning('请先上传图片')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    isConverting.value = true
    try {
      const result = await imageToBase64(selectedFile.value, base64Options.value)
      base64Result.value = result
      ElMessage.success('转换成功！')
      // 记录功能使用
      permissionGuardRef.value?.recordUsage()
    } catch (error: any) {
      ElMessage.error(error.message || '转换失败')
    } finally {
      isConverting.value = false
    }
  }
  const copyBase64 = async () => {
    if (!base64Result.value) return
    try {
      await navigator.clipboard.writeText(base64Result.value.base64)
      ElMessage.success('已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败，请手动复制')
    }
  }
  const validateBase64Input = () => {
    if (!base64Input.value.trim()) {
      base64Error.value = ''
      return
    }
    const result = validateBase64(base64Input.value)
    base64Error.value = result.valid ? '' : result.error || '无效的Base64格式'
  }
  const clearBase64Input = () => {
    base64Input.value = ''
    base64Error.value = ''
    imageResult.value = null
  }
  const convertToImage = async () => {
    if (!base64Input.value.trim()) {
      ElMessage.warning('请输入Base64编码')
      return
    }
    const validation = validateBase64(base64Input.value)
    if (!validation.valid) {
      ElMessage.error(validation.error || '无效的Base64格式')
      return
    }
    isConverting.value = true
    try {
      const result = await base64ToImage(base64Input.value)
      imageResult.value = result
      ElMessage.success('转换成功！')
    } catch (error: any) {
      ElMessage.error(error.message || '转换失败')
    } finally {
      isConverting.value = false
    }
  }
  const downloadImage = () => {
    if (!imageResult.value) return
    saveAs(imageResult.value.file, imageResult.value.fileName)
    ElMessage.success('图片下载成功')
  }
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

  .mode-selector {
    text-align: center;
  }

  .upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    border: 2px dashed var(--el-border-color);
    border-radius: var(--custom-radius);
    transition: all 0.3s;

    &:hover,
    &.is-dragging {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .image-preview {
    position: relative;
    width: 100%;
    text-align: center;

    img {
      max-width: 100%;
      max-height: 150px;
      object-fit: contain;
      border-radius: 4px;
    }

    .image-info {
      margin-top: 12px;
    }
  }

  .image-remove {
    position: absolute;
    top: -8px;
    right: calc(50% - 80px);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    font-size: 12px;
    color: #fff;
    cursor: pointer;
    background: var(--el-color-danger);
    border-radius: 50%;

    &:hover {
      background: var(--el-color-danger-dark-2);
    }
  }

  .options-section {
    padding-top: 20px;
    margin-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .action-section {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 20px;
    text-align: center;
  }

  .result-info {
    padding: 12px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;

    .label {
      color: var(--el-text-color-secondary);
    }

    .value {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  .result-textarea {
    :deep(.el-textarea__inner) {
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
    }
  }

  .result-actions {
    margin-top: 16px;
    text-align: center;
  }

  .empty-result {
    padding: 60px 20px;
    text-align: center;
  }

  .preview-image {
    padding: 20px;
    text-align: center;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;

    img {
      max-width: 100%;
      max-height: 200px;
      object-fit: contain;
      border-radius: 4px;
    }
  }

  .error-message {
    display: flex;
    align-items: center;
    margin-top: 8px;
    font-size: 14px;
    color: var(--el-color-danger);
  }

  .h-full {
    height: 100%;
  }
</style>
