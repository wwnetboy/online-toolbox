import { AppRouteRecord } from '@/types/router'

/**
 * 个人中心路由配置（前台用户）
 */
export const userCenterRoutes: AppRouteRecord = {
  name: 'UserCenterModule',
  path: '/user-center',
  component: '/index/index',
  redirect: '/user-center/index',
  meta: {
    title: 'menus.system.userCenter',
    icon: 'ri:user-line',
    isHide: true
  },
  children: [
    {
      path: 'index',
      name: 'UserCenter',
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
