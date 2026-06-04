import { AppRouteRecordRaw } from '@/utils/router'

/**
 * 前台路由配置（工具箱，无需登录）
 *
 * 前台页面特点：
 * - 无需登录即可访问
 * - 使用和后台一样的布局（带侧边栏菜单）
 * - 只展示工具类目
 * - 使用根路径 /
 */
export const portalRoutes: AppRouteRecordRaw[] = [
  // ========== 所有工具 ==========
  {
    path: '/',
    name: 'PortalAll',
    component: () => import('@/views/index/index.vue'),
    redirect: '/index',
    meta: {
      title: '所有工具',
      icon: 'ri:apps-2-fill',
      isFirstLevel: true
    },
    children: [
      {
        path: 'index',
        name: 'PortalIndex',
        component: () => import('@/views/toolbox/index/index.vue'),
        meta: {
          title: '所有工具',
          icon: 'ri:apps-2-fill',
          isHide: true,
          activePath: '/',
          keepAlive: true
        }
      },
      {
        path: 'history',
        name: 'PortalHistory',
        component: () => import('@/views/toolbox/history/index.vue'),
        meta: {
          title: '历史记录',
          icon: 'ri:history-line',
          isHide: true,
          activePath: '/',
          keepAlive: true
        }
      },
      {
        path: 'feedback',
        name: 'PortalFeedback',
        component: () => import('@/views/toolbox/feedback/index.vue'),
        meta: {
          title: '意见反馈',
          icon: 'ri:feedback-line',
          isHide: true,
          activePath: '/',
          keepAlive: true
        }
      }
    ]
  },
  // ========== 图片工具 ==========
  {
    path: '/image',
    name: 'PortalImage',
    component: () => import('@/views/index/index.vue'),
    redirect: '/image/index',
    meta: {
      title: '图片工具',
      icon: 'ri:image-fill',
      isFirstLevel: true
    },
    children: [
      {
        path: 'index',
        name: 'PortalImageIndex',
        component: () => import('@/views/toolbox/category/index.vue'),
        meta: {
          title: '图片工具',
          icon: 'ri:image-fill',
          category: 'image',
          isHide: true,
          activePath: '/image',
          keepAlive: true
        }
      },
      {
        path: 'compress',
        name: 'PortalImageCompress',
        component: () => import('@/views/toolbox/image/compress/index.vue'),
        meta: { title: '图片压缩', isHide: true, activePath: '/image', keepAlive: true }
      },
      {
        path: 'convert',
        name: 'PortalImageConvert',
        component: () => import('@/views/toolbox/image/convert/index.vue'),
        meta: { title: '格式转换', isHide: true, activePath: '/image', keepAlive: true }
      },
      {
        path: 'crop',
        name: 'PortalImageCrop',
        component: () => import('@/views/toolbox/image/crop/index.vue'),
        meta: { title: '图片裁剪', isHide: true, activePath: '/image', keepAlive: true }
      },
      {
        path: 'rotate',
        name: 'PortalImageRotate',
        component: () => import('@/views/toolbox/image/rotate/index.vue'),
        meta: { title: '图片旋转', isHide: true, activePath: '/image', keepAlive: true }
      },
      {
        path: 'resize',
        name: 'PortalImageResize',
        component: () => import('@/views/toolbox/image/resize/index.vue'),
        meta: { title: '尺寸调整', isHide: true, activePath: '/image', keepAlive: true }
      },
      {
        path: 'splice',
        name: 'PortalImageSplice',
        component: () => import('@/views/toolbox/image/splice/index.vue'),
        meta: { title: '长图拼接', isHide: true, activePath: '/image', keepAlive: true }
      },
      {
        path: 'watermark',
        name: 'PortalImageWatermark',
        component: () => import('@/views/toolbox/image/watermark/index.vue'),
        meta: { title: '图片水印', isHide: true, activePath: '/image', keepAlive: true }
      },
      {
        path: 'remove-watermark',
        name: 'PortalImageRemoveWatermark',
        component: () => import('@/views/toolbox/image/remove-watermark/index.vue'),
        meta: { title: '图片去水印', isHide: true, activePath: '/image', keepAlive: true }
      }
    ]
  },
  // ========== 视频工具 ==========
  {
    path: '/video',
    name: 'PortalVideo',
    component: () => import('@/views/index/index.vue'),
    redirect: '/video/index',
    meta: {
      title: '视频工具',
      icon: 'ri:video-fill',
      isFirstLevel: true
    },
    children: [
      {
        path: 'index',
        name: 'PortalVideoIndex',
        component: () => import('@/views/toolbox/category/index.vue'),
        meta: {
          title: '视频工具',
          icon: 'ri:video-fill',
          category: 'video',
          isHide: true,
          activePath: '/video',
          keepAlive: true
        }
      },
      {
        path: 'screen-record',
        name: 'PortalVideoScreenRecord',
        component: () => import('@/views/toolbox/video/screen-record/index.vue'),
        meta: { title: '在线录屏', isHide: true, activePath: '/video', keepAlive: true }
      },
      {
        path: 'video-to-gif',
        name: 'PortalVideoToGif',
        component: () => import('@/views/toolbox/video/video-to-gif/index.vue'),
        meta: { title: '视频转GIF', isHide: true, activePath: '/video', keepAlive: true }
      }
    ]
  },
  // ========== PDF工具 ==========
  {
    path: '/pdf',
    name: 'PortalPdf',
    component: () => import('@/views/index/index.vue'),
    redirect: '/pdf/index',
    meta: {
      title: 'PDF工具',
      icon: 'ri:file-pdf-2-fill',
      isFirstLevel: true
    },
    children: [
      {
        path: 'index',
        name: 'PortalPdfIndex',
        component: () => import('@/views/toolbox/category/index.vue'),
        meta: {
          title: 'PDF工具',
          icon: 'ri:file-pdf-2-fill',
          category: 'pdf',
          isHide: true,
          activePath: '/pdf',
          keepAlive: true
        }
      },
      // ========== 基础操作 ==========
      {
        path: 'merge',
        name: 'PortalPdfMerge',
        component: () => import('@/views/toolbox/pdf/merge/index.vue'),
        meta: { title: 'PDF合并', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'split',
        name: 'PortalPdfSplit',
        component: () => import('@/views/toolbox/pdf/split/index.vue'),
        meta: { title: 'PDF拆分', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'compress',
        name: 'PortalPdfCompress',
        component: () => import('@/views/toolbox/pdf/compress/index.vue'),
        meta: { title: 'PDF压缩', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'extract',
        name: 'PortalPdfExtract',
        component: () => import('@/views/toolbox/pdf/extract/index.vue'),
        meta: { title: '页面提取', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'delete',
        name: 'PortalPdfDelete',
        component: () => import('@/views/toolbox/pdf/delete/index.vue'),
        meta: { title: '页面删除', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'rotate',
        name: 'PortalPdfRotate',
        component: () => import('@/views/toolbox/pdf/rotate/index.vue'),
        meta: { title: '页面旋转', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'reorder',
        name: 'PortalPdfReorder',
        component: () => import('@/views/toolbox/pdf/reorder/index.vue'),
        meta: { title: '页面重排', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'watermark',
        name: 'PortalPdfWatermark',
        component: () => import('@/views/toolbox/pdf/watermark/index.vue'),
        meta: { title: 'PDF水印', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'encrypt',
        name: 'PortalPdfEncrypt',
        component: () => import('@/views/toolbox/pdf/encrypt/index.vue'),
        meta: { title: 'PDF加解密', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      // ========== 格式转换 ==========
      {
        path: 'image-to-pdf',
        name: 'PortalPdfImageToPdf',
        component: () => import('@/views/toolbox/pdf/image-to-pdf/index.vue'),
        meta: { title: '图片转PDF', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'pdf-to-image',
        name: 'PortalPdfToImage',
        component: () => import('@/views/toolbox/pdf/pdf-to-image/index.vue'),
        meta: { title: 'PDF转图片', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'word-to-pdf',
        name: 'PortalPdfWordToPdf',
        component: () => import('@/views/toolbox/pdf/word-to-pdf/index.vue'),
        meta: { title: 'Word转PDF', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'pdf-to-word',
        name: 'PortalPdfToWord',
        component: () => import('@/views/toolbox/pdf/pdf-to-word/index.vue'),
        meta: { title: 'PDF转Word', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'ppt-to-pdf',
        name: 'PortalPdfPptToPdf',
        component: () => import('@/views/toolbox/pdf/ppt-to-pdf/index.vue'),
        meta: { title: 'PPT转PDF', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'pdf-to-ppt',
        name: 'PortalPdfToPpt',
        component: () => import('@/views/toolbox/pdf/pdf-to-ppt/index.vue'),
        meta: { title: 'PDF转PPT', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'excel-to-pdf',
        name: 'PortalPdfExcelToPdf',
        component: () => import('@/views/toolbox/pdf/excel-to-pdf/index.vue'),
        meta: { title: 'Excel转PDF', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'pdf-to-excel',
        name: 'PortalPdfToExcel',
        component: () => import('@/views/toolbox/pdf/pdf-to-excel/index.vue'),
        meta: { title: 'PDF转Excel', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'html-to-pdf',
        name: 'PortalPdfHtmlToPdf',
        component: () => import('@/views/toolbox/pdf/html-to-pdf/index.vue'),
        meta: { title: 'HTML转PDF', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'pdf-to-pdfa',
        name: 'PortalPdfToPdfa',
        component: () => import('@/views/toolbox/pdf/pdf-to-pdfa/index.vue'),
        meta: { title: 'PDF转PDF/A', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      // ========== 高级编辑 ==========
      {
        path: 'page-number',
        name: 'PortalPdfPageNumber',
        component: () => import('@/views/toolbox/pdf/page-number/index.vue'),
        meta: { title: '添加页码', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'crop',
        name: 'PortalPdfCrop',
        component: () => import('@/views/toolbox/pdf/crop/index.vue'),
        meta: { title: '裁剪PDF', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'edit',
        name: 'PortalPdfEdit',
        component: () => import('@/views/toolbox/pdf/edit/index.vue'),
        meta: { title: 'PDF编辑', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'repair',
        name: 'PortalPdfRepair',
        component: () => import('@/views/toolbox/pdf/repair/index.vue'),
        meta: { title: 'PDF修复', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'ocr',
        name: 'PortalPdfOcr',
        component: () => import('@/views/toolbox/pdf/ocr/index.vue'),
        meta: { title: 'OCR文字识别', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      // ========== 安全功能 ==========
      {
        path: 'signature',
        name: 'PortalPdfSignature',
        component: () => import('@/views/toolbox/pdf/signature/index.vue'),
        meta: { title: 'PDF签名', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'redact',
        name: 'PortalPdfRedact',
        component: () => import('@/views/toolbox/pdf/redact/index.vue'),
        meta: { title: 'PDF密文标记', isHide: true, activePath: '/pdf', keepAlive: true }
      },
      {
        path: 'compare',
        name: 'PortalPdfCompare',
        component: () => import('@/views/toolbox/pdf/compare/index.vue'),
        meta: { title: 'PDF比较', isHide: true, activePath: '/pdf', keepAlive: true }
      }
    ]
  },
  // ========== 文档工具 ==========
  {
    path: '/document',
    name: 'PortalDocument',
    component: () => import('@/views/index/index.vue'),
    redirect: '/document/index',
    meta: {
      title: '文档工具',
      icon: 'ri:file-text-fill',
      isFirstLevel: true
    },
    children: [
      {
        path: 'index',
        name: 'PortalDocumentIndex',
        component: () => import('@/views/toolbox/category/index.vue'),
        meta: {
          title: '文档工具',
          icon: 'ri:file-text-fill',
          category: 'document',
          isHide: true,
          activePath: '/document',
          keepAlive: true
        }
      }
    ]
  },
  // ========== 实用工具 ==========
  {
    path: '/utils',
    name: 'PortalUtils',
    component: () => import('@/views/index/index.vue'),
    redirect: '/utils/index',
    meta: {
      title: '实用工具',
      icon: 'ri:tools-fill',
      isFirstLevel: true
    },
    children: [
      {
        path: 'index',
        name: 'PortalUtilsIndex',
        component: () => import('@/views/toolbox/category/index.vue'),
        meta: {
          title: '实用工具',
          icon: 'ri:tools-fill',
          category: 'utils',
          isHide: true,
          activePath: '/utils',
          keepAlive: true
        }
      },
      {
        path: 'qrcode',
        name: 'PortalUtilsQrcode',
        component: () => import('@/views/toolbox/utils/qrcode/index.vue'),
        meta: { title: '二维码生成', isHide: true, activePath: '/utils', keepAlive: true }
      },
      {
        path: 'base64',
        name: 'PortalUtilsBase64',
        component: () => import('@/views/toolbox/utils/base64/index.vue'),
        meta: { title: 'Base64转换', isHide: true, activePath: '/utils', keepAlive: true }
      },
      {
        path: 'video-extractor',
        name: 'PortalUtilsVideoExtractor',
        component: () => import('@/views/toolbox/utils/video-extractor/index.vue'),
        meta: { title: '视频万能提取', isHide: true, activePath: '/utils', keepAlive: true }
      }
    ]
  }
]
