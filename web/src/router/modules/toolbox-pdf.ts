import { AppRouteRecord } from '@/types/router'

/**
 * PDF转换工具路由配置（后台管理）
 * 一级菜单使用 /index/index 布局
 * 设置 isFirstLevel: true 使其作为独立菜单项显示（不展开子菜单）
 */
export const toolboxPdfRoutes: AppRouteRecord = {
  name: 'ToolboxPdf',
  path: '/admin/toolbox-pdf',
  component: '/index/index',
  redirect: '/admin/toolbox-pdf/index',
  meta: {
    title: 'menus.toolbox.pdf.title',
    icon: 'ri:file-pdf-2-line',
    isFirstLevel: true
  },
  children: [
    // 分类首页
    {
      path: 'index',
      name: 'ToolboxPdfIndex',
      component: '/toolbox/category/index',
      meta: {
        title: 'menus.toolbox.pdf.title',
        icon: 'ri:file-pdf-2-line',
        category: 'pdf',
        isHide: true
      }
    },
    // ========== 基础操作 ==========
    // PDF合并
    {
      path: 'merge',
      name: 'PdfMerge',
      component: '/toolbox/pdf/merge/index',
      meta: {
        title: 'menus.toolbox.pdf.merge',
        icon: 'ri:merge-cells-horizontal',
        isHide: true
      }
    },
    // PDF拆分
    {
      path: 'split',
      name: 'PdfSplit',
      component: '/toolbox/pdf/split/index',
      meta: {
        title: 'menus.toolbox.pdf.split',
        icon: 'ri:scissors-cut-line',
        isHide: true
      }
    },
    // PDF压缩
    {
      path: 'compress',
      name: 'PdfCompress',
      component: '/toolbox/pdf/compress/index',
      meta: {
        title: 'menus.toolbox.pdf.compress',
        icon: 'ri:file-reduce-line',
        isHide: true
      }
    },
    // 页面提取
    {
      path: 'extract',
      name: 'PdfExtract',
      component: '/toolbox/pdf/extract/index',
      meta: {
        title: 'menus.toolbox.pdf.extract',
        icon: 'ri:file-copy-line',
        isHide: true
      }
    },
    // 页面删除
    {
      path: 'delete',
      name: 'PdfDelete',
      component: '/toolbox/pdf/delete/index',
      meta: {
        title: 'menus.toolbox.pdf.delete',
        icon: 'ri:delete-bin-line',
        isHide: true
      }
    },
    // 页面旋转
    {
      path: 'rotate',
      name: 'PdfRotate',
      component: '/toolbox/pdf/rotate/index',
      meta: {
        title: 'menus.toolbox.pdf.rotate',
        icon: 'ri:refresh-line',
        isHide: true
      }
    },
    // 页面重排
    {
      path: 'reorder',
      name: 'PdfReorder',
      component: '/toolbox/pdf/reorder/index',
      meta: {
        title: 'menus.toolbox.pdf.reorder',
        icon: 'ri:sort-asc',
        isHide: true
      }
    },
    // PDF水印
    {
      path: 'watermark',
      name: 'PdfWatermark',
      component: '/toolbox/pdf/watermark/index',
      meta: {
        title: 'menus.toolbox.pdf.watermark',
        icon: 'ri:drop-line',
        isHide: true
      }
    },
    // PDF加密
    {
      path: 'encrypt',
      name: 'PdfEncrypt',
      component: '/toolbox/pdf/encrypt/index',
      meta: {
        title: 'menus.toolbox.pdf.encrypt',
        icon: 'ri:lock-line',
        isHide: true
      }
    },
    // ========== 格式转换 ==========
    // 图片转PDF
    {
      path: 'image-to-pdf',
      name: 'PdfImageToPdf',
      component: '/toolbox/pdf/image-to-pdf/index',
      meta: {
        title: 'menus.toolbox.pdf.imageToPdf',
        icon: 'ri:image-add-line',
        isHide: true
      }
    },
    // PDF转图片
    {
      path: 'pdf-to-image',
      name: 'PdfToImage',
      component: '/toolbox/pdf/pdf-to-image/index',
      meta: {
        title: 'menus.toolbox.pdf.pdfToImage',
        icon: 'ri:image-line',
        isHide: true
      }
    },
    // Word转PDF
    {
      path: 'word-to-pdf',
      name: 'PdfWordToPdf',
      component: '/toolbox/pdf/word-to-pdf/index',
      meta: {
        title: 'menus.toolbox.pdf.wordToPdf',
        icon: 'ri:file-word-line',
        isHide: true
      }
    },
    // PDF转Word
    {
      path: 'pdf-to-word',
      name: 'PdfToWord',
      component: '/toolbox/pdf/pdf-to-word/index',
      meta: {
        title: 'menus.toolbox.pdf.pdfToWord',
        icon: 'ri:file-word-2-line',
        isHide: true
      }
    },
    // PPT转PDF
    {
      path: 'ppt-to-pdf',
      name: 'PdfPptToPdf',
      component: '/toolbox/pdf/ppt-to-pdf/index',
      meta: {
        title: 'menus.toolbox.pdf.pptToPdf',
        icon: 'ri:file-ppt-line',
        isHide: true
      }
    },
    // PDF转PPT
    {
      path: 'pdf-to-ppt',
      name: 'PdfToPpt',
      component: '/toolbox/pdf/pdf-to-ppt/index',
      meta: {
        title: 'menus.toolbox.pdf.pdfToPpt',
        icon: 'ri:file-ppt-2-line',
        isHide: true
      }
    },
    // Excel转PDF
    {
      path: 'excel-to-pdf',
      name: 'PdfExcelToPdf',
      component: '/toolbox/pdf/excel-to-pdf/index',
      meta: {
        title: 'menus.toolbox.pdf.excelToPdf',
        icon: 'ri:file-excel-line',
        isHide: true
      }
    },
    // PDF转Excel
    {
      path: 'pdf-to-excel',
      name: 'PdfToExcel',
      component: '/toolbox/pdf/pdf-to-excel/index',
      meta: {
        title: 'menus.toolbox.pdf.pdfToExcel',
        icon: 'ri:file-excel-2-line',
        isHide: true
      }
    },
    // HTML转PDF
    {
      path: 'html-to-pdf',
      name: 'PdfHtmlToPdf',
      component: '/toolbox/pdf/html-to-pdf/index',
      meta: {
        title: 'menus.toolbox.pdf.htmlToPdf',
        icon: 'ri:html5-line',
        isHide: true
      }
    },
    // PDF转PDF/A
    {
      path: 'pdf-to-pdfa',
      name: 'PdfToPdfa',
      component: '/toolbox/pdf/pdf-to-pdfa/index',
      meta: {
        title: 'menus.toolbox.pdf.pdfToPdfa',
        icon: 'ri:archive-line',
        isHide: true
      }
    },
    // ========== 高级编辑 ==========
    // 添加页码
    {
      path: 'page-number',
      name: 'PdfPageNumber',
      component: '/toolbox/pdf/page-number/index',
      meta: {
        title: 'menus.toolbox.pdf.pageNumber',
        icon: 'ri:hashtag',
        isHide: true
      }
    },
    // 裁剪PDF
    {
      path: 'crop',
      name: 'PdfCrop',
      component: '/toolbox/pdf/crop/index',
      meta: {
        title: 'menus.toolbox.pdf.crop',
        icon: 'ri:crop-line',
        isHide: true
      }
    },
    // PDF编辑
    {
      path: 'edit',
      name: 'PdfEdit',
      component: '/toolbox/pdf/edit/index',
      meta: {
        title: 'menus.toolbox.pdf.edit',
        icon: 'ri:edit-line',
        isHide: true
      }
    },
    // PDF修复
    {
      path: 'repair',
      name: 'PdfRepair',
      component: '/toolbox/pdf/repair/index',
      meta: {
        title: 'menus.toolbox.pdf.repair',
        icon: 'ri:tools-line',
        isHide: true
      }
    },
    // OCR文字识别
    {
      path: 'ocr',
      name: 'PdfOcr',
      component: '/toolbox/pdf/ocr/index',
      meta: {
        title: 'menus.toolbox.pdf.ocr',
        icon: 'ri:scan-line',
        isHide: true
      }
    },
    // ========== 安全功能 ==========
    // PDF签名
    {
      path: 'signature',
      name: 'PdfSignature',
      component: '/toolbox/pdf/signature/index',
      meta: {
        title: 'menus.toolbox.pdf.signature',
        icon: 'ri:quill-pen-line',
        isHide: true
      }
    },
    // PDF密文标记
    {
      path: 'redact',
      name: 'PdfRedact',
      component: '/toolbox/pdf/redact/index',
      meta: {
        title: 'menus.toolbox.pdf.redact',
        icon: 'ri:eraser-line',
        isHide: true
      }
    },
    // PDF比较
    {
      path: 'compare',
      name: 'PdfCompare',
      component: '/toolbox/pdf/compare/index',
      meta: {
        title: 'menus.toolbox.pdf.compare',
        icon: 'ri:file-copy-2-line',
        isHide: true
      }
    }
  ]
}
