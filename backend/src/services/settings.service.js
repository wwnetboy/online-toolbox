/**
 * Site Settings Service
 * Handles business logic for system settings
 */

const SiteSetting = require('../models/setting.model');

// Default settings structure
const defaultSettings = {
  basic: {
    siteName: '在线工具箱',
    siteSubtitle: '免费在线工具，所有处理均在本地完成',
    siteLogo: '',
    favicon: '/favicon.ico',
    keywords: '在线工具,PDF处理,图片压缩,格式转换,视频工具',
    description: '免费在线工具箱，提供PDF处理、图片压缩、格式转换、视频处理等多种实用工具。'
  },
  user: {
    allowRegister: true,
    registerCaptcha: true,
    allowGuest: true,
    guestDailyLimit: 10,
    userDailyLimit: 100
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
};

/**
 * Get all settings
 */
const getAllSettings = async () => {
  const settings = await SiteSetting.findAll();
  
  // Build settings object from database records
  const result = { ...defaultSettings };
  
  for (const setting of settings) {
    if (result[setting.settingKey] !== undefined) {
      result[setting.settingKey] = setting.settingValue;
    }
  }
  
  return result;
};

/**
 * Get setting by key
 */
const getSettingByKey = async (key) => {
  const setting = await SiteSetting.findOne({
    where: { settingKey: key }
  });
  
  if (setting) {
    return setting.settingValue;
  }
  
  return defaultSettings[key] || null;
};

/**
 * Update all settings
 */
const updateAllSettings = async (newSettings) => {
  const keys = Object.keys(newSettings);
  
  for (const key of keys) {
    if (defaultSettings[key] !== undefined) {
      await SiteSetting.upsert({
        settingKey: key,
        settingValue: newSettings[key]
      });
    }
  }
  
  return getAllSettings();
};

/**
 * Update setting by key
 */
const updateSettingByKey = async (key, value) => {
  if (defaultSettings[key] === undefined) {
    throw new Error(`Invalid setting key: ${key}`);
  }
  
  await SiteSetting.upsert({
    settingKey: key,
    settingValue: value
  });
  
  return getSettingByKey(key);
};

/**
 * Reset all settings to default
 */
const resetToDefault = async () => {
  await SiteSetting.destroy({ where: {} });
  return defaultSettings;
};

/**
 * Initialize default settings if not exist
 */
const initializeSettings = async () => {
  const count = await SiteSetting.count();
  
  if (count === 0) {
    const keys = Object.keys(defaultSettings);
    for (const key of keys) {
      await SiteSetting.create({
        settingKey: key,
        settingValue: defaultSettings[key]
      });
    }
  }
};

module.exports = {
  defaultSettings,
  getAllSettings,
  getSettingByKey,
  updateAllSettings,
  updateSettingByKey,
  resetToDefault,
  initializeSettings
};
