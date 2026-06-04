/**
 * 访问追踪服务模块
 *
 * 提供页面访问和点击事件的追踪功能，将数据发送到后端存储到 MySQL
 *
 * @module services/stats/visit-tracker
 */

const VISITOR_ID_KEY = 'toolbox_visitor_id'

/**
 * 生成唯一访客 ID
 */
function generateVisitorId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart}`
}

/**
 * 获取或创建访客 ID
 * 使用 localStorage 持久化，确保同一浏览器的访客 ID 一致
 */
function getVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY)
  if (!visitorId) {
    visitorId = generateVisitorId()
    localStorage.setItem(VISITOR_ID_KEY, visitorId)
  }
  return visitorId
}

/**
 * 记录页面访问
 * 调用后端 API 将访问数据存储到 MySQL
 *
 * @param pagePath - 页面路径
 */
export async function recordVisit(pagePath: string): Promise<void> {
  try {
    const visitorId = getVisitorId()
    const { default: request } = await import('@/utils/http')

    await request.post({
      url: '/stats/visit',
      data: {
        visitorId,
        pagePath
      }
    })
  } catch (error) {
    // 静默失败，不影响用户体验
    console.debug('Failed to record visit:', error)
  }
}

/**
 * 记录点击事件
 * 调用后端 API 将点击数据存储到 MySQL
 *
 * @param elementId - 元素 ID
 * @param pagePath - 页面路径
 */
export async function recordClick(elementId: string, pagePath: string): Promise<void> {
  try {
    const visitorId = getVisitorId()
    const { default: request } = await import('@/utils/http')

    await request.post({
      url: '/stats/click',
      data: {
        visitorId,
        elementId,
        pagePath
      }
    })
  } catch (error) {
    // 静默失败，不影响用户体验
    console.debug('Failed to record click:', error)
  }
}

/**
 * 访问追踪器类
 * 管理页面访问追踪的生命周期
 */
class VisitTracker {
  private lastPath: string = ''
  private isEnabled: boolean = true

  /**
   * 启用追踪
   */
  enable(): void {
    this.isEnabled = true
  }

  /**
   * 禁用追踪
   */
  disable(): void {
    this.isEnabled = false
  }

  /**
   * 追踪页面访问
   * 避免重复记录同一页面
   *
   * @param path - 页面路径
   */
  trackPageView(path: string): void {
    if (!this.isEnabled) return

    // 避免重复记录同一页面
    if (path === this.lastPath) return

    this.lastPath = path
    recordVisit(path)
  }

  /**
   * 追踪点击事件
   *
   * @param elementId - 元素 ID
   * @param pagePath - 页面路径（可选，默认使用当前路径）
   */
  trackClick(elementId: string, pagePath?: string): void {
    if (!this.isEnabled) return

    const path = pagePath || this.lastPath || window.location.pathname
    recordClick(elementId, path)
  }

  /**
   * 获取当前访客 ID
   */
  getVisitorId(): string {
    return getVisitorId()
  }
}

/**
 * 全局访问追踪器实例
 */
export const visitTracker = new VisitTracker()
