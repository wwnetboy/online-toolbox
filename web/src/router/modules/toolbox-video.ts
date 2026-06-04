import { AppRouteRecord } from '@/types/router'

/**
 * 视频工具路由配置（后台管理）
 * 一级菜单使用 /index/index 布局
 * 设置 isFirstLevel: true 使其作为独立菜单项显示（不展开子菜单）
 */
export const toolboxVideoRoutes: AppRouteRecord = {
  name: 'ToolboxVideo',
  path: '/admin/toolbox-video',
  component: '/index/index',
  redirect: '/admin/toolbox-video/index',
  meta: {
    title: 'menus.toolbox.video.title',
    icon: 'ri:video-line',
    isFirstLevel: true
  },
  children: [
    // 分类首页
    {
      path: 'index',
      name: 'ToolboxVideoIndex',
      component: '/toolbox/category/index',
      meta: {
        title: 'menus.toolbox.video.title',
        icon: 'ri:video-line',
        category: 'video',
        isHide: true
      }
    },
    // 在线录屏
    {
      path: 'screen-record',
      name: 'ToolboxVideoScreenRecord',
      component: '/toolbox/video/screen-record/index',
      meta: {
        title: 'menus.toolbox.video.screenRecord',
        icon: 'ri:record-circle-line',
        isHide: true
      }
    },
    // 视频转GIF
    {
      path: 'video-to-gif',
      name: 'ToolboxVideoToGif',
      component: '/toolbox/video/video-to-gif/index',
      meta: {
        title: 'menus.toolbox.video.videoToGif',
        icon: 'ri:file-gif-line',
        isHide: true
      }
    },
  ]
}
