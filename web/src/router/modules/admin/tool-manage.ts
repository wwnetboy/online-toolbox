import { AppRouteRecord } from '@/types/router'
import { featurePermissionRoutes } from './feature-permission'

/**
 * 工具管理路由配置
 */
export const toolManageRoutes: AppRouteRecord = {
  name: 'ToolManage',
  path: '/admin/tool-manage',
  component: '/index/index',
  redirect: '/admin/tool-manage/list',
  meta: {
    title: 'menus.admin.toolManage.title',
    icon: 'ri:tools-line'
  },
  children: [
    {
      path: 'list',
      name: 'ToolList',
      component: '/system/tool-manage',
      meta: {
        title: 'menus.admin.toolManage.list',
        icon: 'ri:list-check'
      }
    },
    {
      path: 'category',
      name: 'ToolCategory',
      component: '/admin/category-manage/index',
      meta: {
        title: 'menus.admin.toolManage.category',
        icon: 'ri:folder-line'
      }
    },
    {
      path: 'config',
      name: 'ToolConfig',
      component: '/system/toolbox-settings',
      meta: {
        title: 'menus.admin.toolManage.config',
        icon: 'ri:settings-4-line'
      }
    },
    featurePermissionRoutes
  ]
}
