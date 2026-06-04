import { AppRouteRecord } from '@/types/router'

/**
 * 实用工具路由配置（后台管理）
 * 一级菜单使用 /index/index 布局
 * 设置 isFirstLevel: true 使其作为独立菜单项显示（不展开子菜单）
 */
export const toolboxUtilsRoutes: AppRouteRecord = {
  name: 'ToolboxUtils',
  path: '/admin/toolbox-utils',
  component: '/index/index',
  redirect: '/admin/toolbox-utils/index',
  meta: {
    title: 'menus.toolbox.utils.title',
    icon: 'ri:tools-fill',
    isFirstLevel: true
  },
  children: [
    // 分类首页
    {
      path: 'index',
      name: 'ToolboxUtilsIndex',
      component: '/toolbox/category/index',
      meta: {
        title: 'menus.toolbox.utils.title',
        icon: 'ri:tools-fill',
        category: 'utils',
        isHide: true
      }
    },
    // 二维码生成
    {
      path: 'qrcode',
      name: 'UtilsQrcode',
      component: '/toolbox/utils/qrcode/index',
      meta: {
        title: 'menus.toolbox.utils.qrcode',
        icon: 'ri:qr-code-line',
        isHide: true
      }
    },
    // Base64转换
    {
      path: 'base64',
      name: 'UtilsBase64',
      component: '/toolbox/utils/base64/index',
      meta: {
        title: 'menus.toolbox.utils.base64',
        icon: 'ri:code-s-slash-line',
        isHide: true
      }
    },
    // 视频万能提取
    {
      path: 'video-extractor',
      name: 'UtilsVideoExtractor',
      component: '/toolbox/utils/video-extractor/index',
      meta: {
        title: 'menus.toolbox.utils.videoExtractor',
        icon: 'ri:video-download-line',
        isHide: true
      }
    },
    // 历史记录
    {
      path: 'history',
      name: 'ToolboxHistory',
      component: '/toolbox/history/index',
      meta: {
        title: 'menus.toolbox.history',
        icon: 'ri:history-line',
        isHide: true
      }
    }
  ]
}
