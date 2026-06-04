/**
 * Site Settings API
 */

import api from '@/utils/http'
import type { SiteSettings } from '@/store/modules/site-settings'

/**
 * Get all site settings
 */
export function getSettings() {
  return api.get<SiteSettings>({
    url: '/settings'
  })
}

/**
 * Get setting by key
 */
export function getSettingByKey<T = any>(key: string) {
  return api.get<T>({
    url: `/api/settings/${key}`
  })
}

/**
 * Update all settings
 */
export function updateSettings(data: SiteSettings) {
  return api.put<SiteSettings>({
    url: '/settings',
    data,
    showSuccessMessage: true
  })
}

/**
 * Update setting by key
 */
export function updateSettingByKey<T = any>(key: string, data: T) {
  return api.put<T>({
    url: `/api/settings/${key}`,
    data,
    showSuccessMessage: true
  })
}

/**
 * Reset settings to default
 */
export function resetSettings() {
  return api.post<SiteSettings>({
    url: '/settings/reset',
    showSuccessMessage: true
  })
}
