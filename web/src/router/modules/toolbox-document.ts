import { AppRouteRecord } from '@/types/router'

/**
 * 文档转换工具路由配置（后台管理）
 * 一级菜单使用 /index/index 布局
 * 设置 isFirstLevel: true 使其作为独立菜单项显示（不展开子菜单）
 */
export const toolboxDocumentRoutes: AppRouteRecord = {
  name: 'ToolboxDocument',
  path: '/admin/toolbox-document',
  component: '/index/index',
  redirect: '/admin/toolbox-document/index',
  meta: {
    title: 'menus.toolbox.document.title',
    icon: 'ri:file-text-line',
    isFirstLevel: true
  },
  children: [
    // 分类首页
    {
      path: 'index',
      name: 'ToolboxDocumentIndex',
      component: '/toolbox/category/index',
      meta: {
        title: 'menus.toolbox.document.title',
        icon: 'ri:file-text-line',
        category: 'document',
        isHide: true
      }
    }
  ]
}
