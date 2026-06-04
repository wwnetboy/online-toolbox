/**
 * 游客标识生成模块
 *
 * 使用浏览器指纹技术生成唯一的游客标识
 *
 * ## 主要功能
 *
 * - 基于浏览器特征生成唯一标识
 * - localStorage持久化存储（30天有效期）
 * - 自动续期机制
 *
 * ## 指纹因素
 *
 * - User-Agent
 * - 屏幕分辨率
 * - 时区
 * - 语言设置
 * - Canvas指纹
 * - WebGL指纹
 *
 * @module utils/visitor-id
 * @requirements 1.10
 */

/** 存储键名 */
const VISITOR_ID_KEY = 'toolbox_visitor_id'
const VISITOR_ID_EXPIRY_KEY = 'toolbox_visitor_id_expiry'

/** 有效期（30天，毫秒） */
const EXPIRY_DURATION = 30 * 24 * 60 * 60 * 1000

/**
 * 生成简单的哈希值
 * @param str 输入字符串
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  // 转换为16进制字符串
  return Math.abs(hash).toString(16)
}

/**
 * 获取Canvas指纹
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    canvas.width = 200
    canvas.height = 50

    // 绘制文本
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('Toolbox Fingerprint', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('Toolbox Fingerprint', 4, 17)

    // 绘制图形
    ctx.beginPath()
    ctx.arc(50, 25, 20, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.fill()

    return canvas.toDataURL()
  } catch {
    return ''
  }
}

/**
 * 获取WebGL指纹
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return ''

    const webgl = gl as WebGLRenderingContext
    const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return ''

    const vendor = webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)

    return `${vendor}~${renderer}`
  } catch {
    return ''
  }
}

/**
 * 收集浏览器指纹数据
 */
function collectFingerprint(): string {
  const components: string[] = []

  // User-Agent
  components.push(navigator.userAgent)

  // 屏幕分辨率
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`)

  // 时区
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone)

  // 语言设置
  components.push(navigator.language)
  components.push((navigator.languages || []).join(','))

  // 平台
  components.push(navigator.platform)

  // 硬件并发数
  components.push(String(navigator.hardwareConcurrency || 0))

  // 设备内存（如果可用）
  const nav = navigator as Navigator & { deviceMemory?: number }
  if (nav.deviceMemory) {
    components.push(String(nav.deviceMemory))
  }

  // Canvas指纹
  const canvasFingerprint = getCanvasFingerprint()
  if (canvasFingerprint) {
    components.push(simpleHash(canvasFingerprint))
  }

  // WebGL指纹
  const webglFingerprint = getWebGLFingerprint()
  if (webglFingerprint) {
    components.push(simpleHash(webglFingerprint))
  }

  // 触摸支持
  components.push(String('ontouchstart' in window))

  // 插件数量
  components.push(String(navigator.plugins?.length || 0))

  // 合并所有组件并生成哈希
  const fingerprint = components.join('|')
  return simpleHash(fingerprint)
}

/**
 * 生成完整的游客ID
 * 结合指纹和随机数，确保唯一性
 */
function generateVisitorId(): string {
  const fingerprint = collectFingerprint()
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)

  return `${fingerprint}-${timestamp}-${random}`
}

/**
 * 检查游客ID是否过期
 */
function isVisitorIdExpired(): boolean {
  const expiry = localStorage.getItem(VISITOR_ID_EXPIRY_KEY)
  if (!expiry) return true

  const expiryTime = parseInt(expiry, 10)
  return Date.now() > expiryTime
}

/**
 * 保存游客ID到localStorage
 * @param visitorId 游客ID
 */
function saveVisitorId(visitorId: string): void {
  const expiryTime = Date.now() + EXPIRY_DURATION
  localStorage.setItem(VISITOR_ID_KEY, visitorId)
  localStorage.setItem(VISITOR_ID_EXPIRY_KEY, String(expiryTime))
}

/**
 * 续期游客ID
 */
function renewVisitorId(): void {
  const visitorId = localStorage.getItem(VISITOR_ID_KEY)
  if (visitorId) {
    saveVisitorId(visitorId)
  }
}

/**
 * 获取游客ID
 * 如果不存在或已过期，则生成新的ID
 * @returns 游客ID
 * @requirements 1.10
 */
export function getVisitorId(): string {
  // 检查是否已有有效的游客ID
  const existingId = localStorage.getItem(VISITOR_ID_KEY)

  if (existingId && !isVisitorIdExpired()) {
    // 每次访问时续期
    renewVisitorId()
    return existingId
  }

  // 生成新的游客ID
  const newId = generateVisitorId()
  saveVisitorId(newId)

  return newId
}

/**
 * 清除游客ID
 * 用于测试或用户主动清除
 */
export function clearVisitorId(): void {
  localStorage.removeItem(VISITOR_ID_KEY)
  localStorage.removeItem(VISITOR_ID_EXPIRY_KEY)
}

/**
 * 检查是否有有效的游客ID
 */
export function hasValidVisitorId(): boolean {
  const existingId = localStorage.getItem(VISITOR_ID_KEY)
  return !!existingId && !isVisitorIdExpired()
}

/**
 * 获取游客ID的过期时间
 * @returns 过期时间戳，如果不存在则返回null
 */
export function getVisitorIdExpiry(): number | null {
  const expiry = localStorage.getItem(VISITOR_ID_EXPIRY_KEY)
  return expiry ? parseInt(expiry, 10) : null
}

export default {
  getVisitorId,
  clearVisitorId,
  hasValidVisitorId,
  getVisitorIdExpiry
}
