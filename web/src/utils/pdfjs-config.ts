/**
 * PDF.js 配置
 * 使用 pdfjs-dist/webpack 入口，自动配置 worker
 */

// 使用 webpack 入口，它会自动设置 workerPort
import 'pdfjs-dist/webpack.mjs'
import * as pdfjsLib from 'pdfjs-dist'

// 配置 CMap 以支持中文字体
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// 设置 CMap URL 和配置
const CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`
const CMAP_PACKED = true

// 导出配置好的 pdfjsLib 和默认配置
export { pdfjsLib, CMAP_URL, CMAP_PACKED }

// 导出一个辅助函数，用于创建带有 CMap 配置的文档加载选项
export function getDocumentOptions(data: ArrayBuffer | Uint8Array) {
  return {
    data,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    verbosity: 0 // 减少控制台输出
  }
}
