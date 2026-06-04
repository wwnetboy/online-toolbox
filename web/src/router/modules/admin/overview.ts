import { AppRouteRecord } from '@/types/router'

/**
 * 数据概览路由配置
 */
export const overviewRoutes: AppRouteRecord = {
  name: 'Overview',
  path: '/admin/overview',
  component: '/index/index',
  redirect: '/admin/overview/index',
  meta: {
    title: 'menus.admin.overview.title',
    icon: 'ri:pie-chart-line',
    isFirstLevel: true
  },
  children: [
    {
      path: 'index',
      name: 'OverviewIndex',
      component: '/admin/overview',
      meta: {
        title: 'menus.admin.overview.title',
        icon: 'ri:pie-chart-line',
        isHide: true,
        fixedTab: true,
        activePath: '/admin/overview'
      }
    }
  ]
}
