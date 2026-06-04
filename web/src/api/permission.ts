/**
 * 权限管理 API
 * 用于后台管理功能权限配置
 * @requirements 1.1, 1.4, 1.5, 1.9
 */

import request from '@/utils/http'

/** 功能权限配置 */
export interface FeaturePermission {
  featureId: string
  featureName: string
  category: string
  requireMember: boolean
  freeTrialCount: number
  enabled: boolean
}

/** 更新功能配置参数 */
export interface UpdateFeatureConfigParams {
  featureName?: string
  category?: string
  requireMember?: boolean
  freeTrialCount?: number
  enabled?: boolean
}

/** 批量更新参数 */
export interface BatchUpdateParams {
  requireMember?: boolean
  freeTrialCount?: number
  enabled?: boolean
}

/**
 * 获取所有功能配置
 * @param category 可选的分类过滤
 * @requirements 1.1
 */
export function fetchAllFeatureConfigs(category?: string) {
  return request.get<FeaturePermission[]>({
    url: '/permission/configs',
    params: category ? { category } : undefined
  })
}

/**
 * 获取单个功能配置
 * @param featureId 功能标识
 * @requirements 1.1
 */
export function fetchFeatureConfig(featureId: string) {
  return request.get<FeaturePermission>({
    url: `/permission/config/${featureId}`
  })
}

/**
 * 更新功能配置
 * @param featureId 功能标识
 * @param params 更新参数
 * @requirements 1.4, 1.5
 */
export function updateFeatureConfig(featureId: string, params: UpdateFeatureConfigParams) {
  return request.put<FeaturePermission>({
    url: `/permission/config/${featureId}`,
    data: params
  })
}

/**
 * 批量更新分类下的功能配置
 * @param category 分类标识
 * @param params 更新参数
 * @requirements 1.9
 */
export function batchUpdateByCategory(category: string, params: BatchUpdateParams) {
  return request.put<{ affectedCount: number }>({
    url: `/permission/batch/${category}`,
    data: params
  })
}
