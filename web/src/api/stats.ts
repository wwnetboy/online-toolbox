/**
 * 统计数据 API 服务模块
 *
 * 提供统计数据的获取功能，集成缓存服务
 *
 * ## 主要功能
 *
 * - 获取统计数据（fetchStats）
 * - 获取实时在线访客数（fetchOnlineVisitors）
 * - 集成缓存服务，减少 API 请求
 * - API 失败时返回缓存数据或默认值
 *
 * ## 使用场景
 *
 * - 数据概览页面统计数据展示
 * - 实时在线访客数更新
 *
 * @module api/stats
 * @author Art Design Pro Team
 */

import { StatsCacheService, statsCacheService } from '@/services/stats/stats-cache'
import type { StatItem, StatsData, StatsResponse, StatsTimeRange } from '@/types/stats'

/**
 * 是否使用模拟数据
 * 在没有真实后端 API 时使用模拟数据
 * 测试环境下设置为 false 以便测试 API 逻辑
 */
let USE_MOCK_DATA = false

/**
 * 设置是否使用模拟数据（仅用于测试）
 */
export function setUseMockData(value: boolean): void {
  USE_MOCK_DATA = value
}

/**
 * 获取当前是否使用模拟数据
 */
export function getUseMockData(): boolean {
  return USE_MOCK_DATA
}

/**
 * 缓存键常量
 */
const CACHE_KEYS = {
  STATS: 'stats',
  ONLINE_VISITORS: 'online_visitors'
} as const

/**
 * 默认统计数据项
 * 用于 API 失败时的回退值
 */
const DEFAULT_STAT_ITEM: StatItem = {
  value: 0,
  trend: 0,
  timestamp: Date.now()
}

/**
 * 默认统计数据
 * 用于 API 失败时的回退值
 */
const DEFAULT_STATS: StatsData = {
  totalVisits: { ...DEFAULT_STAT_ITEM },
  uniqueVisitors: { ...DEFAULT_STAT_ITEM },
  onlineVisitors: { ...DEFAULT_STAT_ITEM },
  clickCount: { ...DEFAULT_STAT_ITEM },
  newUsers: { ...DEFAULT_STAT_ITEM }
}

/**
 * 模拟数据基础值
 * 根据时间范围返回不同的基础数据
 */
const MOCK_BASE_DATA: Record<StatsTimeRange, StatsData> = {
  today: {
    totalVisits: { value: 1256, trend: 12, timestamp: Date.now() },
    uniqueVisitors: { value: 892, trend: 8, timestamp: Date.now() },
    onlineVisitors: { value: 156, trend: 15, timestamp: Date.now() },
    clickCount: { value: 3420, trend: -5, timestamp: Date.now() },
    newUsers: { value: 89, trend: 23, timestamp: Date.now() }
  },
  week: {
    totalVisits: { value: 9120, trend: 20, timestamp: Date.now() },
    uniqueVisitors: { value: 5680, trend: 15, timestamp: Date.now() },
    onlineVisitors: { value: 182, trend: 10, timestamp: Date.now() },
    clickCount: { value: 24560, trend: -12, timestamp: Date.now() },
    newUsers: { value: 456, trend: 30, timestamp: Date.now() }
  },
  month: {
    totalVisits: { value: 38920, trend: 18, timestamp: Date.now() },
    uniqueVisitors: { value: 21560, trend: 12, timestamp: Date.now() },
    onlineVisitors: { value: 198, trend: 8, timestamp: Date.now() },
    clickCount: { value: 98760, trend: -8, timestamp: Date.now() },
    newUsers: { value: 1890, trend: 25, timestamp: Date.now() }
  },
  year: {
    totalVisits: { value: 456780, trend: 35, timestamp: Date.now() },
    uniqueVisitors: { value: 189560, trend: 28, timestamp: Date.now() },
    onlineVisitors: { value: 210, trend: 5, timestamp: Date.now() },
    clickCount: { value: 1256890, trend: 15, timestamp: Date.now() },
    newUsers: { value: 23450, trend: 42, timestamp: Date.now() }
  }
}

/**
 * 生成模拟统计数据
 * 在基础数据上添加随机波动
 *
 * @param timeRange - 时间范围
 * @returns 模拟的统计数据
 */
