import { AppRouteRecord } from '@/types/router'

/**
 * 所有工具路由配置（后台管理）
 * 一级菜单使用 /index/index 布局
 * 设置 isFirstLevel: true 使其作为独立菜单项显示（不展开子菜单）
 */
export const toolboxAllRoutes: AppRouteRecord = {
  name: 'ToolboxAll',
  path: '/admin/toolbox-all',
  component: '/index/index',
  redirect: '/admin/toolbox-all/index',
  meta: {
    title: 'menus.toolbox.all.title',
    icon: 'ri:apps-line',
    isFirstLevel: true
  },
  children: [
    // 所有工具首页
    {
      path: 'index',
      name: 'ToolboxAllIndex',
      component: '/toolbox/index/index',
      meta: {
        title: 'menus.toolbox.all.title',
        icon: 'ri:apps-line',
        isHide: true
      }
    }
  ]
}
