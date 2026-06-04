<template>
  <ToolPageLayout
    feature-id="pdf-encrypt"
    feature-name="PDF加密"
    :title="toolName || 'PDF加密/解密'"
    :description="toolDescription || '为PDF设置密码保护或移除密码'"
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
              <div v-for="file in files" :key="file.id" class="file-card">
                <div class="file-card-close" @click.stop="removeFile(file.id)">
                  <ElIcon><Close /></ElIcon>
                </div>
                <div class="file-card-icon">
                  <Icon icon="ri:file-pdf-2-fill" class="text-4xl text-danger" />
                </div>
                <p class="file-card-name">{{ file.name }}</p>
              </div>
            </div>

            <!-- 加密选项 -->
            <div class="encrypt-options">
              <div class="option-group">
                <h4 class="option-title">操作类型</h4>
                <ElRadioGroup v-model="operation" size="small">
                  <ElRadio value="encrypt"
                    ><ElIcon class="mr-1"><Lock /></ElIcon>加密PDF</ElRadio
                  >
                  <ElRadio value="decrypt"
                    ><ElIcon class="mr-1"><Unlock /></ElIcon>解密PDF</ElRadio
                  >
                </ElRadioGroup>
              </div>
              <div v-if="operation === 'encrypt'" class="option-group">
                <h4 class="option-title">密码设置</h4>
                <div class="input-row">
                  <span class="input-label">打开密码</span>
                  <ElInput
                    v-model="encryptOptions.userPassword"
                    type="password"
                    placeholder="设置打开PDF的密码"
                    show-password
                    size="small"
                  />
                </div>
                <div class="input-row">
                  <span class="input-label">权限密码</span>
                  <ElInput
                    v-model="encryptOptions.ownerPassword"
                    type="password"
                    placeholder="设置修改权限的密码（可选）"
                    show-password
                    size="small"
                  />
                </div>
                <h4 class="option-title mt-3">权限设置</h4>
                <div class="permissions-grid">
                  <ElCheckbox v-model="encryptOptions.permissions!.printing" size="small"
                    >允许打印</ElCheckbox
                  >
                  <ElCheckbox v-model="encryptOptions.permissions!.modifying" size="small"
                    >允许修改</ElCheckbox
                  >
                  <ElCheckbox v-model="encryptOptions.permissions!.copying" size="small"
                    >允许复制</ElCheckbox
                  >
                  <ElCheckbox v-model="encryptOptions.permissions!.annotating" size="small"
                    >允许注释</ElCheckbox
                  >
                </div>
              </div>
              <div v-if="operation === 'decrypt'" class="option-group">
                <h4 class="option-title">输入密码</h4>
                <ElInput
                  v-model="decryptPassword"
                  type="password"
                  placeholder="请输入PDF的密码"
                  show-password
                />
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="file-actions">
              <ElButton
                type="primary"
                size="large"
                :disabled="!isConfigValid"
                @click="handleProcess"
                >{{ operation === 'encrypt' ? '加密PDF' : '解密PDF' }}</ElButton
              >
              <ElButton size="large" @click="clearFiles">清空</ElButton>
            </div>
          </div>
        </template>

        <!-- 处理中 -->
        <template v-if="isProcessing">
          <ToolResultView 
            type="loading" 
            :loading-text="operation === 'encrypt' ? '正在加密文档' : '正在解密文档'" 
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
            :title="operation === 'encrypt' ? '加密完成！' : '解密完成！'"
            @retry="handleRetry"
            @reset="handleContinue"
          >
            <template #default>
              <div class="result-file-card">
                <Icon icon="ri:file-pdf-2-fill" class="text-5xl text-danger" />
                <p class="result-file-name">{{ resultFileName }}</p>
              </div>
            </template>
            <template #actions>
              <ElButton type="primary" @click="handleDownload">
                <ElIcon class="mr-1"><Download /></ElIcon>下载文件
              </ElButton>
              <ElButton @click="handleContinue">继续处理</ElButton>
            </template>
          </ToolResultView>
          <ToolResultView
            v-else
            type="error"
            :title="operation === 'encrypt' ? '加密失败' : '解密失败'"
            :message="errorMsg || '处理失败，请重试'"
            @retry="handleRetry"
            @reset="handleContinue"
          />
        </template>
      </div>

      <input ref="fileInputRef" type="file" accept=".pdf" hidden @change="handleFileSelect" />
    </template>

    <template #introduction>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">PDF加密/解密工具可以为PDF文件设置或移除密码保护：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持设置打开密码和权限密码</li>
          <li>可控制打印、修改、复制、注释权限</li>
          <li>支持移除已有密码保护</li>
          <li>所有处理在浏览器本地完成</li>
        </ul>
      </div>
    </template>
  </ToolPageLayout>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Loading, CircleClose, Download, Close, Lock, Unlock } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import ToolPageLayout from '@/components/core/layouts/tool-page-layout/index.vue'
  import ToolResultView from '@/components/business/tool-result-view/index.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import { useUpload } from '@/hooks/core/useUpload'
  import { useToolProcessor } from '@/hooks/core/useToolProcessor'
  import { useHistory } from '@/hooks/core/useHistory'
  import {
    createPdfEncryptProcessor,
    type PdfEncryptOptions,
    type EncryptOperation
  } from '@/processors/pdf/encrypt'

  defineOptions({ name: 'PdfEncryptPage' })

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
    removeFile,
    clearFiles
  } = useUpload({ accept: '.pdf', multiple: false, maxSize: 100, maxCount: 1 })

  // 加密选项
  const operation = ref<EncryptOperation>('encrypt')
  const encryptOptions = ref<PdfEncryptOptions>({
    operation: 'encrypt',
    userPassword: '',
    ownerPassword: '',
    permissions: { printing: true, modifying: false, copying: false, annotating: true }
  })
  const decryptPassword = ref('')

  // 验证配置
  const isConfigValid = computed(() => {
    if (operation.value === 'encrypt') return !!encryptOptions.value.userPassword
    return !!decryptPassword.value
  })

  // 创建自定义处理器适配器
  const processor = createPdfEncryptProcessor()
  const encryptDecryptProcessor = {
    validate: (files: File[]) => processor.validate(files),
    process: async (
      files: File[],
      options: { operation: EncryptOperation; encryptOptions: PdfEncryptOptions; password: string },
      onProgress?: (progress: number) => void
    ) => {
      if (options.operation === 'encrypt') {
        return await processor.encrypt(files[0], options.encryptOptions, onProgress)
      } else {
        return await processor.decrypt(files[0], { password: options.password }, onProgress)
      }
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
  } = useToolProcessor(encryptDecryptProcessor, {
    featureId: 'pdf-encrypt',
    featureName: 'PDF加密',
    successMessage: '操作完成！',
    errorMessage: '操作失败'
  })

  // 历史记录
  const { addRecord } = useHistory()

  // 计算输出文件名
  const resultFileName = computed(() => {
    if (files.value.length > 0) {
      const suffix = operation.value === 'encrypt' ? '_encrypted' : '_decrypted'
      return files.value[0].name.replace(/\.pdf$/i, `${suffix}.pdf`)
    }
    return 'processed.pdf'
  })

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.value?.click()
  }

  // 处理加密/解密
  const handleProcess = async () => {
    if (!isConfigValid.value) {
      ElMessage.warning(operation.value === 'encrypt' ? '请设置打开密码' : '请输入密码')
      return
    }

    const result = await processFiles(
      files.value.map((f) => f.file),
      {
        operation: operation.value,
        encryptOptions: encryptOptions.value,
        password: decryptPassword.value
      }
    )

    // 保存历史记录
    if (result?.success && result.data) {
      const blobUrl = URL.createObjectURL(result.data as Blob)
      addRecord({
        toolId: 'pdf-encrypt',
        toolName: operation.value === 'encrypt' ? 'PDF加密' : 'PDF解密',
        fileName: files.value[0].name,
        outputFileName: resultFileName.value,
        fileSize: files.value[0].size,
        outputFileSize: (result.data as Blob).size,
        processType: operation.value,
        downloadUrl: blobUrl
      })
    }
  }

  // 下载结果
  const handleDownload = () => {
    downloadResult(resultFileName.value)
  }

  // 继续处理
  const handleContinue = () => {
    reset()
    clearFiles()
    encryptOptions.value.userPassword = ''
    encryptOptions.value.ownerPassword = ''
    decryptPassword.value = ''
  }

  // 重试
  const handleRetry = () => {
    reset()
  }
</script>

<style scoped lang="scss">
  .encrypt-options {
    width: 100%;
    max-width: 500px;
    margin-bottom: 20px;
    text-align: left;
  }

  .option-group {
    padding: 12px;
    margin-bottom: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
  }

  .option-title {
    margin: 0 0 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .input-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .input-label {
    min-width: 70px;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .permissions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
</style>
