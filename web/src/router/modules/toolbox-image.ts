import { AppRouteRecord } from '@/types/router'

/**
 * 图片工具路由配置（后台管理）
 * 一级菜单使用 /index/index 布局
 * 设置 isFirstLevel: true 使其作为独立菜单项显示（不展开子菜单）
 */
export const toolboxImageRoutes: AppRouteRecord = {
  name: 'ToolboxImage',
  path: '/admin/toolbox-image',
  component: '/index/index',
  redirect: '/admin/toolbox-image/index',
  meta: {
    title: 'menus.toolbox.image.title',
    icon: 'ri:image-line',
    isFirstLevel: true
  },
  children: [
    // 分类首页
    {
      path: 'index',
      name: 'ToolboxImageIndex',
      component: '/toolbox/category/index',
      meta: {
        title: 'menus.toolbox.image.title',
        icon: 'ri:image-line',
        category: 'image',
        isHide: true
      }
    },
    // 图片压缩
    {
      path: 'compress',
      name: 'ToolboxImageCompress',
      component: '/toolbox/image/compress/index',
      meta: {
        title: 'menus.toolbox.image.compress',
        icon: 'ri:file-reduce-line',
        isHide: true
      }
    },
    // 格式转换
    {
      path: 'convert',
      name: 'ToolboxImageConvert',
      component: '/toolbox/image/convert/index',
      meta: {
        title: 'menus.toolbox.image.convert',
        icon: 'ri:exchange-line',
        isHide: true
      }
    },
    // 图片裁剪
    {
      path: 'crop',
      name: 'ToolboxImageCrop',
      component: '/toolbox/image/crop/index',
      meta: {
        title: 'menus.toolbox.image.crop',
        icon: 'ri:crop-line',
        isHide: true
      }
    },
    // 图片旋转
    {
      path: 'rotate',
      name: 'ToolboxImageRotate',
      component: '/toolbox/image/rotate/index',
      meta: {
        title: 'menus.toolbox.image.rotate',
        icon: 'ri:anticlockwise-line',
        isHide: true
      }
    },
    // 尺寸调整
    {
      path: 'resize',
      name: 'ToolboxImageResize',
      component: '/toolbox/image/resize/index',
      meta: {
        title: 'menus.toolbox.image.resize',
        icon: 'ri:aspect-ratio-line',
        isHide: true
      }
    },
    // 长图拼接
    {
      path: 'splice',
      name: 'ToolboxImageSplice',
      component: '/toolbox/image/splice/index',
      meta: {
        title: 'menus.toolbox.image.splice',
        icon: 'ri:layout-row-line',
        isHide: true
      }
    },
    // 图片水印
    {
      path: 'watermark',
      name: 'ToolboxImageWatermark',
      component: '/toolbox/image/watermark/index',
      meta: {
        title: 'menus.toolbox.image.watermark',
        icon: 'ri:drop-line',
        isHide: true
      }
    },
    // 图片去水印
    {
      path: 'remove-watermark',
      name: 'ToolboxImageRemoveWatermark',
      component: '/toolbox/image/remove-watermark/index',
      meta: {
        title: 'menus.toolbox.image.removeWatermark',
        icon: 'ri:eraser-line',
        isHide: true
      }
    }
  ]
}
