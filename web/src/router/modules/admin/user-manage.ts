import { AppRouteRecord } from '@/types/router'

/**
 * 用户管理路由配置
 */
export const userManageRoutes: AppRouteRecord = {
  name: 'UserManage',
  path: '/admin/user-manage',
  component: '/index/index',
  redirect: '/admin/user-manage/list',
  meta: {
    title: 'menus.admin.userManage.title',
    icon: 'ri:user-line'
  },
  children: [
    {
      path: 'list',
      name: 'UserList',
      component: '/system/user',
      meta: {
        title: 'menus.admin.userManage.list',
        icon: 'ri:user-3-line',
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'role',
      name: 'RoleManage',
      component: '/system/role',
      meta: {
        title: 'menus.admin.userManage.role',
        icon: 'ri:shield-user-line',
        roles: ['R_SUPER', 'R_ADMIN']
      }
    },
    {
      path: 'center',
      name: 'AdminUserCenter',
      component: '/system/user-center/index',
      meta: {
        title: 'menus.system.userCenter',
        icon: 'ri:user-line',
        isHide: true,
        keepAlive: true
      }
    }
  ]
}