function generateMockStats(timeRange: StatsTimeRange): StatsData {
  const baseData = MOCK_BASE_DATA[timeRange]
  const now = Date.now()

  // 添加 ±5% 的随机波动
  const addVariation = (value: number): number => {
    const variation = value * 0.05 * (Math.random() * 2 - 1)
    return Math.round(value + variation)
  }

  return {
    totalVisits: {
      value: addVariation(baseData.totalVisits.value),
      trend: baseData.totalVisits.trend,
      timestamp: now
    },
    uniqueVisitors: {
      value: addVariation(baseData.uniqueVisitors.value),
      trend: baseData.uniqueVisitors.trend,
      timestamp: now
    },
    onlineVisitors: {
      value: addVariation(baseData.onlineVisitors.value),
      trend: baseData.onlineVisitors.trend,
      timestamp: now
    },
    clickCount: {
      value: addVariation(baseData.clickCount.value),
      trend: baseData.clickCount.trend,
      timestamp: now
    },
    newUsers: {
      value: addVariation(baseData.newUsers.value),
      trend: baseData.newUsers.trend,
      timestamp: now
    }
  }
}

/**
 * 生成模拟在线访客数据
 * 在基础值上添加随机波动
 *
 * @returns 模拟的在线访客数据
 */
function generateMockOnlineVisitors(): StatItem {
  const baseValue = 150 + Math.floor(Math.random() * 100)
  const trend = Math.floor(Math.random() * 30) - 10

  return {
    value: baseValue,
    trend,
    timestamp: Date.now()
  }
}

/**
 * 统计数据 API 服务类
 *
 * 提供统计数据的获取功能，集成缓存服务
 */
export class StatsApiService {
  private cacheService: StatsCacheService

  /**
   * 创建统计 API 服务实例
   *
   * @param cacheService - 缓存服务实例，默认使用全局实例
   */
  constructor(cacheService: StatsCacheService = statsCacheService) {
    this.cacheService = cacheService
  }

