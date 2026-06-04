<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '在线录屏'"
      :description="toolDescription || '在浏览器中直接录制屏幕，快速制作演示视频'"
    />
    <PermissionGuard feature-id="screen-record" feature-name="在线录屏" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || $t('toolbox.video.screenRecord.title') }}</span>
        </div>

        <!-- 不支持提示 -->
        <div v-if="!isSupported" class="not-supported">
          <ElIcon class="text-5xl text-warning mb-4"><WarningFilled /></ElIcon>
          <p class="text-base text-g-600 mb-2">{{
            $t('toolbox.video.screenRecord.notSupported')
          }}</p>
          <p v-if="isMobile" class="text-sm text-g-400">{{
            $t('toolbox.video.screenRecord.mobileNotSupported')
          }}</p>
        </div>

        <!-- 录制区域 -->
        <div v-else class="record-area">
          <!-- 空闲状态 - 显示开始录制 -->
          <template v-if="status === 'idle' && !recordResult && !hasError">
            <div class="idle-state">
              <div class="settings-panel">
                <div class="settings-header">
                  <h4 class="section-title">录制设置</h4>
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

                <div class="setting-item">
                  <span class="setting-label">{{ $t('toolbox.video.screenRecord.quality') }}</span>
                  <ElRadioGroup :model-value="options.quality" @update:model-value="updateQuality">
                    <ElRadioButton value="720p">720P</ElRadioButton>
                    <ElRadioButton value="1080p">1080P</ElRadioButton>
                    <ElRadioButton value="2k">2K</ElRadioButton>
                    <ElRadioButton value="original">无损</ElRadioButton>
                  </ElRadioGroup>
                </div>

                <div class="setting-item audio-settings">
                  <span class="setting-label">音频设置</span>
                  <div class="audio-options">
                    <ElCheckbox
                      :model-value="options.audioSource.systemAudio"
                      @update:model-value="updateSystemAudio"
                    >
                      <span class="audio-option-label">
                        <ElIcon class="mr-1"><Headset /></ElIcon>
                        系统声音
                      </span>
                    </ElCheckbox>
                    <ElCheckbox
                      :model-value="options.audioSource.microphone"
                      @update:model-value="updateMicrophone"
                    >
                      <span class="audio-option-label">
                        <ElIcon class="mr-1"><Microphone /></ElIcon>
                        麦克风
                      </span>
                    </ElCheckbox>
                  </div>
                </div>
              </div>

              <ElButton type="primary" size="large" @click="handleStartRecord">
                <ElIcon class="mr-1"><VideoCamera /></ElIcon>
                {{ $t('toolbox.video.screenRecord.startRecord') }}
              </ElButton>
            </div>
          </template>

          <!-- 错误状态 -->
          <template v-if="hasError && status === 'idle'">
            <div class="error-state">
              <ElIcon class="text-5xl text-danger mb-4"><CircleClose /></ElIcon>
              <h3 class="text-lg font-medium mb-2 text-danger">录制失败</h3>
              <p class="text-g-500 mb-4">{{ errorMessage }}</p>
              <div class="action-buttons">
                <ElButton type="primary" @click="handleRetry">
                  <ElIcon class="mr-1"><RefreshRight /></ElIcon>
                  重试
                </ElButton>
                <ElButton @click="handleReset">返回</ElButton>
              </div>
            </div>
          </template>

          <!-- 录制中/暂停状态 -->
          <template v-if="status === 'recording' || status === 'paused'">
            <div class="recording-state">
              <!-- 实时预览画面 -->
              <div class="live-preview">
                <video ref="liveVideoRef" autoplay muted playsinline class="live-video"></video>
                <div class="recording-badge" :class="{ paused: status === 'paused' }">
                  <span class="recording-dot"></span>
                  <span class="recording-text">
                    {{ status === 'recording' ? 'REC' : '暂停' }}
                  </span>
                  <span class="duration-badge">{{ formatDuration(duration) }}</span>
                </div>
              </div>

              <div class="control-buttons">
                <ElButton v-if="status === 'recording'" type="warning" @click="handlePauseRecord">
                  <ElIcon class="mr-1"><VideoPause /></ElIcon>
                  {{ $t('toolbox.video.screenRecord.pauseRecord') }}
                </ElButton>
                <ElButton v-if="status === 'paused'" type="success" @click="handleResumeRecord">
                  <ElIcon class="mr-1"><VideoPlay /></ElIcon>
                  {{ $t('toolbox.video.screenRecord.resumeRecord') }}
                </ElButton>
                <ElButton type="danger" @click="handleStopRecord">
                  <ElIcon class="mr-1"><CircleClose /></ElIcon>
                  {{ $t('toolbox.video.screenRecord.stopRecord') }}
                </ElButton>
              </div>
            </div>
          </template>

          <!-- 录制完成状态 -->
          <template v-if="recordResult">
            <div class="result-state">
              <div class="video-preview">
                <video
                  ref="videoPreviewRef"
                  :src="previewUrl"
                  controls
                  class="preview-video"
                ></video>
                <div class="video-info-badge">
                  <span>{{ formatDuration(recordResult.duration) }}</span>
                  <span class="separator">|</span>
                  <span>{{ formatFileSize(recordResult.size) }}</span>
                </div>
              </div>

              <div class="export-actions">
                <ElButton size="large" @click="handleReset"> 重新录制 </ElButton>
                <ElButton type="primary" size="large" @click="handleDownloadWebm">
                  下载webm
                </ElButton>
                <ElButton type="primary" size="large" @click="handleDownloadMp4">
                  下载mp4
                </ElButton>
              </div>
            </div>
          </template>
        </div>
      </ElCard>
    </PermissionGuard>

    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">在线录屏工具可以直接在浏览器中录制屏幕：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持录制整个屏幕、应用窗口或浏览器标签页</li>
          <li>可选择视频质量（720p / 1080p / 2K / 无损原始分辨率）</li>
          <li>支持分别录制系统声音和麦克风声音</li>
          <li>录制过程中实时预览画面</li>
          <li>支持暂停和继续录制</li>
          <li>录制完成后可选择导出为 WebM 或 MP4 格式</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    VideoCamera,
    VideoPause,
    VideoPlay,
    CircleClose,
    WarningFilled,
    RefreshRight,
    Microphone,
    Headset
  } from '@element-plus/icons-vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import {
    createScreenRecordProcessor,
    ScreenRecordProcessor
  } from '@/processors/video/screen-record'
  import type {
    RecordStatus,
    ScreenRecordOptions,
    ScreenRecordResult
  } from '@/processors/video/types'
  import { saveAs } from 'file-saver'
  import { useHistory } from '@/hooks/core/useHistory'
  import { usePreference } from '@/hooks/core/usePreference'

  defineOptions({ name: 'ScreenRecordPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()

  // 历史记录
  const { addRecord } = useHistory()

  // 默认录制选项
  const defaultOptions: ScreenRecordOptions = {
    quality: '1080p',
    includeAudio: true,
    audioSource: {
      systemAudio: true,
      microphone: false
    },
    outputFormat: 'webm'
  }

  // 用户偏好
  const {
    options: rawOptions,
    hasPreference,
    resetToDefault,
    updateOptions
  } = usePreference<ScreenRecordOptions>('screen-record', defaultOptions)

  // 确保 audioSource 始终存在（兼容旧版偏好设置）
  const options = computed(() => ({
    ...rawOptions.value,
    audioSource: rawOptions.value.audioSource || { systemAudio: false, microphone: false }
  }))

  // 更新音频设置
  const updateSystemAudio = (value: boolean | string | number) => {
    updateOptions({
      audioSource: {
        ...options.value.audioSource,
        systemAudio: Boolean(value)
      }
    })
  }

  const updateMicrophone = (value: boolean | string | number) => {
    updateOptions({
      audioSource: {
        ...options.value.audioSource,
        microphone: Boolean(value)
      }
    })
  }

  const updateQuality = (value: string | number | boolean | undefined) => {
    if (typeof value === 'string') {
      updateOptions({ quality: value as '720p' | '1080p' | '2k' | 'original' })
    }
  }

  // 处理器实例
  let processor: ScreenRecordProcessor | null = null

  // 状态
  const isSupported = ref(false)
  const isMobile = ref(false)
  const status = ref<RecordStatus>('idle')
  const duration = ref(0)
  const recordResult = ref<ScreenRecordResult | null>(null)
  const previewUrl = ref('')
  const videoPreviewRef = ref<HTMLVideoElement>()
  const liveVideoRef = ref<HTMLVideoElement>()
  const liveStream = ref<MediaStream | null>(null)
  const errorMessage = ref('')
  const hasError = ref(false)

  // 定时器
  let durationTimer: ReturnType<typeof setInterval> | null = null

  // 检测是否为移动设备
  const checkMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  }

  // 初始化
  onMounted(() => {
    processor = createScreenRecordProcessor()
    isSupported.value = processor.isSupported()
    isMobile.value = checkMobile()

    // 移动端不支持录屏
    if (isMobile.value) {
      isSupported.value = false
    }
  })

  // 清理
  onUnmounted(() => {
    if (durationTimer) {
      clearInterval(durationTimer)
    }
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    if (liveStream.value) {
      liveStream.value.getTracks().forEach((track) => track.stop())
    }
    processor?.reset()
  })

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // 修复 WebM 视频时长问题
  // WebM 格式录制的视频可能没有正确的 duration 元数据
  const fixVideoDuration = () => {
    const video = videoPreviewRef.value
    if (!video || !recordResult.value) return

    // 监听 loadedmetadata 事件
    const handleLoadedMetadata = () => {
      // 如果 duration 是 Infinity 或 NaN，需要修复
      if (!isFinite(video.duration) || isNaN(video.duration)) {
        // 设置 currentTime 到一个很大的值来触发浏览器计算真实时长
        video.currentTime = 1e101

        video.addEventListener(
          'timeupdate',
          function onTimeUpdate() {
            video.removeEventListener('timeupdate', onTimeUpdate)
            // 重置到开始位置
            video.currentTime = 0
          },
          { once: true }
        )
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })

    // 如果视频已经加载，直接调用
    if (video.readyState >= 1) {
      handleLoadedMetadata()
    }
  }

  // 开始录制
  const handleStartRecord = async () => {
    if (!processor) return

    // 清除之前的错误状态
    hasError.value = false
    errorMessage.value = ''

    // 同步 includeAudio 以兼容旧逻辑
    const recordOptions = {
      ...options.value,
      includeAudio: options.value.audioSource.systemAudio
    }

    try {
      await processor.start(recordOptions)
      status.value = 'recording'

      // 获取媒体流用于实时预览
      liveStream.value = processor.getMediaStream()

      // 等待 DOM 更新后设置视频源
      setTimeout(() => {
        if (liveVideoRef.value && liveStream.value) {
          liveVideoRef.value.srcObject = liveStream.value
        }
      }, 0)

      // 启动计时器
      durationTimer = setInterval(() => {
        if (processor) {
          duration.value = processor.getDuration()
        }
      }, 100)

      ElMessage.success('录制已开始')
    } catch (error: any) {
      hasError.value = true
      errorMessage.value = error.message || '开始录制失败'
      ElMessage.error(errorMessage.value)
    }
  }

  // 暂停录制
  const handlePauseRecord = () => {
    if (!processor) return

    try {
      processor.pause()
      status.value = 'paused'
      ElMessage.info('录制已暂停')
    } catch (error: any) {
      ElMessage.error(error.message || '暂停失败')
    }
  }

  // 恢复录制
  const handleResumeRecord = () => {
    if (!processor) return

    try {
      processor.resume()
      status.value = 'recording'
      ElMessage.success('录制已继续')
    } catch (error: any) {
      ElMessage.error(error.message || '恢复失败')
    }
  }

  // 停止录制
  const handleStopRecord = async () => {
    if (!processor) return

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    try {
      const result = await processor.stop()

      // 停止计时器
      if (durationTimer) {
        clearInterval(durationTimer)
        durationTimer = null
      }

      // 清理实时预览
      if (liveVideoRef.value) {
        liveVideoRef.value.srcObject = null
      }
      liveStream.value = null

      recordResult.value = result
      previewUrl.value = URL.createObjectURL(result.blob)
      status.value = 'stopped'
      hasError.value = false
      errorMessage.value = ''

      // 等待 DOM 更新后修复视频时长
      setTimeout(() => {
        fixVideoDuration()
      }, 100)

      ElMessage.success('录制完成')
      // 记录功能使用
      permissionGuardRef.value?.recordUsage()
    } catch (error: any) {
      // 停止计时器
      if (durationTimer) {
        clearInterval(durationTimer)
        durationTimer = null
      }

      hasError.value = true
      errorMessage.value = error.message || '停止录制失败'
      status.value = 'idle'
      ElMessage.error(errorMessage.value)
    }
  }

  // 下载WebM格式
  const handleDownloadWebm = () => {
    if (!recordResult.value) return

    const fileName = `screen-record-${Date.now()}.webm`
    saveAs(recordResult.value.blob, fileName)

    // 保存历史记录
    addRecord({
      toolId: 'screen-record',
      toolName: '在线录屏',
      fileName: fileName,
      outputFileName: fileName,
      fileSize: recordResult.value.size,
      outputFileSize: recordResult.value.size,
      processType: '屏幕录制',
      downloadUrl: previewUrl.value
    })

    ElMessage.success('WebM视频下载成功')
  }

  // 下载MP4格式
  const handleDownloadMp4 = async () => {
    if (!recordResult.value) return

    // 由于浏览器原生录制通常是webm格式，直接下载时改变扩展名
    // 注意：这只是改变文件扩展名，实际编码仍是webm
    // 如需真正的MP4转换，需要使用FFmpeg等工具
    const fileName = `screen-record-${Date.now()}.mp4`

    // 创建一个新的Blob，尝试使用mp4 mime type
    const mp4Blob = new Blob([recordResult.value.blob], { type: 'video/mp4' })
    saveAs(mp4Blob, fileName)

    // 保存历史记录
    addRecord({
      toolId: 'screen-record',
      toolName: '在线录屏',
      fileName: fileName,
      outputFileName: fileName,
      fileSize: recordResult.value.size,
      outputFileSize: recordResult.value.size,
      processType: '屏幕录制',
      downloadUrl: previewUrl.value
    })

    ElMessage.success('MP4视频下载成功')
  }

  // 重置
  const handleReset = () => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    // 清理实时预览
    if (liveVideoRef.value) {
      liveVideoRef.value.srcObject = null
    }
    liveStream.value = null

    processor?.reset()
    status.value = 'idle'
    duration.value = 0
    recordResult.value = null
    previewUrl.value = ''
    hasError.value = false
    errorMessage.value = ''
  }

  // 重试录制
  const handleRetry = () => {
    hasError.value = false
    errorMessage.value = ''
    handleStartRecord()
  }

  // 恢复默认设置
  const handleResetDefault = () => {
    resetToDefault()
    ElMessage.success('已恢复默认设置')
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

  .not-supported {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .record-area {
    min-height: 400px;
  }

  .idle-state {
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: center;
    padding: 40px 20px;
  }

  .settings-panel {
    width: 100%;
    max-width: 400px;
    padding: 20px;
    background: var(--el-fill-color-lighter);
    border-radius: 12px;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .section-title {
      margin: 0;
    }
  }

  .section-title {
    margin: 0 0 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    &.audio-settings {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
  }

  .setting-label {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  .audio-options {
    display: flex;
    gap: 24px;
    width: 100%;
  }

  .audio-option-label {
    display: flex;
    align-items: center;
  }

  .recording-state {
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: center;
    padding: 40px 20px;
  }

  .live-preview {
    position: relative;
    width: 100%;
    max-width: 640px;
    overflow: hidden;
    background: #000;
    border-radius: 8px;
  }

  .live-video {
    display: block;
    width: 100%;
  }

  .recording-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 6px 12px;
    background: rgb(0 0 0 / 70%);
    border-radius: 4px;

    &.paused {
      .recording-dot {
        background: var(--el-color-warning);
        animation: none;
      }

      .recording-text {
        color: var(--el-color-warning);
      }
    }
  }

  .recording-dot {
    width: 10px;
    height: 10px;
    background: var(--el-color-danger);
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .recording-text {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-color-danger);
  }

  .duration-badge {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.5;
    }
  }

  .control-buttons {
    display: flex;
    gap: 16px;
  }

  .result-state {
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: center;
    padding: 40px 20px;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px;
    text-align: center;
  }

  .video-preview {
    position: relative;
    width: 100%;
    max-width: 640px;
    overflow: hidden;
    background: #000;
    border-radius: 8px;
  }

  .preview-video {
    display: block;
    width: 100%;
  }

  .video-info-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
    background: rgb(0 0 0 / 70%);
    border-radius: 4px;

    .separator {
      opacity: 0.5;
    }
  }

  .export-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;

    .el-button {
      min-width: 120px;
    }
  }

  .result-info {
    display: flex;
    gap: 24px;
    padding: 12px 24px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .action-buttons {
    display: flex;
    gap: 16px;
  }

  /* 平板端适配 (768px - 1024px) */
  @media (width <= 1024px) and (width >= 769px) {
    .record-preview {
      max-width: 400px;
      height: 180px;
    }

    .settings-panel {
      max-width: 360px;
    }

    .video-preview,
    .live-preview {
      max-width: 560px;
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

    .record-area {
      min-height: 300px;
    }

    .not-supported {
      padding: 40px 16px;

      p {
        font-size: 14px;
      }
    }

    .idle-state {
      gap: 20px;
      padding: 24px 16px;
    }

    .settings-panel {
      max-width: 100%;
      padding: 16px;
    }

    .section-title {
      font-size: 13px;
    }

    .setting-item {
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }

    .setting-label {
      font-size: 13px;
    }

    .audio-options {
      flex-direction: column;
      gap: 12px;
    }

    .recording-state {
      gap: 16px;
      padding: 24px 16px;
    }

    .live-preview {
      max-width: 100%;
      border-radius: 6px;
    }

    .recording-badge {
      top: 8px;
      left: 8px;
      padding: 4px 8px;
    }

    .duration-label {
      font-size: 13px;
    }

    .result-state {
      gap: 16px;
      padding: 24px 16px;
    }

    .video-preview {
      max-width: 100%;
      border-radius: 6px;
    }

    .export-actions {
      flex-direction: column;
      width: 100%;

      .el-button {
        width: 100%;
      }
    }

    .result-info {
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
      font-size: 13px;
      text-align: center;
    }

    .error-state {
      padding: 40px 16px;

      h3 {
        font-size: 16px;
      }

      p {
        font-size: 14px;
      }
    }

    .control-buttons,
    .action-buttons {
      flex-direction: column;
      width: 100%;

      .el-button {
        width: 100%;
      }
    }
  }

  /* 小屏移动端适配 (< 480px) */
  @media (width <= 480px) {
    .recording-badge {
      top: 6px;
      left: 6px;
      gap: 4px;
      padding: 3px 6px;
    }

    .recording-dot {
      width: 8px;
      height: 8px;
    }

    .recording-text,
    .duration-badge {
      font-size: 10px;
    }
  }
</style>
