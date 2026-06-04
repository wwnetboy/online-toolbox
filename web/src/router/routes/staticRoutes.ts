import { AppRouteRecordRaw } from '@/utils/router'
import { portalRoutes } from './portalRoutes'

/**
 * 静态路由配置（不需要权限就能访问的路由）
 *
 * 路由结构：
 * - / 前台工具箱（无需登录）
 * - /admin 后台管理（需要登录）
 *
 * 属性说明：
 * isHideTab: true 表示不在标签页中显示
 */
export const staticRoutes: AppRouteRecordRaw[] = [
  // 前台路由（工具箱，无需登录）
  ...portalRoutes,

  // ========== 前台认证路由 ==========
  // 前台登录页
  {
    path: '/login',
    name: 'Login',
    component: () => import('@views/auth/login/index.vue'),
    meta: { title: '登录', isHideTab: true }
  },
  // 前台注册页
  {
    path: '/register',
    name: 'Register',
    component: () => import('@views/auth/register/index.vue'),
    meta: { title: '前台注册', isHideTab: true }
  },
  // 前台忘记密码页
  {
    path: '/forget-password',
    name: 'PortalForgetPassword',
    component: () => import('@views/auth/forget-password/index.vue'),
    meta: { title: '忘记密码', isHideTab: true }
  },

  // ========== 后台路由（/admin 前缀）==========
  // 后台入口重定向到登录页
  {
    path: '/admin',
    redirect: '/admin/login'
  },
  // 后台登录页
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@views/auth/login/index.vue'),
    meta: { title: 'menus.login.title', isHideTab: true }
  },
  {
    path: '/admin/register',
    name: 'AdminRegister',
    component: () => import('@views/auth/register/index.vue'),
    meta: { title: 'menus.register.title', isHideTab: true }
  },
  {
    path: '/admin/forget-password',
    name: 'AdminForgetPassword',
    component: () => import('@views/auth/forget-password/index.vue'),
    meta: { title: 'menus.forgetPassword.title', isHideTab: true }
  },
  // 兼容旧路径
  {
    path: '/auth/login',
    redirect: '/admin/login'
  },
  {
    path: '/auth/register',
    redirect: '/admin/register'
  },
  // 异常页面
  {
    path: '/403',
    name: 'Exception403',
    component: () => import('@views/exception/403/index.vue'),
    meta: { title: '403', isHideTab: true }
  },
  {
    path: '/500',
    name: 'Exception500',
    component: () => import('@views/exception/500/index.vue'),
    meta: { title: '500', isHideTab: true }
  },
  // iframe 内嵌页面
  {
    path: '/outside',
    component: () => import('@views/index/index.vue'),
    name: 'Outside',
    meta: { title: 'menus.outside.title' },
    children: [
      {
        path: '/outside/iframe/:path',
        name: 'Iframe',
        component: () => import('@/views/outside/Iframe.vue'),
        meta: { title: 'iframe' }
      }
    ]
  },
  // 个人中心（前台用户，需要登录）
  {
    path: '/user-center',
    component: () => import('@views/index/index.vue'),
    name: 'UserCenterModule',
    redirect: '/user-center/index',
    meta: { title: 'menus.system.userCenter', isHide: true },
    children: [
      {
        path: 'index',
        name: 'UserCenter',
        component: () => import('@views/system/user-center/index.vue'),
        meta: { title: 'menus.system.userCenter', isHide: true, keepAlive: true }
      }
    ]
  },
  // 404 放在最后
  {
    path: '/:pathMatch(.*)*',
    name: 'Exception404',
    component: () => import('@views/exception/404/index.vue'),
    meta: { title: '404', isHideTab: true }
  }
]
