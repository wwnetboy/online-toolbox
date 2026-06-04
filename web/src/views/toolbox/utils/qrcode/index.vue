<template>
  <div class="flex flex-col gap-4 pb-5">
    <ToolSearchBar
      :title="toolName || '二维码生成'"
      :description="toolDescription || '生成各种内容的二维码，支持自定义样式和Logo'"
    />
    <PermissionGuard
      feature-id="qrcode-generator"
      feature-name="二维码生成"
      ref="permissionGuardRef"
    >
      <ElRow :gutter="16">
        <!-- 左侧配置区域 -->
        <ElCol :span="12" :xs="24" :sm="24" :md="12">
          <ElCard shadow="never" class="art-card mb-4">
            <div class="tool-header">
              <ToolIcon :icon="toolIcon" :icon-url="toolIconUrl" :color="toolColor" />
              <span class="tool-title">{{ toolName || '内容设置' }}</span>
            </div>
            <ElForm :model="qrcodeConfig" label-width="80px">
              <ElFormItem label="内容类型">
                <ElRadioGroup v-model="contentType">
                  <ElRadioButton value="url">网址链接</ElRadioButton>
                  <ElRadioButton value="text">纯文本</ElRadioButton>
                </ElRadioGroup>
              </ElFormItem>
              <ElFormItem :label="contentType === 'url' ? '网址' : '文本'">
                <ElInput
                  v-if="contentType === 'url'"
                  v-model="qrcodeConfig.content"
                  placeholder="请输入网址，如 https://example.com"
                  clearable
                />
                <ElInput
                  v-else
                  v-model="qrcodeConfig.content"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入文本内容"
                  clearable
                />
              </ElFormItem>
            </ElForm>
          </ElCard>
          <ElCard shadow="never" class="art-card mb-4">
            <div class="text-base font-medium text-g-800 mb-4">样式设置</div>
            <ElForm :model="qrcodeConfig" label-width="80px">
              <ElFormItem label="尺寸">
                <ElSlider
                  v-model="qrcodeConfig.size"
                  :min="100"
                  :max="400"
                  :step="20"
                  show-input
                  style="max-width: 300px"
                />
              </ElFormItem>
              <ElFormItem label="前景色">
                <ElColorPicker v-model="qrcodeConfig.foreground" show-alpha />
                <span class="ml-2 text-g-400 text-sm">{{ qrcodeConfig.foreground }}</span>
              </ElFormItem>
              <ElFormItem label="背景色">
                <ElColorPicker v-model="qrcodeConfig.background" show-alpha />
                <span class="ml-2 text-g-400 text-sm">{{ qrcodeConfig.background }}</span>
              </ElFormItem>
              <ElFormItem label="容错级别">
                <ElSelect
                  v-model="qrcodeConfig.level"
                  placeholder="选择容错级别"
                  style="width: 180px"
                >
                  <ElOption label="L - 7%" value="L" />
                  <ElOption label="M - 15%" value="M" />
                  <ElOption label="Q - 25%" value="Q" />
                  <ElOption label="H - 30% (推荐)" value="H" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="边距">
                <ElSlider
                  v-model="qrcodeConfig.margin"
                  :min="0"
                  :max="10"
                  :step="1"
                  show-input
                  style="max-width: 300px"
                />
              </ElFormItem>
            </ElForm>
          </ElCard>
          <ElCard shadow="never" class="art-card">
            <div class="text-base font-medium text-g-800 mb-4">Logo设置</div>
            <ElForm :model="qrcodeConfig" label-width="80px">
              <ElFormItem label="添加Logo">
                <ElSwitch v-model="showLogo" />
              </ElFormItem>
              <template v-if="showLogo">
                <ElFormItem label="Logo图片">
                  <div class="logo-upload">
                    <div v-if="!logoPreview" class="logo-upload-area" @click="triggerLogoSelect">
                      <ElIcon class="text-2xl text-g-400"><Plus /></ElIcon>
                      <p class="text-xs text-g-400 mt-1">上传Logo</p>
                    </div>
                    <div v-else class="logo-preview">
                      <img :src="logoPreview" alt="logo" />
                      <div class="logo-remove" @click="removeLogo"
                        ><ElIcon><Close /></ElIcon
                      ></div>
                    </div>
                  </div>
                  <input
                    ref="logoInputRef"
                    type="file"
                    accept="image/*"
                    hidden
                    @change="handleLogoSelect"
                  />
                </ElFormItem>
                <ElFormItem label="Logo大小">
                  <ElSlider
                    v-model="qrcodeConfig.logoSize"
                    :min="20"
                    :max="80"
                    :step="5"
                    show-input
                    style="max-width: 300px"
                  />
                </ElFormItem>
              </template>
            </ElForm>
          </ElCard>
        </ElCol>
        <!-- 右侧预览区域 -->
        <ElCol :span="12" :xs="24" :sm="24" :md="12">
          <ElCard shadow="never" class="art-card">
            <div class="text-base font-medium text-g-800 mb-4">预览</div>
            <div class="preview-container">
              <div v-if="qrcodeConfig.content" class="qrcode-wrapper" ref="qrcodeRef">
                <QrcodeVue
                  :value="qrcodeConfig.content"
                  :size="qrcodeConfig.size"
                  :level="qrcodeConfig.level"
                  :render-as="renderAs"
                  :margin="qrcodeConfig.margin"
                  :background="qrcodeConfig.background"
                  :foreground="qrcodeConfig.foreground"
                  :image-settings="imageSettings"
                />
              </div>
              <div v-else class="empty-preview">
                <Icon icon="ri:qr-code-line" class="text-5xl text-g-300 mb-3" />
                <p class="text-g-400">请输入内容生成二维码</p>
              </div>
            </div>
            <div v-if="qrcodeConfig.content" class="download-section">
              <div class="text-sm font-medium text-g-600 mb-3">下载格式</div>
              <div class="download-buttons">
                <ElButton type="primary" @click="downloadQrcode('png')"
                  ><ElIcon class="mr-1"><Download /></ElIcon>PNG</ElButton
                >
                <ElButton type="primary" @click="downloadQrcode('jpg')"
                  ><ElIcon class="mr-1"><Download /></ElIcon>JPG</ElButton
                >
                <ElButton type="primary" @click="downloadQrcode('svg')"
                  ><ElIcon class="mr-1"><Download /></ElIcon>SVG</ElButton
                >
              </div>
            </div>
          </ElCard>
        </ElCol>
      </ElRow>
    </PermissionGuard>
    <ElCard shadow="never" class="art-card">
      <div class="text-base font-medium text-g-800 mb-4">功能介绍</div>
      <div class="text-sm text-g-600 leading-relaxed">
        <p class="mb-3">二维码生成工具可以快速生成各种内容的二维码：</p>
        <ul class="list-disc list-inside space-y-1 text-g-500">
          <li>支持网址链接和纯文本内容</li>
          <li>可自定义尺寸、颜色、边距等样式</li>
          <li>支持添加Logo图片</li>
          <li>支持PNG/JPG/SVG多种格式下载</li>
        </ul>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Plus, Close, Download } from '@element-plus/icons-vue'
  import { Icon } from '@iconify/vue'
  import QrcodeVue from 'qrcode.vue'
  import type { Level, ImageSettings } from 'qrcode.vue'
  import ToolSearchBar from '../../components/ToolSearchBar.vue'
  import ToolIcon from '../../components/ToolIcon.vue'
  import { useCurrentTool } from '@/hooks/core/useCurrentTool'
  import PermissionGuard from '@/components/business/permission-guard/index.vue'
  import { usePreference } from '@/hooks/core/usePreference'

  defineOptions({ name: 'QrcodePage' })

  const { toolIcon, toolIconUrl, toolColor, toolName, toolDescription } = useCurrentTool()

  const permissionGuardRef = ref<InstanceType<typeof PermissionGuard>>()
  const logoInputRef = ref<HTMLInputElement>()
  const qrcodeRef = ref<HTMLElement>()
  const { options: preferenceOptions } = usePreference('qrcode-generator', {
    contentType: 'url' as 'url' | 'text',
    size: 200,
    level: 'H' as Level,
    margin: 2,
    foreground: '#000000',
    background: '#ffffff',
    logoSize: 40
  })
  const contentType = computed({
    get: () => preferenceOptions.value.contentType,
    set: (val) => {
      preferenceOptions.value.contentType = val
    }
  })
  const showLogo = ref(false)
  const logoPreview = ref<string>('')
  const renderAs = ref<'canvas' | 'svg'>('canvas')
  const qrcodeConfig = ref({
    content: 'https://www.example.com',
    size: preferenceOptions.value.size,
    level: preferenceOptions.value.level as Level,
    margin: preferenceOptions.value.margin,
    foreground: preferenceOptions.value.foreground,
    background: preferenceOptions.value.background,
    logoSize: preferenceOptions.value.logoSize
  })

  watch(
    preferenceOptions,
    (newVal) => {
      qrcodeConfig.value.size = newVal.size
      qrcodeConfig.value.level = newVal.level as Level
      qrcodeConfig.value.margin = newVal.margin
      qrcodeConfig.value.foreground = newVal.foreground
      qrcodeConfig.value.background = newVal.background
      qrcodeConfig.value.logoSize = newVal.logoSize
    },
    { immediate: true }
  )
  watch(
    qrcodeConfig,
    (newVal) => {
      preferenceOptions.value.size = newVal.size
      preferenceOptions.value.level = newVal.level
      preferenceOptions.value.margin = newVal.margin
      preferenceOptions.value.foreground = newVal.foreground
      preferenceOptions.value.background = newVal.background
      preferenceOptions.value.logoSize = newVal.logoSize
    },
    { deep: true }
  )

  const imageSettings = computed<ImageSettings | undefined>(() => {
    if (!showLogo.value || !logoPreview.value) return undefined
    return {
      src: logoPreview.value,
      width: qrcodeConfig.value.logoSize,
      height: qrcodeConfig.value.logoSize,
      excavate: true
    }
  })
  const triggerLogoSelect = () => {
    logoInputRef.value?.click()
  }
  const handleLogoSelect = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      ElMessage.error('请选择图片文件')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      logoPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
  const removeLogo = () => {
    logoPreview.value = ''
    if (logoInputRef.value) logoInputRef.value.value = ''
  }

  const downloadQrcode = async (format: 'png' | 'jpg' | 'svg') => {
    if (!qrcodeConfig.value.content) {
      ElMessage.warning('请先输入内容')
      return
    }

    // 先检查权限
    const hasPermission = await permissionGuardRef.value?.checkBeforeAction()
    if (!hasPermission) {
      return
    }

    try {
      if (format === 'svg') {
        await downloadAsSvg()
      } else {
        await downloadAsImage(format)
      }
      ElMessage.success(`二维码已下载为 ${format.toUpperCase()} 格式`)
      // 记录功能使用
      permissionGuardRef.value?.recordUsage()
    } catch {
      ElMessage.error('下载失败，请重试')
    }
  }
  const downloadAsImage = async (format: 'png' | 'jpg') => {
    const canvas = qrcodeRef.value?.querySelector('canvas')
    if (!canvas) {
      ElMessage.error('无法获取二维码画布')
      return
    }
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
    const dataUrl = canvas.toDataURL(mimeType, 1.0)
    const link = document.createElement('a')
    link.download = `qrcode_${Date.now()}.${format}`
    link.href = dataUrl
    link.click()
  }
  const downloadAsSvg = async () => {
    const originalRenderAs = renderAs.value
    renderAs.value = 'svg'
    await new Promise((resolve) => setTimeout(resolve, 100))
    const svg = qrcodeRef.value?.querySelector('svg')
    if (!svg) {
      renderAs.value = originalRenderAs
      ElMessage.error('无法获取SVG元素')
      return
    }
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `qrcode_${Date.now()}.svg`
    link.href = url
    link.click()
    // 下载后立即清理 Blob URL
    setTimeout(() => URL.revokeObjectURL(url), 100)
    URL.revokeObjectURL(url)
    renderAs.value = originalRenderAs
  }
  watch(contentType, () => {
    qrcodeConfig.value.content = ''
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

  .logo-upload {
    display: flex;
    align-items: center;
  }

  .logo-upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    cursor: pointer;
    border: 2px dashed var(--el-border-color);
    border-radius: 8px;
    transition: all 0.3s;

    &:hover {
      background: var(--theme-color-light-9);
      border-color: var(--theme-color);
    }
  }

  .logo-preview {
    position: relative;
    width: 80px;
    height: 80px;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: 1px solid var(--el-border-color);
      border-radius: 8px;
    }
  }

  .logo-remove {
    position: absolute;
    top: -8px;
    right: -8px;
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

  .preview-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 280px;
    padding: 20px;
    background: var(--el-fill-color-lighter);
    border-radius: var(--custom-radius);
  }

  .qrcode-wrapper {
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgb(0 0 0 / 8%);
  }

  .empty-preview {
    text-align: center;
  }

  .download-section {
    padding-top: 20px;
    margin-top: 20px;
    text-align: center;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .download-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }
</style>
