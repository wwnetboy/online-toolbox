<template>
  <div class="settings-page art-full-height">
    <ElCard shadow="never" class="art-table-card">
      <!-- 设置内容 -->
      <div class="settings-content">
        <!-- 基础信息 -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:global-line" class="text-lg" />
            <span>基础信息</span>
          </div>
          <ArtForm
            v-model="formData.basic"
            :items="basicFormItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="100px"
          >
            <template #siteLogo>
              <div class="upload-wrapper">
                <ElUpload
                  class="logo-uploader"
                  :show-file-list="false"
                  :before-upload="handleLogoUpload"
                  accept="image/*"
                >
                  <img
                    v-if="formData.basic.siteLogo"
                    :src="formData.basic.siteLogo"
                    class="logo-preview"
                  />
                  <div v-else class="upload-placeholder">
                    <ArtSvgIcon icon="ri:upload-cloud-line" class="text-2xl" />
                    <span>上传Logo</span>
                  </div>
                </ElUpload>
                <ElButton
                  v-if="formData.basic.siteLogo"
                  link
                  type="danger"
                  @click="formData.basic.siteLogo = ''"
                >
                  移除
                </ElButton>
              </div>
            </template>
            <template #favicon>
              <div class="upload-wrapper">
                <ElUpload
                  class="favicon-uploader"
                  :show-file-list="false"
                  :before-upload="handleFaviconUpload"
                  accept=".ico,.png"
                >
                  <img
                    v-if="formData.basic.favicon"
                    :src="formData.basic.favicon"
                    class="favicon-preview"
                  />
                  <div v-else class="upload-placeholder small">
                    <ArtSvgIcon icon="ri:image-add-line" class="text-xl" />
                  </div>
                </ElUpload>
                <span class="upload-tip">支持 .ico 或 .png 格式</span>
              </div>
            </template>
          </ArtForm>
        </div>

        <!-- 用户设置 -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:user-settings-line" class="text-lg" />
            <span>用户设置</span>
          </div>
          <ArtForm
            v-model="formData.user"
            :items="userFormItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="120px"
          />
        </div>

        <!-- 外观设置 -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:palette-line" class="text-lg" />
            <span>外观设置</span>
          </div>
          <ArtForm
            v-model="formData.appearance"
            :items="appearanceFormItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="120px"
          />
        </div>

        <!-- 版权信息 -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:copyright-line" class="text-lg" />
            <span>版权信息</span>
          </div>
          <ArtForm
            v-model="formData.copyright"
            :items="copyrightFormItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="120px"
          />
        </div>

        <!-- 联系方式 -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:contacts-line" class="text-lg" />
            <span>联系方式</span>
          </div>
          <ArtForm
            v-model="formData.contact"
            :items="contactFormItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="120px"
          >
            <template #wechatQrcode>
              <div class="upload-wrapper">
                <ElUpload
                  class="qrcode-uploader"
                  :show-file-list="false"
                  :before-upload="handleQrcodeUpload"
                  accept="image/*"
                >
                  <img
                    v-if="formData.contact.wechatQrcode"
                    :src="formData.contact.wechatQrcode"
                    class="qrcode-preview"
                  />
                  <div v-else class="upload-placeholder small">
                    <ArtSvgIcon icon="ri:qr-code-line" class="text-xl" />
                  </div>
                </ElUpload>
                <ElButton
                  v-if="formData.contact.wechatQrcode"
                  link
                  type="danger"
                  @click="formData.contact.wechatQrcode = ''"
                >
                  移除
                </ElButton>
              </div>
            </template>
          </ArtForm>
        </div>

        <!-- 安全设置 -->
        <div class="settings-section">
          <div class="section-header">
            <ArtSvgIcon icon="ri:shield-check-line" class="text-lg" />
            <span>安全设置</span>
          </div>
          <ArtForm
            v-model="formData.security"
            :items="securityFormItems"
            :span="12"
            :show-reset="false"
            :show-submit="false"
            label-width="120px"
          />
        </div>
      </div>
      <ArtTableHeader layout="" :loading="saving">
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" :loading="saving" @click="handleSave" v-ripple
              >保存设置</ElButton
            >
            <ElButton @click="handleReset" v-ripple>重置默认</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, computed } from 'vue'
  import { ElMessage, ElMessageBox, type UploadRawFile } from 'element-plus'
  import ArtTableHeader from '@/components/core/tables/art-table-header/index.vue'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import { useSiteSettingsStore, type SiteSettings } from '@/store/modules/site-settings'

  defineOptions({ name: 'AdminSettings' })

  const siteSettingsStore = useSiteSettingsStore()
  const saving = ref(false)

  // 表单数据
  const formData = reactive<SiteSettings>({
    basic: {
      siteName: '',
      siteSubtitle: '',
      siteLogo: '',
      favicon: '',
      keywords: '',
      description: ''
    },
    user: {
      allowRegister: true,
      registerCaptcha: true,
      allowGuest: true,
      guestDailyLimit: 10,
      userDailyLimit: 100,
      enableFeedback: true
    },
    tool: {
      maxFileSize: 200,
      resultRetention: 24,
      showHistory: true,
      enableWatermark: false,
      watermarkText: ''
    },
    appearance: {
      defaultTheme: 'light',
      themeColor: '#409EFF',
      showThemeSwitch: true,
      showLanguageSwitch: true,
      defaultLanguage: 'zh'
    },
    announcement: {
      enabled: false,
      type: 'info',
      content: '',
      link: '',
      closable: true
    },
    copyright: {
      text: '',
      icp: '',
      police: '',
      showBeian: false
    },
    contact: {
      email: '',
      wechatQrcode: '',
      supportLink: '',
      privacyLink: '',
      termsLink: ''
    },
    security: {
      loginCaptcha: true,
      maxLoginAttempts: 5,
      lockDuration: 30,
      sessionTimeout: 7,
      allowMultiLogin: true
    }
  })

  // 基础信息表单配置
  const basicFormItems = computed<FormItem[]>(() => [
    { key: 'siteName', label: '网站名称', type: 'input', placeholder: '请输入网站名称', span: 12 },
    {
      key: 'siteSubtitle',
      label: '网站副标题',
      type: 'input',
      placeholder: '请输入网站副标题',
      span: 12
    },
    { key: 'siteLogo', label: '网站Logo', span: 12 },
    { key: 'favicon', label: '浏览器图标', span: 12 },
    {
      key: 'keywords',
      label: '网站关键词',
      type: 'input',
      placeholder: '多个关键词用逗号分隔',
      span: 24
    },
    {
      key: 'description',
      label: '网站描述',
      type: 'input',
      props: { type: 'textarea', rows: 3 },
      placeholder: '用于SEO的网站描述',
      span: 24
    }
  ])

  // 用户设置表单配置
  const userFormItems = computed<FormItem[]>(() => [
    { key: 'allowRegister', label: '允许用户注册', type: 'switch', span: 12 },
    {
      key: 'registerCaptcha',
      label: '注册需要验证码',
      type: 'switch',
      props: { disabled: !formData.user.allowRegister },
      span: 12
    },
    { key: 'allowGuest', label: '允许游客使用', type: 'switch', span: 12 },
    {
      key: 'guestDailyLimit',
      label: '游客使用限制',
      type: 'number',
      props: { min: 0, max: 1000, disabled: !formData.user.allowGuest },
      span: 12
    },
    {
      key: 'userDailyLimit',
      label: '登录用户限制',
      type: 'number',
      props: { min: 0, max: 10000 },
      span: 12
    },
    { key: 'enableFeedback', label: '启用用户反馈', type: 'switch', span: 12 }
  ])

  // 外观设置表单配置
  const appearanceFormItems = computed<FormItem[]>(() => [
    {
      key: 'defaultTheme',
      label: '默认主题',
      type: 'select',
      props: {
        options: [
          { label: '浅色', value: 'light' },
          { label: '深色', value: 'dark' },
          { label: '跟随系统', value: 'system' }
        ]
      },
      span: 12
    },
    {
      key: 'defaultLanguage',
      label: '默认语言',
      type: 'select',
      props: {
        options: [
          { label: '简体中文', value: 'zh' },
          { label: 'English', value: 'en' }
        ]
      },
      span: 12
    },
    { key: 'showThemeSwitch', label: '显示主题切换', type: 'switch', span: 12 },
    { key: 'showLanguageSwitch', label: '显示语言切换', type: 'switch', span: 12 }
  ])

  // 版权信息表单配置
  const copyrightFormItems = computed<FormItem[]>(() => [
    { key: 'text', label: '版权文本', type: 'input', placeholder: '请输入版权文本', span: 24 },
    {
      key: 'icp',
      label: 'ICP备案号',
      type: 'input',
      placeholder: '如：京ICP备XXXXXXXX号',
      span: 12
    },
    {
      key: 'police',
      label: '公安备案号',
      type: 'input',
      placeholder: '如：京公网安备XXXXXXXXXX号',
      span: 12
    },
    { key: 'showBeian', label: '显示备案信息', type: 'switch', span: 12 }
  ])

  // 联系方式表单配置
  const contactFormItems = computed<FormItem[]>(() => [
    {
      key: 'email',
      label: '联系邮箱',
      type: 'input',
      placeholder: 'contact@example.com',
      span: 12
    },
    { key: 'wechatQrcode', label: '微信公众号', span: 12 },
    {
      key: 'supportLink',
      label: '技术支持链接',
      type: 'input',
      placeholder: 'https://...',
      span: 12
    },
    {
      key: 'privacyLink',
      label: '隐私政策链接',
      type: 'input',
      placeholder: 'https://...',
      span: 12
    },
    { key: 'termsLink', label: '用户协议链接', type: 'input', placeholder: 'https://...', span: 12 }
  ])

  // 安全设置表单配置
  const securityFormItems = computed<FormItem[]>(() => [
    { key: 'loginCaptcha', label: '登录验证码', type: 'switch', span: 12 },
    { key: 'allowMultiLogin', label: '允许多端登录', type: 'switch', span: 12 },
    {
      key: 'maxLoginAttempts',
      label: '最大登录尝试',
      type: 'number',
      props: { min: 1, max: 20 },
      span: 12
    },
    {
      key: 'lockDuration',
      label: '锁定时长(分钟)',
      type: 'number',
      props: { min: 1, max: 1440 },
      span: 12
    },
    {
      key: 'sessionTimeout',
      label: '会话超时(天)',
      type: 'number',
      props: { min: 1, max: 30 },
      span: 12
    }
  ])

  // 加载设置
  const loadSettings = async () => {
    saving.value = true
    try {
      await siteSettingsStore.fetchSettings()
      Object.assign(formData, JSON.parse(JSON.stringify(siteSettingsStore.settings)))
    } catch {
      ElMessage.error('加载设置失败')
    } finally {
      saving.value = false
    }
  }

  // 文件转Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Logo上传
  const handleLogoUpload = async (file: UploadRawFile) => {
    if (file.size > 2 * 1024 * 1024) {
      ElMessage.error('Logo文件大小不能超过2MB')
      return false
    }
    formData.basic.siteLogo = await fileToBase64(file)
    return false
  }

  // Favicon上传
  const handleFaviconUpload = async (file: UploadRawFile) => {
    if (file.size > 512 * 1024) {
      ElMessage.error('图标文件大小不能超过512KB')
      return false
    }
    formData.basic.favicon = await fileToBase64(file)
    return false
  }

  // 二维码上传
  const handleQrcodeUpload = async (file: UploadRawFile) => {
    if (file.size > 1024 * 1024) {
      ElMessage.error('二维码图片大小不能超过1MB')
      return false
    }
    formData.contact.wechatQrcode = await fileToBase64(file)
    return false
  }

  // 保存设置
  const handleSave = async () => {
    saving.value = true
    try {
      await siteSettingsStore.updateSettings(formData)
    } catch {
      // 错误已由 HTTP 拦截器处理
    } finally {
      saving.value = false
    }
  }

  // 重置设置
  const handleReset = () => {
    ElMessageBox.confirm('确定要重置为默认设置吗？所有修改将丢失！', '重置确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        saving.value = true
        try {
          await siteSettingsStore.resetToDefault()
          Object.assign(formData, JSON.parse(JSON.stringify(siteSettingsStore.settings)))
        } catch {
          // 错误已由 HTTP 拦截器处理
        } finally {
          saving.value = false
        }
      })
      .catch(() => {})
  }

  onMounted(() => {
    loadSettings()
  })
