<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || 'PDF解锁'"
      :description="toolDescription || '移除PDF文件的密码保护'"
    />
    <PermissionGuard feature-id="pdf-unlock" feature-name="PDF解锁" ref="permissionGuardRef">
      <ElCard shadow="never" class="art-card">
        <div class="tool-header">
          <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
          <span class="tool-title">{{ toolName || 'PDF解锁' }}</span>
        </div>
        <div
          class="upload-area"
          :class="{ 'is-dragging': isDragging, 'has-files': hasFiles }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <!-- 初始上传状态-->
          <template v-if="!hasFiles && !isProcessing && !processResult">
            <p class="text-base text-g-600 mb-2">将文件拖拽到虚框内</p>
            <p class="text-sm text-g-400 mb-4">或者</p>
            <ElButton type="primary" @click="triggerFileSelect">点击上传文件(小于100M)</ElButton>
          </template>

          <!-- 已上传文件状态-->
          <template v-if="hasFiles && !isProcessing && !processResult">
            <div class="file-grid-container">
              <div class="file-grid">
                <div v-for="file in files" :key="file.id" class="file-card">
                  <div class="file-card-close" @click.stop="removeFile(file.id)">
                    <ElIcon><Close /></ElIcon>
                  </div>
                  <div class="file-card-icon">
                    <Icon icon="ri:file-pdf-2-fill" class="text-4xl text-danger" />
                  </div>
                  <p class="file-card-name">{{ file.name }}</p>
                  <div
                    v-if="encryptionStatus"
                    class="encryption-badge"
                    :class="encryptionStatus.isEncrypted ? 'encrypted' : 'not-encrypted'"
                  >
                    <ElIcon class="mr-1"
                      ><Lock v-if="encryptionStatus.isEncrypted" /><Unlock v-else
                    /></ElIcon>
                    {{ encryptionStatus.isEncrypted ? '已加密' : '未加密' }}
                  </div>
                </div>
              </div>

              <!-- 加密状态提示-->
              <div v-if="encryptionStatus" class="status-info">
                <template v-if="encryptionStatus.isEncrypted">
                  <ElAlert title="此PDF文件已加密" type="warning" :closable="false" show-icon>
                    <template #default>
                      <p>请输入密码以解锁此PDF文件。</p>
                    </template>
                  </ElAlert>
                </template>
                <template v-else>
                  <ElAlert title="此PDF文件未加密" type="success" :closable="false" show-icon>
                    <template #default>
                      <p>此文件没有密码保护，无需解锁。</p>
                    </template>
                  </ElAlert>
                </template>
              </div>

              <!-- 密码输入 -->
              <div v-if="encryptionStatus?.isEncrypted" class="unlock-options">
                <div class="option-group">
                  <h4 class="option-title">输入密码</h4>
                  <ElInput
                    v-model="password"
                    type="password"
                    placeholder="请输入PDF的密码"
                    show-password
                    size="large"
                    @keyup.enter="handleUnlock"
                  />
                  <p class="password-hint">
                    <ElIcon class="mr-1"><InfoFilled /></ElIcon>
                    输入正确的密码后，将移除PDF的密码保护
                  </p>
                </div>
              </div>

              <div class="file-actions">
                <ElButton
                  v-if="encryptionStatus?.isEncrypted"
                  type="primary"
                  size="large"
                  :disabled="!password"
                  @click="handleUnlock"
                >
                  <ElIcon class="mr-1"><Unlock /></ElIcon>解锁PDF
                </ElButton>
                <ElButton
                  v-else-if="encryptionStatus && !encryptionStatus.isEncrypted"
                  type="primary"
                  size="large"
                  @click="handleDownloadOriginal"
                >
                  <ElIcon class="mr-1"><Download /></ElIcon>下载原文档
                </ElButton>
                <ElButton size="large" @click="clearAllFiles">清空</ElButton>
              </div>
            </div>
          </template>

          <!-- 处理中状态-->
          <template v-if="isProcessing">
            <ToolResultView 
              type="loading" 
              loading-text="正在解锁文档" 
              :percentage="progress.progress"
              icon-from="ri:file-pdf-2-fill"
              icon-to="ri:file-pdf-2-fill"
            >
              <template #default>
                <p class="text-sm text-g-400 mt-2">{{ progressMessage }}</p>
              </template>
            </ToolResultView>
          </template>

          <!-- 处理结果状态-->
          <template v-if="processResult">
            <ToolResultView
              v-if="processResult.success"
              type="success"
              title="解锁完成！"
              @retry="handleRetry"
              @reset="handleContinue"
            >
              <template #default>
                <div class="result-file-card">
                  <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                  <div class="result-badge success">
                    <ElIcon class="mr-1"><Unlock /></ElIcon>已解密
                  </div>
                  <p class="result-file-name">{{ resultFileName }}</p>
                </div>
                <p class="text-sm text-g-500 mt-4">PDF密码保护已成功移除</p>
              </template>
              <template #actions>
                <ElButton type="primary" @click="downloadResult">
                  <ElIcon class="mr-1"><Download /></ElIcon>下载文件
                </ElButton>
                <ElButton @click="handleContinue">继续处理</ElButton>
              </template>
            </ToolResultView>
            <ToolResultView
              v-else
              type="error"
              title="解锁失败"
              :message="processResult.error || '解锁失败，请重试'"
              @retry="handleRetry"
              @reset="handleContinue"
            />
          </template>
        </div>
        <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
      </ElCard>
    </PermissionGuard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF解锁工具可以移除PDF文件的密码保护：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>自动检测PDF是否加密</li>
          <li>输入正确密码后移除密码保护</li>
          <li>解锁后保留所有文档内容</li>
          <li>所有处理在浏览器本地完成，保护隐私</li>
        </ul>
        <p class="mt-3 text-warning">
          <ElIcon class="mr-1"><Warning /></ElIcon>
          请确保您有合法权限解锁此PDF文件
        </p>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    Loading,
    CircleClose,
    Download,
    Close,
    Lock,
    Unlock,
    InfoFilled,
    Warning
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
  import { createUnlockProcessor, type EncryptionInfo } from '@/processors/pdf/unlock'

  defineOptions({ name: 'PdfUnlockPage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
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
    removeFile,
    clearFiles
  } = useUpload({ accept: '.pdf', multiple: false, maxSize: 100, maxCount: 1 })

  const { progress } = useFileProcessor()
  const { addRecord } = useHistory()

  // Local processing state
  const isProcessing = ref(false)

  // State
  const password = ref('')
  const encryptionStatus = ref<EncryptionInfo | null>(null)
  const processResult = ref<any>(null)
  const progressMessage = ref('正在处理...')

  // Computed
  const resultFileName = computed(() => {
    if (files.value.length > 0) {
      return files.value[0].name.replace(/\.pdf$/i, '_unlocked.pdf')
    }
    return 'unlocked.pdf'
  })

  // Trigger file select
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // Check encryption status when file is uploaded
  watch(
    () => files.value,
    async (newFiles) => {
      if (newFiles.length > 0) {
        try {
          const processor = createUnlockProcessor()
          encryptionStatus.value = await processor.getEncryptionInfo(newFiles[0].file)
        } catch (e) {
          console.error('Failed to check encryption status:', e)
          encryptionStatus.value = {
            isEncrypted: true,
            hasUserPassword: true,
            hasOwnerPassword: false
          }
        }
      } else {
        encryptionStatus.value = null
      }
    },
    { immediate: true }
  )

  // Handle unlock
  const handleUnlock = async () => {
    if (!hasFiles.value) {
      ElMessage.warning('请先上传PDF文件')
      return
    }

    if (!password.value) {
      ElMessage.warning('请输入密码')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    try {
      isProcessing.value = true
      const processor = createUnlockProcessor()
      const file = files.value[0].file

      progress.value = {
        progress: 0,
        currentIndex: 0,
        totalFiles: 1,
        currentFileName: files.value[0].name,
        processedCount: 0
      }

      const result = await processor.unlock(file, { password: password.value }, (prog, msg) => {
        progress.value.progress = prog
        progressMessage.value = msg
      })

      processResult.value = result

      if (result.success) {
        ElMessage.success('PDF解锁完成！')
        // Record usage
        permissionGuardRef.value?.recordUsage()
        // Save history
        if (result.data) {
          const blobUrl = URL.createObjectURL(result.data)
          addRecord({
            toolId: 'pdf-unlock',
            toolName: 'PDF解锁',
            fileName: files.value[0].name,
            outputFileName: resultFileName.value,
            fileSize: files.value[0].size,
            outputFileSize: result.data.size,
            processType: 'unlock',
            downloadUrl: blobUrl
          })
        }
      } else {
        ElMessage.error(result.error || '解锁失败')
      }
    } catch (e: any) {
      processResult.value = { success: false, error: e.message || '解锁失败' }
    } finally {
      isProcessing.value = false
    }
  }

  // Download original file (for non-encrypted PDFs)
  const handleDownloadOriginal = () => {
    if (!hasFiles.value) return
    const file = files.value[0].file
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = files.value[0].name
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download result
  const downloadResult = () => {
    if (!processResult.value?.data) return
    const url = URL.createObjectURL(processResult.value.data)
    const a = document.createElement('a')
    a.href = url
    a.download = resultFileName.value
    a.click()
    URL.revokeObjectURL(url)
  }

  // Clear all files
  const clearAllFiles = () => {
    clearFiles()
    password.value = ''
    encryptionStatus.value = null
    processResult.value = null
  }

  // Continue processing
  const handleContinue = () => {
    processResult.value = null
    clearAllFiles()
  }

  // Retry
  const handleRetry = () => {
    processResult.value = null
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (processResult.value?.data) {
      URL.revokeObjectURL(URL.createObjectURL(processResult.value.data))
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
    margin-bottom: 20px;
  }

  .file-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 120px;
    padding: 16px 8px;
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

    &:hover {
      background: var(--el-color-danger-dark-2);
    }
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

  .encryption-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    margin-top: 8px;
    font-size: 11px;
    border-radius: 4px;

    &.encrypted {
      color: var(--el-color-warning);
      background: var(--el-color-warning-light-9);
    }

    &.not-encrypted {
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
    }
  }

  .status-info {
    width: 100%;
    max-width: 500px;
    margin-bottom: 20px;
  }

  .unlock-options {
    width: 100%;
    max-width: 500px;
    margin-bottom: 20px;
    text-align: left;
  }

  .option-group {
    padding: 16px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .option-title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .password-hint {
    display: flex;
    align-items: center;
    margin-top: 10px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
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

  .result-badge {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    margin-top: 8px;
    font-size: 12px;
    border-radius: 4px;

    &.success {
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
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

  .text-warning {
    display: flex;
    align-items: center;
    color: var(--el-color-warning);
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
