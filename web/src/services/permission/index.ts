/**
 * 权限服务模块
 *
 * 提供功能权限检查、使用次数追踪和会员状态管理
 *
 * ## 主要功能
 *
 * - 功能权限配置获取
 * - 权限检查（支持登录用户和游客）
 * - 使用次数记录
 * - 剩余次数查询
 * - 本地缓存机制
 *
 * ## 使用场景
 *
 * - PDF工具权限控制
 * - 会员功能限制
 * - 免费试用次数管理
 *
 * @module services/permission
 * @requirements 1.1, 1.4
 */

import request from '@/utils/http'
import { getVisitorId } from '@/utils/visitor-id'

/** 功能权限配置 */
export interface FeaturePermission {
  featureId: string
  featureName: string
  category: string
  requireMember: boolean
  freeTrialCount: number
  enabled: boolean
}

/** 权限检查结果 */
export interface PermissionResult {
  allowed: boolean
  reason?: 'not_member' | 'limit_exceeded' | 'feature_disabled'
  message?: string
  remainingCount?: number
  requireMember?: boolean
  isMember?: boolean
}

/** 剩余次数信息 */
export interface RemainingCountInfo {
  unlimited: boolean
  remaining: number
  total: number
  used?: number
  isMember?: boolean
}

/** 会员信息 */
export interface MemberInfo {
  isMember: boolean
  level?: 'basic' | 'pro' | 'enterprise'
  startDate?: string
  endDate?: string
}

/** 缓存项 */
interface CacheItem<T> {
  data: T
  timestamp: number
}

/** 缓存配置 */
const CACHE_CONFIG = {
  /** 功能配置缓存时间（5分钟） */
  FEATURE_CONFIG_TTL: 5 * 60 * 1000,
  /** 权限检查缓存时间（1分钟） */
  PERMISSION_CHECK_TTL: 60 * 1000,
  /** 会员信息缓存时间（5分钟） */
  MEMBER_INFO_TTL: 5 * 60 * 1000
}

/** 内存缓存 */
const cache = {
  featureConfigs: new Map<string, CacheItem<FeaturePermission>>(),
  permissionResults: new Map<string, CacheItem<PermissionResult>>(),
  memberInfo: null as CacheItem<MemberInfo> | null
}

/**
 * 检查缓存是否有效
 */
function isCacheValid<T>(item: CacheItem<T> | null | undefined, ttl: number): boolean {
  if (!item) return false
  return Date.now() - item.timestamp < ttl
}

/**
 * 获取功能配置
 * @param featureId 功能标识
 * @param useCache 是否使用缓存（默认true）
 * @requirements 1.1
 */
export async function getFeatureConfig(
  featureId: string,
  useCache = true
): Promise<FeaturePermission | null> {
  // 检查缓存
  if (useCache) {
    const cached = cache.featureConfigs.get(featureId)
    if (isCacheValid(cached, CACHE_CONFIG.FEATURE_CONFIG_TTL)) {
      return cached!.data
    }
  }

  try {
    const data = await request.get<FeaturePermission>({
      url: `/api/permission/config/${featureId}`,
      showErrorMessage: false
    })

    // 更新缓存
    cache.featureConfigs.set(featureId, {
      data,
      timestamp: Date.now()
    })

    return data
  } catch (error) {
    console.error(`[Permission] 获取功能配置失败: ${featureId}`, error)
    return null
  }
}

/**
 * 获取所有功能配置
 * @param category 可选的分类过滤
 * @requirements 1.1
 */
export async function getAllFeatureConfigs(category?: string): Promise<FeaturePermission[]> {
  try {
    const params: Record<string, string> = {}
    if (category) {
      params.category = category
    }

    const data = await request.get<FeaturePermission[]>({
      url: '/permission/configs',
      params,
      showErrorMessage: false
    })

    // 更新缓存
    data.forEach((config) => {
      cache.featureConfigs.set(config.featureId, {
        data: config,
        timestamp: Date.now()
      })
    })

    return data
  } catch (error) {
    console.error('[Permission] 获取功能配置列表失败', error)
    return []
  }
}

