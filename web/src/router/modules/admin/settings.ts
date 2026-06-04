import { AppRouteRecord } from '@/types/router'

/**
 * 系统设置路由配置
 */
export const settingsRoutes: AppRouteRecord = {
  name: 'Settings',
  path: '/admin/settings',
  component: '/index/index',
  redirect: '/admin/settings/index',
  meta: {
    title: 'menus.admin.settings.title',
    icon: 'ri:settings-3-line',
    isFirstLevel: true
  },
  children: [
    {
      path: 'index',
      name: 'SettingsIndex',
      component: '/admin/settings/index',
      meta: {
        title: 'menus.admin.settings.title',
        icon: 'ri:settings-3-line',
        isHide: true,
        activePath: '/admin/settings'
      }
    }
  ]
}
