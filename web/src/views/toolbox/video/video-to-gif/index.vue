<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '视频转GIF'"
      :description="toolDescription || '将视频片段转换为GIF动图'"
    />
    <PermissionGuard feature-id="video-to-gif" feature-name="视频转GIF" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || $t('toolbox.video.videoToGif.title') }}</span>
          <ElAlert
            v-if="convertResult?.success"
            type="success"
            :closable="false"
            class="result-alert"
          >
            <template #title>
              <span class="font-medium">转换完成</span>
              <span class="text-g-400 text-xs ml-2">GIF 动图已生成</span>
            </template>
          </ElAlert>
        </div>

        <div
          class="convert-area"
          :class="{ 'is-dragging': isDragging, 'has-file': !!currentVideo }"
        >
          <!-- 上传区域 -->
          <template v-if="!currentVideo && !convertResult">
            <div
              class="upload-zone"
              @dragenter="handleDragEnter"
              @dragleave="handleDragLeave"
              @dragover="handleDragOver"
              @drop="handleDrop"
              @click="triggerFileSelect"
            >
              <ElIcon class="upload-icon"><UploadFilled /></ElIcon>
              <p class="text-base text-g-600 mb-2">{{
                $t('toolbox.video.videoToGif.uploadTip')
              }}</p>
              <p class="text-sm text-g-400">{{ $t('toolbox.video.videoToGif.supportFormat') }}</p>
            </div>
          </template>

          <!-- 编辑区域 -->
          <template v-if="currentVideo && !convertResult">
            <div class="edit-container">
              <div class="preview-section">
                <h4 class="section-title">视频预览</h4>
                <div class="video-preview-box">
                  <video
                    ref="videoRef"
                    :src="currentVideo"
                    controls
                    class="preview-video"
                    @loadedmetadata="handleVideoLoaded"
                  ></video>
                </div>
                <div class="video-info" v-if="videoInfo">
                  <span>时长：{{ formatDuration(videoInfo.duration) }}</span>
                  <span>尺寸：{{ videoInfo.width }} × {{ videoInfo.height }}</span>
                </div>
              </div>

              <div class="controls-section">
                <div class="controls-header">
                  <h4 class="section-title">转换设置</h4>
                  <ElButton
                    v-if="hasPreference"
                    type="info"
                    link
                    size="small"
                    @click="handleResetDefault"
                  >
                    <ElIcon class="mr-1"><RefreshRight /></ElIcon>
                    恢复默认
                  </ElButton>
                </div>

                <div class="control-group">
                  <p class="control-label">时间范围</p>
                  <div class="time-inputs">
                    <div class="time-input-item">
                      <span class="input-label">{{
                        $t('toolbox.video.videoToGif.startTime')
                      }}</span>
                      <ElInputNumber
                        v-model="options.startTime"
                        :min="0"
                        :max="maxStartTime"
                        :step="0.1"
                        :precision="1"
                        size="default"
                      />
                      <span class="input-unit">秒</span>
                    </div>
                    <div class="time-input-item">
                      <span class="input-label">{{ $t('toolbox.video.videoToGif.endTime') }}</span>
                      <ElInputNumber
                        v-model="options.endTime"
                        :min="minEndTime"
                        :max="maxEndTime"
                        :step="0.1"
                        :precision="1"
                        size="default"
                      />
                      <span class="input-unit">秒</span>
                    </div>
                  </div>
                  <div class="time-slider">
                    <ElSlider
                      v-model="timeRange"
                      range
                      :min="0"
                      :max="sliderMax"
                      :step="0.1"
                      :format-tooltip="formatSliderTooltip"
                      @change="handleSliderChange"
                    />
                  </div>
                </div>

                <div class="control-group">
                  <p class="control-label">{{ $t('toolbox.video.videoToGif.width') }}</p>
                  <div class="width-input">
                    <ElInputNumber
                      v-model="options.width"
                      :min="100"
                      :max="1920"
                      :step="10"
                      size="default"
                    />
                    <span class="input-unit">px</span>
                  </div>
                  <div class="preset-buttons">
                    <ElButton size="small" @click="setPresetWidth(320)">320px</ElButton>
                    <ElButton size="small" @click="setPresetWidth(480)">480px</ElButton>
                    <ElButton size="small" @click="setPresetWidth(640)">640px</ElButton>
                    <ElButton size="small" @click="setPresetWidth(800)">800px</ElButton>
                  </div>
                </div>

                <div class="control-group">
                  <p class="control-label">{{ $t('toolbox.video.videoToGif.fps') }}</p>
                  <div class="fps-input">
                    <ElSlider
                      v-model="options.fps"
                      :min="5"
                      :max="30"
                      :step="1"
                      show-input
                      input-size="small"
                    />
                  </div>
                </div>

                <div class="result-preview">
                  <Icon icon="ri:information-line" class="text-primary" />
                  <span
                    >预计GIF时长：{{ formatDuration(gifDuration) }}，帧数：{{
                      estimatedFrames
                    }}</span
                  >
                </div>

                <div class="action-buttons">
                  <ElButton @click="resetVideo">重新选择</ElButton>
                  <ElButton
                    type="primary"
                    :loading="isConverting"
                    :disabled="!canConvert"
                    @click="handleConvert"
                  >
                    <Icon icon="ri:magic-line" class="mr-1" />
                    {{
                      isConverting
                        ? $t('toolbox.video.videoToGif.converting')
                        : $t('toolbox.video.videoToGif.startConvert')
                    }}
                  </ElButton>
                </div>
              </div>
            </div>

            <!-- 转换进度 -->
            <div v-if="isConverting" class="progress-overlay">
              <div class="progress-content">
                <ElProgress
                  type="circle"
                  :percentage="convertProgress"
                  :width="120"
                  :stroke-width="8"
                />
                <p class="progress-text">{{ $t('toolbox.video.videoToGif.converting') }}...</p>
              </div>
            </div>
          </template>

          <!-- 转换结果 -->
          <template v-if="convertResult">
            <div class="result-container">
              <template v-if="convertResult.success">
                <div class="gif-preview">
                  <img :src="gifPreviewUrl" alt="GIF Preview" class="preview-gif" />
                </div>

                <div class="result-stats">
                  <span>{{ convertResult.data?.width }} × {{ convertResult.data?.height }}</span>
                  <span class="mx-2">|</span>
                  <span>{{ convertResult.data?.frameCount }} 帧</span>
                  <span class="mx-2">|</span>
                  <span>{{ formatFileSize(convertResult.data?.size || 0) }}</span>
                </div>

                <div class="action-buttons">
                  <ElButton type="primary" @click="handleDownload">
                    <ElIcon class="mr-1"><Download /></ElIcon>
                    {{ $t('toolbox.video.videoToGif.download') }}
                  </ElButton>
                  <ElButton @click="handleContinue">继续转换</ElButton>
                </div>
              </template>
              <template v-else>
                <ElIcon class="text-5xl text-danger mb-4"><CircleClose /></ElIcon>
                <h3 class="text-lg font-medium mb-2 text-danger">转换失败</h3>
                <p class="text-g-500 mb-4">{{ convertResult.error }}</p>
                <div class="action-buttons">
                  <ElButton type="primary" @click="handleRetry">
                    <ElIcon class="mr-1"><Refresh /></ElIcon>重试
                  </ElButton>
                  <ElButton @click="handleContinue">返回</ElButton>
                </div>
              </template>
            </div>
          </template>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          hidden
          @change="handleFileSelect"
        />
      </ElCard>
    </PermissionGuard>

    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">视频转GIF工具可以将视频片段转换为GIF动图：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持 MP4、WebM、MOV、AVI 格式视频</li>
          <li>可自定义GIF的起始和结束时间</li>
          <li>可调整GIF宽度（自动保持宽高比）</li>
          <li>可设置帧率（5-30帧/秒）</li>
          <li>最大支持200MB视频文件</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, watch, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    UploadFilled,
    CircleClose,
    Download,
    Refresh,
    RefreshRight
  } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import {
    createVideoToGifProcessor,
    validateVideo,
    getVideoInfo
  } from '@/processors/video/video-to-gif'
  import type { VideoToGifOptions, VideoInfo, VideoToGifResult } from '@/processors/video/types'
  import { VIDEO_CONFIG } from '@/processors/video/types'
  import { saveAs } from 'file-saver'
  import { useHistory } from '@/hooks/core/useHistory'
  import { usePreference } from '@/hooks/core/usePreference'

  defineOptions({ name: 'VideoToGifPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()

  // 历史记录
  const { addRecord } = useHistory()

  // 偏好设置类型（只保存width和fps，时间范围是视频相关的）
  interface GifPreferenceOptions {
    width: number
    fps: number
  }

  // 默认偏好设置
  const defaultPreferenceOptions: GifPreferenceOptions = {
    width: VIDEO_CONFIG.videoToGif.defaultWidth,
    fps: VIDEO_CONFIG.videoToGif.defaultFps
  }

  // 用户偏好
  const {
    options: preferenceOptions,
    hasPreference,
    resetToDefault
  } = usePreference<GifPreferenceOptions>('video-to-gif', defaultPreferenceOptions)

  // Refs
  const fileInputRef = ref<HTMLInputElement>()
  const videoRef = ref<HTMLVideoElement>()

  // 状态
  const isDragging = ref(false)
  const currentVideo = ref('')
  const currentFile = ref<File | null>(null)
  const videoInfo = ref<VideoInfo | null>(null)
  const isConverting = ref(false)
  const convertProgress = ref(0)
  const convertResult = ref<{ success: boolean; data?: VideoToGifResult; error?: string } | null>(
    null
  )
  const gifPreviewUrl = ref('')

  // 转换选项（包含时间范围）
  const options = reactive<VideoToGifOptions>({
    startTime: 0,
    endTime: 5,
    width: preferenceOptions.value.width,
    fps: preferenceOptions.value.fps
  })

  // 监听偏好设置变化，同步到options
  watch(
    () => preferenceOptions.value,
    (newVal) => {
      options.width = newVal.width
      options.fps = newVal.fps
    },
    { immediate: true }
  )

  // 监听options中的width和fps变化，同步到偏好设置
  watch(
    () => [options.width, options.fps],
    ([newWidth, newFps]) => {
      if (newWidth !== preferenceOptions.value.width || newFps !== preferenceOptions.value.fps) {
        preferenceOptions.value.width = newWidth as number
        preferenceOptions.value.fps = newFps as number
      }
    }
  )

  // 时间范围滑块
  const timeRange = ref<[number, number]>([0, 5])

  // 计算属性
  const sliderMax = computed(() => videoInfo.value?.duration || 30)
  const maxStartTime = computed(() => Math.max(0, options.endTime - 0.1))
  const minEndTime = computed(() => options.startTime + 0.1)
  const maxEndTime = computed(() =>
    Math.min(
      videoInfo.value?.duration || 30,
      options.startTime + VIDEO_CONFIG.videoToGif.maxDuration
    )
  )
  const gifDuration = computed(() => options.endTime - options.startTime)
  const estimatedFrames = computed(() => Math.ceil(gifDuration.value * options.fps))
  const canConvert = computed(() => {
    return (
      videoInfo.value &&
      options.startTime >= 0 &&
      options.endTime > options.startTime &&
      options.width > 0 &&
      options.fps >= 5 &&
      options.fps <= 30
    )
  })

  // 清理
  onUnmounted(() => {
    if (currentVideo.value) {
      URL.revokeObjectURL(currentVideo.value)
    }
    if (gifPreviewUrl.value) {
      URL.revokeObjectURL(gifPreviewUrl.value)
    }
  })

  // 拖拽处理
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
    const file = e.dataTransfer?.files[0]
    if (file) processFile(file)
  }

  // 文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) processFile(file)
  }

  // 处理文件
  const processFile = async (file: File) => {
    // 验证文件
    const validation = validateVideo(file)
    if (!validation.valid) {
      ElMessage.error(validation.error || '文件验证失败')
      return
    }

    currentFile.value = file
    currentVideo.value = URL.createObjectURL(file)

    try {
      videoInfo.value = await getVideoInfo(file)

      // 设置默认时间范围
      const defaultEnd = Math.min(5, videoInfo.value.duration)
      options.startTime = 0
      options.endTime = defaultEnd
      timeRange.value = [0, defaultEnd]
    } catch (error: any) {
      ElMessage.error(error.message || '无法读取视频信息')
      resetVideo()
    }
  }

  // 视频加载完成
  const handleVideoLoaded = () => {
    // 视频元数据已加载
  }

  // 滑块变化
  const handleSliderChange = (val: number | number[]) => {
    if (Array.isArray(val)) {
      options.startTime = val[0]
      options.endTime = val[1]
    }
  }

  // 格式化滑块提示
  const formatSliderTooltip = (val: number) => {
    return formatDuration(val)
  }

  // 设置预设宽度
  const setPresetWidth = (width: number) => {
    options.width = width
  }

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)

    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
    }
    return `${secs}.${ms}秒`
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // 开始转换
  const handleConvert = async () => {
    if (!currentFile.value || !canConvert.value) return

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    isConverting.value = true
    convertProgress.value = 0

    try {
      const processor = createVideoToGifProcessor()
      const result = await processor.convert(currentFile.value, options, (progress) => {
        convertProgress.value = Math.round(progress)
      })

      gifPreviewUrl.value = URL.createObjectURL(result.blob)
      convertResult.value = { success: true, data: result }
      ElMessage.success('转换完成！')
      // 记录功能使用
      permissionGuardRef.value?.recordUsage()
    } catch (error: any) {
      convertResult.value = { success: false, error: error.message || '转换失败' }
      ElMessage.error(error.message || '转换失败')
    } finally {
      isConverting.value = false
    }
  }

  // 下载GIF
  const handleDownload = () => {
    if (!convertResult.value?.data) return

    const fileName = `video-to-gif-${Date.now()}.gif`
    saveAs(convertResult.value.data.blob, fileName)

    // 保存历史记录
    addRecord({
      toolId: 'video-to-gif',
      toolName: '视频转GIF',
      fileName: currentFile.value?.name || 'video',
      outputFileName: fileName,
      fileSize: currentFile.value?.size || 0,
      outputFileSize: convertResult.value.data.size,
      processType: '视频转GIF',
      downloadUrl: gifPreviewUrl.value
    })

    ElMessage.success('GIF下载成功')
  }

  // 重置视频
  const resetVideo = () => {
    if (currentVideo.value) {
      URL.revokeObjectURL(currentVideo.value)
    }
    if (gifPreviewUrl.value) {
      URL.revokeObjectURL(gifPreviewUrl.value)
    }

    currentVideo.value = ''
    currentFile.value = null
    videoInfo.value = null
    convertResult.value = null
    gifPreviewUrl.value = ''
    convertProgress.value = 0

    options.startTime = 0
    options.endTime = 5
    // 保持用户偏好的width和fps
    options.width = preferenceOptions.value.width
    options.fps = preferenceOptions.value.fps
    timeRange.value = [0, 5]
  }

  // 恢复默认设置
  const handleResetDefault = () => {
    resetToDefault()
    options.width = defaultPreferenceOptions.width
    options.fps = defaultPreferenceOptions.fps
    ElMessage.success('已恢复默认设置')
  }

  // 继续转换
  const handleContinue = () => {
    convertResult.value = null
    resetVideo()
  }

  // 重试
  const handleRetry = () => {
    convertResult.value = null
    handleConvert()
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

  .convert-area {
    position: relative;
    min-height: 400px;

    &.is-dragging .upload-zone {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    cursor: pointer;
    border: 2px dashed var(--el-border-color);
    border-radius: var(--custom-radius);
    transition: all 0.3s;

    &:hover {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .upload-icon {
    margin-bottom: 16px;
    font-size: 64px;
    color: var(--el-text-color-placeholder);
  }

  .edit-container {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 24px;

    @media (width <= 992px) {
      grid-template-columns: 1fr;
    }
  }

  .preview-section {
    display: flex;
    flex-direction: column;
  }

  .section-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .video-preview-box {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    overflow: hidden;
    background: #000;
    border-radius: 8px;
  }

  .preview-video {
    max-width: 100%;
    max-height: 400px;
  }

  .video-info {
    display: flex;
    gap: 24px;
    padding: 8px 12px;
    margin-top: 12px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-lighter);
    border-radius: 6px;
  }

  .controls-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .controls-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .section-title {
      margin: 0;
    }
  }

  .control-group {
    padding: 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .control-label {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
  }

  .time-inputs {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
  }

  .time-input-item,
  .width-input {
    display: flex;
    gap: 8px;
    align-items: center;

    .input-label {
      width: 60px;
      font-size: 13px;
      color: var(--el-text-color-regular);
    }

    .input-unit {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .time-slider {
    padding: 0 8px;
  }

  .preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .fps-input {
    padding: 0 8px;
  }

  .result-preview {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    background: var(--el-color-primary-light-9);
    border-radius: 6px;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    padding-top: 16px;
    margin-top: auto;

    .el-button {
      flex: 1;
    }
  }

  .progress-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(255 255 255 / 90%);
    border-radius: var(--custom-radius);
  }

  .progress-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }

  .progress-text {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  .result-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
  }

  .gif-preview {
    max-width: 100%;
    max-height: 400px;
    margin-bottom: 20px;
    overflow: hidden;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .preview-gif {
    display: block;
    max-width: 100%;
    max-height: 400px;
  }

  .result-info {
    display: flex;
    gap: 24px;
    padding: 12px 24px;
    margin-bottom: 20px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  /* 平板端适配 (768px - 1024px) */
  @media (width <= 1024px) and (width >= 769px) {
    .edit-container {
      grid-template-columns: 1fr 320px;
      gap: 20px;
    }

    .video-preview-box {
      min-height: 250px;
    }

    .preview-video {
      max-height: 350px;
    }

    .gif-preview {
      max-height: 350px;
    }

    .preview-gif {
      max-height: 350px;
    }
  }

  /* 移动端适配 (< 992px) - 单列布局 */
  @media (width <= 992px) {
    .edit-container {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .controls-section {
      order: 2;
    }

    .preview-section {
      order: 1;
    }
  }

  /* 移动端适配 (< 768px) */
  @media (width <= 768px) {
    .tool-header {
      margin-bottom: 16px;
    }

    .tool-title {
      font-size: 16px;
    }

    .convert-area {
      min-height: 300px;
    }

    .upload-zone {
      min-height: 200px;
      padding: 24px 16px;
    }

    .upload-icon {
      margin-bottom: 12px;
      font-size: 48px;
    }

    .section-title {
      font-size: 13px;
    }

    .video-preview-box {
      min-height: 200px;
    }

    .preview-video {
      max-height: 280px;
    }

    .video-info {
      flex-direction: column;
      gap: 8px;
      font-size: 12px;
      text-align: center;
    }

    .control-group {
      padding: 10px;
    }

    .control-label {
      font-size: 12px;
    }

    .time-inputs {
      gap: 10px;
    }

    .time-input-item,
    .width-input {
      flex-wrap: wrap;

      .input-label {
        width: 50px;
        font-size: 12px;
      }

      .input-unit {
        font-size: 12px;
      }

      .el-input-number {
        width: 120px;
      }
    }

    .preset-buttons {
      gap: 6px;

      .el-button {
        padding: 6px 10px;
        font-size: 12px;
      }
    }

    .result-preview {
      padding: 10px;
      font-size: 12px;
    }

    .result-container {
      padding: 24px 16px;
    }

    .gif-preview {
      max-height: 280px;
    }

    .preview-gif {
      max-height: 280px;
    }

    .result-info {
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
      font-size: 13px;
      text-align: center;
    }

    .action-buttons {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }

    .progress-content {
      gap: 12px;

      .el-progress {
        width: 100px !important;
      }
    }

    .progress-text {
      font-size: 13px;
    }
  }

  /* 小屏移动端适配 (< 480px) */
  @media (width <= 480px) {
    .upload-zone {
      min-height: 160px;

      p {
        font-size: 13px;
      }
    }

    .upload-icon {
      font-size: 40px;
    }

    .video-preview-box {
      min-height: 160px;
    }

    .preview-video {
      max-height: 200px;
    }

    .time-input-item,
    .width-input {
      .el-input-number {
        width: 100px;
      }
    }

    .preset-buttons {
      .el-button {
        padding: 5px 8px;
        font-size: 11px;
      }
    }

    .gif-preview {
      max-height: 200px;
    }

    .preview-gif {
      max-height: 200px;
    }
  }

  .result-alert {
    flex: 0 0 auto;
    width: auto;
    max-width: 220px;
    padding: 4px 10px;
    margin-left: 8px;
  }

  .result-alert :deep(.el-alert__content) {
    flex: none;
  }

  .result-alert :deep(.el-alert__icon) {
    font-size: 15px;
    margin-right: 6px;
  }

  .result-alert :deep(.el-alert__title) {
    font-size: 13px;
    white-space: nowrap;
  }

  .result-stats {
    margin-top: 16px;
    margin-bottom: 4px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
</style>