/**
 * 检查功能权限
 * @param featureId 功能标识
 * @param useCache 是否使用缓存（默认true）
 * @requirements 1.2, 1.3
 */
export async function checkPermission(
  featureId: string,
  useCache = true
): Promise<PermissionResult> {
  const visitorId = getVisitorId()
  const cacheKey = `${featureId}:${visitorId}`

  // 检查缓存
  if (useCache) {
    const cached = cache.permissionResults.get(cacheKey)
    if (isCacheValid(cached, CACHE_CONFIG.PERMISSION_CHECK_TTL)) {
      return cached!.data
    }
  }

  try {
    const data = await request.post<PermissionResult>({
      url: '/permission/check',
      data: {
        featureId,
        visitorId
      },
      showErrorMessage: false
    })

    // 更新缓存
    cache.permissionResults.set(cacheKey, {
      data,
      timestamp: Date.now()
    })

    return data
  } catch (error) {
    console.error(`[Permission] 权限检查失败: ${featureId}`, error)
    // 发生错误时默认允许访问，避免阻塞用户
    return {
      allowed: true,
      message: '权限检查失败，默认允许访问'
    }
  }
}

/**
 * 记录功能使用
 * @param featureId 功能标识
 * @requirements 1.3, 1.6
 */
export async function recordUsage(featureId: string): Promise<boolean> {
  const visitorId = getVisitorId()

  try {
    await request.post<void>({
      url: '/permission/record',
      data: {
        featureId,
        visitorId
      },
      showErrorMessage: false
    })

    // 清除相关缓存，确保下次获取最新数据
    const cacheKey = `${featureId}:${visitorId}`
    cache.permissionResults.delete(cacheKey)

    return true
  } catch (error) {
    console.error(`[Permission] 记录使用失败: ${featureId}`, error)
    return false
  }
}

/**
 * 获取剩余次数
 * @param featureId 功能标识
 * @requirements 1.6
 */
export async function getRemainingCount(featureId: string): Promise<RemainingCountInfo> {
  const visitorId = getVisitorId()

  try {
    const data = await request.post<RemainingCountInfo>({
      url: '/permission/remaining',
      data: {
        featureId,
        visitorId
      },
      showErrorMessage: false
    })

    return data
  } catch (error) {
    console.error(`[Permission] 获取剩余次数失败: ${featureId}`, error)
    // 发生错误时返回无限制
    return {
      unlimited: true,
      remaining: -1,
      total: -1
    }
  }
}

/**
 * 获取会员信息
 * @param useCache 是否使用缓存（默认true）
 * @requirements 1.2
 */
export async function getMemberInfo(useCache = true): Promise<MemberInfo> {
  // 检查缓存
  if (useCache && isCacheValid(cache.memberInfo, CACHE_CONFIG.MEMBER_INFO_TTL)) {
    return cache.memberInfo!.data
  }

  try {
    const data = await request.get<MemberInfo>({
      url: '/permission/member',
      showErrorMessage: false
    })

    // 更新缓存
    cache.memberInfo = {
      data,
      timestamp: Date.now()
    }

    return data
  } catch (error) {
    console.error('[Permission] 获取会员信息失败', error)
    return { isMember: false }
  }
}

/**
 * 清除所有缓存
 */
export function clearCache(): void {
  cache.featureConfigs.clear()
  cache.permissionResults.clear()
  cache.memberInfo = null
}

/**
 * 清除指定功能的缓存
 * @param featureId 功能标识
 */
export function clearFeatureCache(featureId: string): void {
  cache.featureConfigs.delete(featureId)

  // 清除所有与该功能相关的权限检查缓存
  for (const key of cache.permissionResults.keys()) {
    if (key.startsWith(`${featureId}:`)) {
      cache.permissionResults.delete(key)
    }
  }
}

/**
 * 权限服务对象（便于统一导入）
 */
export const permissionService = {
  getFeatureConfig,
  getAllFeatureConfigs,
  checkPermission,
  recordUsage,
  getRemainingCount,
  getMemberInfo,
  clearCache,
  clearFeatureCache
}

export default permissionService
