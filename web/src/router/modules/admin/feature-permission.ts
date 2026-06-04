import { AppRouteRecord } from '@/types/router'

/**
 * 功能权限管理路由配置
 * @requirements 1.1, 1.4, 1.5, 1.9
 */
export const featurePermissionRoutes: AppRouteRecord = {
  path: 'feature-permission',
  name: 'FeaturePermission',
  component: '/admin/feature-permission/index',
  meta: {
    title: 'menus.admin.toolManage.featurePermission',
    icon: 'ri:shield-keyhole-line'
  }
}