</script>

<style scoped lang="scss">
  .settings-page {
    .settings-content {
      padding: 0 0 16px;
    }

    .settings-section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--el-border-color-lighter);

      &:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 15px;
      color: var(--el-text-color-primary);
      margin-bottom: 0;
      padding: 16px 16px 0;
    }

    .upload-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-uploader,
    .favicon-uploader,
    .qrcode-uploader {
      :deep(.el-upload) {
        border: 1px dashed var(--el-border-color);
        border-radius: 8px;
        cursor: pointer;
        overflow: hidden;
        transition: border-color 0.2s;

        &:hover {
          border-color: var(--el-color-primary);
        }
      }
    }

    .logo-preview {
      width: 100px;
      height: 100px;
      object-fit: contain;
    }

    .favicon-preview {
      width: 48px;
      height: 48px;
      object-fit: contain;
      background: var(--el-fill-color-light);
      border-radius: 4px;
    }

    .qrcode-preview {
      width: 100px;
      height: 100px;
      object-fit: contain;
    }

    .upload-placeholder {
      width: 100px;
      height: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--el-text-color-placeholder);
      font-size: 12px;

      &.small {
        width: 48px;
        height: 48px;
      }
    }

    .upload-tip {
      color: var(--el-text-color-placeholder);
      font-size: 12px;
    }
  }
</style>
