import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getSettings,
  updateSettings as apiUpdateSettings,
  resetSettings as apiResetSettings
} from '@/api/settings'

/**
 * 系统设置类型定义
 */
export interface SiteSettings {
  // 基础信息
  basic: {
    siteName: string
    siteSubtitle: string
    siteLogo: string
    favicon: string
    keywords: string
    description: string
  }
  // 用户设置
  user: {
    allowRegister: boolean
    registerCaptcha: boolean
    allowGuest: boolean
    guestDailyLimit: number
    userDailyLimit: number
    enableFeedback: boolean
  }
  // 工具设置
  tool: {
    maxFileSize: number
    resultRetention: number
    showHistory: boolean
    enableWatermark: boolean
    watermarkText: string
  }
  // 外观设置
  appearance: {
    defaultTheme: 'light' | 'dark' | 'system'
    themeColor: string
    showThemeSwitch: boolean
    showLanguageSwitch: boolean
    defaultLanguage: 'zh' | 'en'
  }
  // 公告设置
  announcement: {
    enabled: boolean
    type: 'info' | 'warning' | 'error'
    content: string
    link: string
    closable: boolean
  }
  // 版权信息
  copyright: {
    text: string
    icp: string
    police: string
    showBeian: boolean
  }
  // 联系方式
  contact: {
    email: string
    wechatQrcode: string
    supportLink: string
    privacyLink: string
    termsLink: string
  }
  // 安全设置
  security: {
    loginCaptcha: boolean
    maxLoginAttempts: number
    lockDuration: number
    sessionTimeout: number
    allowMultiLogin: boolean
  }
}

/**
 * 默认设置
 */
const defaultSettings: SiteSettings = {
  basic: {
    siteName: '在线工具箱',
    siteSubtitle: '免费在线工具，所有处理均在本地完成',
    siteLogo: '',
    favicon: '/favicon.ico',
    keywords: '在线工具,PDF处理,图片压缩,格式转换,视频工具',
    description:
      '免费在线工具箱，提供PDF处理、图片压缩、格式转换、视频处理等多种实用工具，所有处理均在本地完成，保护您的隐私安全。'
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
    watermarkText: '在线工具箱'
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
    text: `© ${new Date().getFullYear()} 在线工具箱 All Rights Reserved`,
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
}

/**
 * 系统设置 Store
 */
export const useSiteSettingsStore = defineStore('siteSettings', () => {
  const settings = ref<SiteSettings>(JSON.parse(JSON.stringify(defaultSettings)))
  const initialized = ref(false)
  const loading = ref(false)

  /**
   * 深度合并对象
   */
  const deepMerge = (target: any, source: any): any => {
    const result = { ...target }
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    return result
  }

  /**
   * 应用 favicon
   */
  const applyFavicon = () => {
    const favicon = settings.value.basic.favicon
    if (!favicon) return

    const existingLinks = document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')
    existingLinks.forEach((link) => link.remove())

    let mimeType = 'image/x-icon'
    if (favicon.includes('image/png')) {
      mimeType = 'image/png'
    }

    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = mimeType
    link.href = favicon
    document.head.appendChild(link)

    const shortcutLink = document.createElement('link')
    shortcutLink.rel = 'shortcut icon'
    shortcutLink.type = mimeType
    shortcutLink.href = favicon
    document.head.appendChild(shortcutLink)

    const appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    appleLink.href = favicon
    document.head.appendChild(appleLink)
  }

  /**
   * 从后端加载设置
   */
  const fetchSettings = async () => {
    loading.value = true
    try {
      const data = await getSettings()
      if (data) {
        settings.value = deepMerge(defaultSettings, data)
        applyFavicon()
      }
    } catch (err) {
      console.warn('Failed to fetch settings, using defaults:', err)
      // Fallback to default settings on error - this is expected on first load
    } finally {
      loading.value = false
    }
  }

  /**
   * 初始化设置（同步版本，用于应用启动）
   */
  const initSettings = () => {
    if (initialized.value) return
    initialized.value = true
    // 异步加载设置，不阻塞应用启动
    fetchSettings()
  }

  /**
   * 保存设置到后端
   */
  const saveSettings = async () => {
    loading.value = true
    try {
      const data = await apiUpdateSettings(settings.value)
      settings.value = deepMerge(defaultSettings, data)
      applyFavicon()
    } catch (err) {
      console.error('Failed to save settings:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新设置
   */
  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    settings.value = deepMerge(settings.value, newSettings)
    await saveSettings()
  }

  /**
   * 更新单个分组设置
   */
  const updateGroup = async <K extends keyof SiteSettings>(
    group: K,
    data: Partial<SiteSettings[K]>
  ) => {
    settings.value[group] = { ...settings.value[group], ...data }
    await saveSettings()
  }

  /**
   * 重置为默认设置
   */
  const resetToDefault = async () => {
    loading.value = true
    try {
      const data = await apiResetSettings()
      settings.value = deepMerge(defaultSettings, data)
      applyFavicon()
    } catch (err) {
      console.error('Failed to reset settings:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 便捷的 getter
  const siteName = computed(() => settings.value.basic.siteName)
  const siteSubtitle = computed(() => settings.value.basic.siteSubtitle)
  const siteLogo = computed(() => settings.value.basic.siteLogo)
  const favicon = computed(() => settings.value.basic.favicon)
  const announcement = computed(() => settings.value.announcement)
  const copyright = computed(() => settings.value.copyright)
  const contact = computed(() => settings.value.contact)

  return {
    settings,
    initialized,
    loading,

    // Actions
    initSettings,
    fetchSettings,
    saveSettings,
    updateSettings,
    updateGroup,
    resetToDefault,
    applyFavicon,

    // Getters
    siteName,
    siteSubtitle,
    siteLogo,
    favicon,
    announcement,
    copyright,
    contact
  }
})
