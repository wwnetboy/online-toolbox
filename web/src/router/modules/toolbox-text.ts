import { AppRouteRecord } from '@/types/router'

/**
 * 文本工具路由配置（后台管理）
 * 一级菜单使用 /index/index 布局
 * 设置 isFirstLevel: true 使其作为独立菜单项显示（不展开子菜单）
 */
export const toolboxTextRoutes: AppRouteRecord = {
  name: 'ToolboxText',
  path: '/admin/toolbox-text',
  component: '/index/index',
  redirect: '/admin/toolbox-text/index',
  meta: {
    title: 'menus.toolbox.text.title',
    icon: 'ri:text',
    isFirstLevel: true
  },
  children: [
    // 分类首页
    {
      path: 'index',
      name: 'ToolboxTextIndex',
      component: '/toolbox/category/index',
      meta: {
        title: 'menus.toolbox.text.title',
        icon: 'ri:text',
        category: 'text',
        isHide: true
      }
    }
  ]
}
