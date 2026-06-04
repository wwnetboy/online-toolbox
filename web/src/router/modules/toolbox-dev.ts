import { AppRouteRecord } from '@/types/router'

/**
 * 开发工具路由配置（后台管理）
 * 一级菜单使用 /index/index 布局
 * 设置 isFirstLevel: true 使其作为独立菜单项显示（不展开子菜单）
 */
export const toolboxDevRoutes: AppRouteRecord = {
  name: 'ToolboxDev',
  path: '/admin/toolbox-dev',
  component: '/index/index',
  redirect: '/admin/toolbox-dev/index',
  meta: {
    title: 'menus.toolbox.dev.title',
    icon: 'ri:code-line',
    isFirstLevel: true
  },
  children: [
    // 分类首页
    {
      path: 'index',
      name: 'ToolboxDevIndex',
      component: '/toolbox/category/index',
      meta: {
        title: 'menus.toolbox.dev.title',
        icon: 'ri:code-line',
        category: 'dev',
        isHide: true
      }
    }
  ]
}
