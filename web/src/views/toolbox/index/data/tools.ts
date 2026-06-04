import type { Tool } from '../types'

/**
 * 所有工具数据配置
 */
export const toolsData: Tool[] = [
  // ========== 图片工具 ==========
  {
    id: 'image-compress',
    name: '图片压缩',
    description: '压缩图片文件大小，支持JPG、PNG、WEBP等格式',
    icon: 'ri:file-reduce-line',
    route: '/toolbox-image/compress',
    category: 'image',
    keywords: ['压缩', '图片', '减小', '优化'],
    badge: 'hot',
    color: '#ff6b6b'
  },
  {
    id: 'image-convert',
    name: '格式转换',
    description: '转换图片格式（JPG/PNG/WEBP/GIF等）',
    icon: 'ri:exchange-line',
    route: '/toolbox-image/convert',
    category: 'image',
    keywords: ['转换', '图片', '格式', 'JPG', 'PNG'],
    color: '#4ecdc4'
  },
  {
    id: 'image-crop',
    name: '图片裁剪',
    description: '裁剪图片到指定尺寸，支持证件照裁剪',
    icon: 'ri:crop-line',
    route: '/toolbox-image/crop',
    category: 'image',
    keywords: ['裁剪', '图片', '尺寸', '证件照'],
    color: '#95e1d3'
  },
  {
    id: 'image-rotate',
    name: '图片旋转',
    description: '旋转或翻转图片，支持90度、180度旋转',
    icon: 'ri:anticlockwise-line',
    route: '/toolbox-image/rotate',
    category: 'image',
    keywords: ['旋转', '图片', '翻转', '方向'],
    color: '#f38181'
  },
  {
    id: 'image-resize',
    name: '尺寸调整',
    description: '调整图片宽度和高度，支持等比缩放',
    icon: 'ri:aspect-ratio-line',
    route: '/toolbox-image/resize',
    category: 'image',
    keywords: ['调整', '图片', '尺寸', '缩放'],
    color: '#aa96da'
  },
  {
    id: 'image-splice',
    name: '长图拼接',
    description: '将多张图片拼接成长图，适合截图拼接',
    icon: 'ri:layout-row-line',
    route: '/toolbox-image/splice',
    category: 'image',
    keywords: ['拼接', '图片', '长图', '截图'],
    color: '#fcbad3'
  },
  {
    id: 'image-watermark',
    name: '图片水印',
    description: '为图片添加文字或图片水印，保护版权',
    icon: 'ri:drop-line',
    route: '/toolbox-image/watermark',
    category: 'image',
    keywords: ['水印', '图片', '保护', '版权'],
    color: '#5c9eff'
  },

  // ========== PDF转换工具 ==========
  {
    id: 'pdf-merge',
    name: 'PDF合并',
    description: '将多个PDF文件合并为一个文件',
    icon: 'ri:merge-cells-horizontal',
    route: '/toolbox-pdf/merge',
    category: 'pdf',
    keywords: ['合并', 'PDF', '拼接', '组合'],
    color: '#e74c3c'
  },
  {
    id: 'pdf-split',
    name: 'PDF拆分',
    description: '将PDF文件拆分成多个部分',
    icon: 'ri:scissors-cut-line',
    route: '/toolbox-pdf/split',
    category: 'pdf',
    keywords: ['拆分', 'PDF', '分割', '提取'],
    color: '#3498db'
  },
  {
    id: 'pdf-compress',
    name: 'PDF压缩',
    description: '压缩PDF文件大小，方便传输和存储',
    icon: 'ri:file-reduce-line',
    route: '/toolbox-pdf/compress',
    category: 'pdf',
    keywords: ['压缩', 'PDF', '减小', '优化'],
    badge: 'hot',
    color: '#2ecc71'
  },
  {
    id: 'pdf-extract',
    name: '页面提取',
    description: '从PDF中提取指定页面',
    icon: 'ri:file-copy-line',
    route: '/toolbox-pdf/extract',
    category: 'pdf',
    keywords: ['提取', 'PDF', '页面', '选择'],
    color: '#f39c12'
  },
  {
    id: 'pdf-delete',
    name: '页面删除',
    description: '删除PDF中不需要的页面',
    icon: 'ri:delete-bin-line',
    route: '/toolbox-pdf/delete',
    category: 'pdf',
    keywords: ['删除', 'PDF', '页面', '移除'],
    color: '#e67e22'
  },
  {
    id: 'pdf-rotate',
    name: '页面旋转',
    description: '旋转PDF页面方向',
    icon: 'ri:refresh-line',
    route: '/toolbox-pdf/rotate',
    category: 'pdf',
    keywords: ['旋转', 'PDF', '页面', '方向'],
    color: '#16a085'
  },
  {
    id: 'pdf-reorder',
    name: '页面重排',
    description: '调整PDF页面顺序',
    icon: 'ri:sort-asc',
    route: '/toolbox-pdf/reorder',
    category: 'pdf',
    keywords: ['重排', 'PDF', '页面', '顺序'],
    color: '#27ae60'
  },
  {
    id: 'pdf-watermark',
    name: 'PDF水印',
    description: '为PDF添加文字或图片水印',
    icon: 'ri:drop-line',
    route: '/toolbox-pdf/watermark',
    category: 'pdf',
    keywords: ['水印', 'PDF', '保护', '版权'],
    color: '#2980b9'
  },
  {
    id: 'pdf-encrypt',
    name: 'PDF加解密',
    description: '为PDF设置密码保护或移除密码',
    icon: 'ri:lock-line',
    route: '/toolbox-pdf/encrypt',
    category: 'pdf',
    keywords: ['加密', '解密', 'PDF', '密码', '保护', '解锁'],
    color: '#8e44ad'
  },

  // ========== 文档转换工具 ==========
  {
    id: 'pdf-image-to-pdf',
    name: '图片转PDF',
    description: '将多张图片合并转换为PDF文档',
    icon: 'ri:gallery-fill',
    route: '/toolbox-pdf/image-to-pdf',
    category: 'document',
    keywords: ['图片', 'PDF', '转换', '合并'],
    color: '#9b59b6'
  },
  {
    id: 'pdf-to-image',
    name: 'PDF转图片',
    description: '将PDF页面转换为JPG/PNG图片',
    icon: 'ri:image-2-fill',
    route: '/toolbox-pdf/pdf-to-image',
    category: 'document',
    keywords: ['PDF', '图片', '转换', 'JPG', 'PNG'],
    color: '#1abc9c'
  },
  {
    id: 'word-to-pdf',
    name: 'Word转PDF',
    description: '将Word文档转换为PDF格式',
    icon: 'ri:file-word-2-fill',
    route: '/toolbox-pdf/word-to-pdf',
    category: 'document',
    keywords: ['Word', 'PDF', '转换', '文档'],
    color: '#2b5797'
  },
  {
    id: 'pdf-to-word',
    name: 'PDF转Word',
    description: '将PDF文档转换为可编辑的Word格式',
    icon: 'ri:file-word-fill',
    route: '/toolbox-pdf/pdf-to-word',
    category: 'document',
    keywords: ['PDF', 'Word', '转换', '编辑'],
    color: '#2b5797'
  },
  {
    id: 'ppt-to-pdf',
    name: 'PPT转PDF',
    description: '将PowerPoint演示文稿转换为PDF格式',
    icon: 'ri:file-ppt-2-fill',
    route: '/toolbox-pdf/ppt-to-pdf',
    category: 'document',
    keywords: ['PPT', 'PDF', '转换', '演示文稿'],
    color: '#d24726'
  },
  {
    id: 'pdf-to-ppt',
    name: 'PDF转PPT',
    description: '将PDF文档转换为PowerPoint格式',
    icon: 'ri:file-ppt-fill',
    route: '/toolbox-pdf/pdf-to-ppt',
    category: 'document',
    keywords: ['PDF', 'PPT', '转换', '演示文稿'],
    color: '#d24726'
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel转PDF',
    description: '将Excel电子表格转换为PDF格式',
    icon: 'ri:file-excel-2-fill',
    route: '/toolbox-pdf/excel-to-pdf',
    category: 'document',
    keywords: ['Excel', 'PDF', '转换', '表格'],
    color: '#217346'
  },
  {
    id: 'pdf-to-excel',
    name: 'PDF转Excel',
    description: '从PDF中提取表格数据到Excel',
    icon: 'ri:file-excel-fill',
    route: '/toolbox-pdf/pdf-to-excel',
    category: 'document',
    keywords: ['PDF', 'Excel', '转换', '表格', '提取'],
    color: '#217346'
  },
  {
    id: 'html-to-pdf',
    name: 'HTML转PDF',
    description: '将网页或HTML内容转换为PDF文档',
    icon: 'ri:html5-fill',
    route: '/toolbox-pdf/html-to-pdf',
    category: 'document',
    keywords: ['HTML', 'PDF', '转换', '网页'],
    color: '#e34c26'
  },
  {
    id: 'pdf-to-pdfa',
    name: 'PDF转PDF/A',
    description: '将PDF转换为长期归档格式PDF/A',
    icon: 'ri:archive-drawer-fill',
    route: '/toolbox-pdf/pdf-to-pdfa',
    category: 'document',
    keywords: ['PDF', 'PDF/A', '转换', '归档'],
    color: '#607d8b'
  },

  // ========== PDF高级编辑 ==========
  {
    id: 'pdf-page-number',
    name: '添加页码',
    description: '为PDF文档添加页码，支持多种格式',
    icon: 'ri:list-ordered-2',
    route: '/toolbox-pdf/page-number',
    category: 'pdf',
    keywords: ['页码', 'PDF', '添加', '编号'],
    color: '#795548'
  },
  {
    id: 'pdf-crop',
    name: '裁剪PDF',
    description: '裁剪PDF页面，移除不需要的边距',
    icon: 'ri:crop-2-fill',
    route: '/toolbox-pdf/crop',
    category: 'pdf',
    keywords: ['裁剪', 'PDF', '边距', '页面'],
    color: '#ff9800'
  },
  {
    id: 'pdf-edit',
    name: 'PDF编辑',
    description: '直接编辑PDF内容，添加文字、图片和批注',
    icon: 'ri:edit-2-fill',
    route: '/toolbox-pdf/edit',
    category: 'pdf',
    keywords: ['编辑', 'PDF', '文字', '图片', '批注'],
    color: '#673ab7'
  },
  {
    id: 'pdf-repair',
    name: 'PDF修复',
    description: '修复损坏的PDF文件，恢复文档内容',
    icon: 'ri:hammer-fill',
    route: '/toolbox-pdf/repair',
    category: 'pdf',
    keywords: ['修复', 'PDF', '损坏', '恢复'],
    color: '#009688'
  },
  {
    id: 'pdf-ocr',
    name: 'OCR文字识别',
    description: '识别扫描版PDF中的文字，生成可搜索PDF',
    icon: 'ri:scan-2-fill',
    route: '/toolbox-pdf/ocr',
    category: 'pdf',
    keywords: ['OCR', 'PDF', '文字识别', '扫描'],
    color: '#00bcd4'
  },

  // ========== PDF安全功能 ==========
  {
    id: 'pdf-signature',
    name: 'PDF签名',
    description: '为PDF添加电子签名，支持手写和图片签名',
    icon: 'ri:pen-nib-fill',
    route: '/toolbox-pdf/signature',
    category: 'pdf',
    keywords: ['签名', 'PDF', '电子签名', '手写'],
    color: '#3f51b5'
  },
  {
    id: 'pdf-redact',
    name: 'PDF密文标记',
    description: '永久移除PDF中的敏感信息',
    icon: 'ri:eye-off-fill',
    route: '/toolbox-pdf/redact',
    category: 'pdf',
    keywords: ['密文', 'PDF', '敏感信息', '移除'],
    color: '#f44336'
  },
  {
    id: 'pdf-compare',
    name: 'PDF比较',
    description: '比较两个PDF文档，高亮显示差异',
    icon: 'ri:git-merge-fill',
    route: '/toolbox-pdf/compare',
    category: 'pdf',
    keywords: ['比较', 'PDF', '差异', '对比'],
    color: '#ff5722'
  },

  // ========== 实用工具 ==========
  {
    id: 'utils-qrcode',
    name: '二维码生成',
    description: '生成各种内容的二维码，支持自定义样式和Logo',
    icon: 'ri:qr-code-line',
    route: '/toolbox-utils/qrcode',
    category: 'utils',
    keywords: ['二维码', 'QR', '生成', '链接', '扫码'],
    badge: 'new',
    color: '#1abc9c'
  },
  {
    id: 'utils-base64',
    name: 'Base64转换',
    description: '图片与Base64编码互相转换，方便开发使用',
    icon: 'ri:code-s-slash-line',
    route: '/toolbox-utils/base64',
    category: 'utils',
    keywords: ['Base64', '编码', '解码', '图片', '转换'],
    color: '#34495e'
  },
  {
    id: 'utils-video-extractor',
    name: '视频万能提取',
    description: '支持1000+网站的视频下载和音频提取，基于yt-dlp引擎',
    icon: 'ri:video-download-line',
    route: '/toolbox-utils/video-extractor',
    category: 'utils',
    keywords: ['视频', '下载', '提取', '音频', 'yt-dlp', '解析'],
    badge: 'new',
    color: '#e74c3c'
  },

  // ========== 视频工具 ==========
  {
    id: 'video-screen-record',
    name: '在线录屏',
    description: '在浏览器中直接录制屏幕，快速制作演示视频',
    icon: 'ri:record-circle-line',
    route: '/toolbox-video/screen-record',
    category: 'video',
    keywords: ['录屏', '屏幕录制', '视频', '演示', '教程'],
    badge: 'new',
    color: '#e74c3c'
  },
  {
    id: 'video-to-gif',
    name: '视频转GIF',
    description: '将视频片段转换为GIF动图',
    icon: 'ri:file-gif-line',
    route: '/toolbox-video/video-to-gif',
    category: 'video',
    keywords: ['视频', 'GIF', '动图', '转换', '动画'],
    badge: 'new',
    color: '#9b59b6'
  },

  // 注意：以下工具暂未实现，已注释
  // ========== 文本工具 ==========
  // ========== 开发工具 ==========
]
