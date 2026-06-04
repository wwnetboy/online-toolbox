/**
 * 统计数据缓存服务模块
 *
 * 提供统计数据的缓存管理功能，支持可配置的 TTL（生存时间）
 *
 * ## 主要功能
 *
 * - 缓存数据的存取（get/set）
 * - 缓存有效性检查（isValid）
 * - 缓存失效（invalidate）
 * - 清除所有缓存（clear）
 * - 支持可配置的 TTL
 *
 * ## 使用场景
 *
 * - 减少统计数据 API 请求
 * - 提供离线数据访问能力
 * - 优化页面加载性能
 *
 * @module services/stats/stats-cache
 * @author Art Design Pro Team
 */

import type { StatsData, StatsTimeRange } from '@/types/stats'

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 缓存过期时间（毫秒），默认 5 分钟 */
  ttl: number
}

/**
 * 缓存数据包装接口
 * 用于存储带有元数据的缓存数据
 */
export interface CachedData<T> {
  /** 缓存的数据 */
  data: T
  /** 缓存创建时间戳（毫秒） */
  timestamp: number
  /** 缓存过期时间戳（毫秒） */
  expiry: number
}

/**
 * 默认缓存配置
 */
const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000 // 5 分钟
}

/**
 * 缓存存储键前缀
 */
const CACHE_KEY_PREFIX = 'stats_cache_'

/**
 * 统计数据缓存服务类
 *
 * 提供统计数据的缓存管理，支持 localStorage 持久化
 *
 * @example
 * ```typescript
 * const cacheService = new StatsCacheService({ ttl: 60000 })
 *
 * // 设置缓存
 * cacheService.set('stats_today', statsData)
 *
 * // 获取缓存
 * const cached = cacheService.get<StatsData>('stats_today')
 *
 * // 检查缓存有效性
 * if (cacheService.isValid('stats_today')) {
 *   // 使用缓存数据
 * }
 *
 * // 失效缓存
 * cacheService.invalidate('stats_today')
 *
 * // 清除所有缓存
 * cacheService.clear()
 * ```
 */
export class StatsCacheService {
  private config: CacheConfig
  private memoryCache: Map<string, CachedData<unknown>>

  /**
   * 创建缓存服务实例
   *
   * @param config - 缓存配置，可选
   */
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.memoryCache = new Map()
  }

  /**
   * 获取缓存数据
   *
   * 首先检查内存缓存，如果不存在则尝试从 localStorage 读取
   * 如果缓存已过期，返回 null
   *
   * @param key - 缓存键
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  get<T>(key: string): T | null {
    const fullKey = this.getFullKey(key)

    // 首先检查内存缓存
    const memoryCached = this.memoryCache.get(fullKey) as CachedData<T> | undefined
    if (memoryCached) {
      if (this.isDataValid(memoryCached)) {
        return memoryCached.data
      }
      // 内存缓存已过期，删除
      this.memoryCache.delete(fullKey)
    }

    // 尝试从 localStorage 读取
    try {
      const stored = localStorage.getItem(fullKey)
      if (!stored) {
        return null
      }

      const cached: CachedData<T> = JSON.parse(stored)
      if (this.isDataValid(cached)) {
        // 恢复到内存缓存
        this.memoryCache.set(fullKey, cached)
        return cached.data
      }

      // localStorage 缓存已过期，删除
      localStorage.removeItem(fullKey)
      return null
    } catch {
      // JSON 解析失败，删除损坏的缓存
      localStorage.removeItem(fullKey)
      return null
    }
  }

  /**
   * 设置缓存数据
   *
   * 同时存储到内存缓存和 localStorage
   *
   * @param key - 缓存键
   * @param data - 要缓存的数据
   * @param ttl - 可选的自定义 TTL（毫秒），不传则使用默认配置
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const fullKey = this.getFullKey(key)
    const effectiveTtl = ttl ?? this.config.ttl
    const now = Date.now()

    const cached: CachedData<T> = {
      data,
      timestamp: now,
      expiry: now + effectiveTtl
    }

    // 存储到内存缓存
    this.memoryCache.set(fullKey, cached)

    // 存储到 localStorage
    try {
      localStorage.setItem(fullKey, JSON.stringify(cached))
    } catch {
      // localStorage 可能已满或不可用，忽略错误
      // 内存缓存仍然可用
    }
  }

  /**
   * 检查缓存是否有效
   *
   * @param key - 缓存键
   * @returns 如果缓存存在且未过期返回 true，否则返回 false
   */
  isValid(key: string): boolean {
    const fullKey = this.getFullKey(key)

    // 检查内存缓存
    const memoryCached = this.memoryCache.get(fullKey)
    if (memoryCached && this.isDataValid(memoryCached)) {
      return true
    }

    // 检查 localStorage
    try {
      const stored = localStorage.getItem(fullKey)
      if (!stored) {
        return false
      }

      const cached: CachedData<unknown> = JSON.parse(stored)
      return this.isDataValid(cached)
    } catch {
      return false
    }
  }

  /**
   * 失效指定缓存
   *
   * 从内存缓存和 localStorage 中删除指定键的缓存
   *
   * @param key - 缓存键
   */
  invalidate(key: string): void {
    const fullKey = this.getFullKey(key)

    // 从内存缓存删除
    this.memoryCache.delete(fullKey)

    // 从 localStorage 删除
    try {
      localStorage.removeItem(fullKey)
    } catch {
      // 忽略 localStorage 错误
    }
  }

  /**
   * 清除所有缓存
   *
   * 清除内存缓存和 localStorage 中所有以缓存前缀开头的数据
   */
  clear(): void {
    // 清除内存缓存
    this.memoryCache.clear()

    // 清除 localStorage 中的缓存
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_KEY_PREFIX)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
    } catch {
      // 忽略 localStorage 错误
    }
  }

  /**
   * 生成带有时间范围的缓存键
   *
   * @param baseKey - 基础键名
   * @param timeRange - 时间范围
   * @returns 完整的缓存键
   */
  static generateKey(baseKey: string, timeRange: StatsTimeRange): string {
    return `${baseKey}_${timeRange}`
  }

  /**
   * 获取完整的缓存键（带前缀）
   *
   * @param key - 原始键
   * @returns 带前缀的完整键
   */
  private getFullKey(key: string): string {
    return `${CACHE_KEY_PREFIX}${key}`
  }

  /**
   * 检查缓存数据是否有效（未过期）
   *
   * @param cached - 缓存数据包装对象
   * @returns 如果未过期返回 true，否则返回 false
   */
  private isDataValid(cached: CachedData<unknown>): boolean {
    return Date.now() < cached.expiry
  }
}

/**
 * 默认缓存服务实例
 * 使用默认配置（5 分钟 TTL）
 */
export const statsCacheService = new StatsCacheService()