  /**
   * 获取统计数据
   *
   * 优先从缓存获取，缓存无效时从 API 获取
   * API 失败时返回缓存数据或默认值
   *
   * @param timeRange - 时间范围
   * @param forceRefresh - 是否强制刷新（跳过缓存）
   * @returns 统计数据
   *
   * @example
   * ```typescript
   * const service = new StatsApiService()
   * const stats = await service.fetchStats('today')
   * ```
   */
  async fetchStats(timeRange: StatsTimeRange, forceRefresh = false): Promise<StatsData> {
    const cacheKey = StatsCacheService.generateKey(CACHE_KEYS.STATS, timeRange)

    // 如果不强制刷新，尝试从缓存获取
    if (!forceRefresh) {
      const cached = this.cacheService.get<StatsData>(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      let validatedData: StatsData

      if (USE_MOCK_DATA) {
        // 使用模拟数据
        validatedData = generateMockStats(timeRange)
      } else {
        // 从 API 获取数据
        const { default: request } = await import('@/utils/http')
        const response = await request.get<StatsResponse>({
          url: '/stats',
          params: { timeRange }
        })
        validatedData = this.validateStatsResponse(response)
      }

      // 缓存数据
      this.cacheService.set(cacheKey, validatedData)

      return validatedData
    } catch (error: unknown) {
      console.error('Failed to fetch stats:', error)
      // API 失败时，尝试返回缓存数据
      const cached = this.cacheService.get<StatsData>(cacheKey)
      if (cached) {
        return cached
      }

      // 无缓存时返回默认值
      return this.getDefaultStats()
    }
  }

  /**
   * 获取实时在线访客数
   *
   * 此接口不使用缓存，始终从 API 获取最新数据
   * API 失败时返回默认值
   *
   * @returns 在线访客数统计项
   *
   * @example
   * ```typescript
   * const service = new StatsApiService()
   * const onlineVisitors = await service.fetchOnlineVisitors()
   * ```
   */
  async fetchOnlineVisitors(): Promise<StatItem> {
    try {
      if (USE_MOCK_DATA) {
        // 使用模拟数据
        return generateMockOnlineVisitors()
      }

      const { default: request } = await import('@/utils/http')
      const response = await request.get<StatItem>({
        url: '/stats/online-visitors'
      })

      // 验证响应数据格式
      return this.validateStatItem(response)
    } catch {
      // API 失败时返回默认值
      return this.getDefaultStatItem()
    }
  }

  /**
   * 失效统计数据缓存
   *
   * @param timeRange - 时间范围，如果不传则失效所有时间范围的缓存
   */
  invalidateCache(timeRange?: StatsTimeRange): void {
    if (timeRange) {
      const cacheKey = StatsCacheService.generateKey(CACHE_KEYS.STATS, timeRange)
      this.cacheService.invalidate(cacheKey)
    } else {
      // 失效所有时间范围的缓存
      const timeRanges: StatsTimeRange[] = ['today', 'week', 'month', 'year']
      timeRanges.forEach((range) => {
        const cacheKey = StatsCacheService.generateKey(CACHE_KEYS.STATS, range)
        this.cacheService.invalidate(cacheKey)
      })
    }
  }

  /**
   * 验证统计响应数据格式
   *
   * 确保每个统计项都包含必要的字段
   *
   * @param response - API 响应数据
   * @returns 验证后的统计数据
   */
  private validateStatsResponse(response: StatsResponse): StatsData {
    const keys: (keyof StatsData)[] = [
      'totalVisits',
      'uniqueVisitors',
      'onlineVisitors',
      'clickCount',
      'newUsers'
    ]

    const result: StatsData = { ...DEFAULT_STATS }

    for (const key of keys) {
      if (response[key]) {
        result[key] = this.validateStatItem(response[key])
      }
    }

    return result
  }

  /**
   * 验证单个统计项数据格式
   *
   * 确保统计项包含 value、trend、timestamp 字段
   * value 必须为非负数，timestamp 必须为有效的 Unix 时间戳
   *
   * @param item - 统计项数据
   * @returns 验证后的统计项
   */
  private validateStatItem(item: StatItem): StatItem {
    const now = Date.now()

    return {
      value: typeof item.value === 'number' && item.value >= 0 ? item.value : 0,
      trend: typeof item.trend === 'number' ? item.trend : 0,
      timestamp: typeof item.timestamp === 'number' && item.timestamp > 0 ? item.timestamp : now
    }
  }

  /**
   * 获取默认统计数据
   *
   * @returns 默认统计数据，所有值为 0
   */
  private getDefaultStats(): StatsData {
    const now = Date.now()
    return {
      totalVisits: { value: 0, trend: 0, timestamp: now },
      uniqueVisitors: { value: 0, trend: 0, timestamp: now },
      onlineVisitors: { value: 0, trend: 0, timestamp: now },
      clickCount: { value: 0, trend: 0, timestamp: now },
      newUsers: { value: 0, trend: 0, timestamp: now }
    }
  }

  /**
   * 获取默认统计项
   *
   * @returns 默认统计项，值为 0
   */
  private getDefaultStatItem(): StatItem {
    return {
      value: 0,
      trend: 0,
      timestamp: Date.now()
    }
  }
}

/**
 * 默认统计 API 服务实例
 */
export const statsApiService = new StatsApiService()

/**
 * 获取统计数据
 *
 * 便捷函数，使用默认服务实例
 *
 * @param timeRange - 时间范围
 * @param forceRefresh - 是否强制刷新
 * @returns 统计数据
 */
export function fetchStats(timeRange: StatsTimeRange, forceRefresh = false): Promise<StatsData> {
  return statsApiService.fetchStats(timeRange, forceRefresh)
}

/**
 * 获取实时在线访客数
 *
 * 便捷函数，使用默认服务实例
 *
 * @returns 在线访客数统计项
 */
export function fetchOnlineVisitors(): Promise<StatItem> {
  return statsApiService.fetchOnlineVisitors()
}

/**
 * 获取年度月度访问趋势
 *
 * @returns 月度访问数据和增长率
 */
export async function fetchVisitTrend(): Promise<{
  data: number[]
  xAxisData: string[]
  totalThisYear: number
  growth: number
}> {
  const { default: request } = await import('@/utils/http')
  return request.get<{
    data: number[]
    xAxisData: string[]
    totalThisYear: number
    growth: number
  }>({ url: '/stats/visit-trend' })
}

/**
 * 获取用户概述数据
 *
 * @returns 用户概述统计和图表数据
 */
export async function fetchUserOverview(): Promise<{
  chartData: number[]
  xAxisLabels: string[]
  totalUsers: number
  totalVisits: number
  dailyVisits: number
  weekTrend: number
}> {
  const { default: request } = await import('@/utils/http')
  return request.get<{
    chartData: number[]
    xAxisLabels: string[]
    totalUsers: number
    totalVisits: number
    dailyVisits: number
    weekTrend: number
  }>({ url: '/stats/user-overview' })
}

// 导出类型和常量供测试使用
export { DEFAULT_STATS, DEFAULT_STAT_ITEM, CACHE_KEYS }

// 导出访问追踪功能
export { recordVisit, recordClick, visitTracker } from '@/services/stats/visit-tracker'
