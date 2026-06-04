/**
 * 统计数据类型定义模块
 *
 * 提供管理后台数据概览页面所需的类型定义
 *
 * ## 主要功能
 *
 * - 时间范围类型（今日、本周、本月、今年）
 * - 趋势方向类型（上升、下降、持平）
 * - 统计数据项类型
 * - 完整统计数据类型
 * - 缓存数据结构类型
 * - 统计卡片配置类型
 *
 * ## 使用场景
 *
 * - 数据概览页面统计数据展示
 * - 统计服务层数据处理
 * - 缓存服务数据存储
 *
 * @module types/stats
 * @author Art Design Pro Team
 */

/**
 * 统计时间范围类型
 * 用于筛选不同时间段的统计数据
 */
export type StatsTimeRange = 'today' | 'week' | 'month' | 'year'

/**
 * 趋势方向类型
 * 表示数据相对于上一周期的变化方向
 */
export type TrendDirection = 'up' | 'down' | 'neutral'

/**
 * 单项统计数据
 * 包含统计值、趋势百分比和数据时间戳
 */
export interface StatItem {
  /** 统计值（非负数） */
  value: number
  /** 趋势百分比（相对于上一周期），正数表示增长，负数表示下降 */
  trend: number
  /** 数据时间戳（Unix 时间戳，毫秒） */
  timestamp: number
}

/**
 * 完整统计数据
 * 包含所有核心统计指标
 */
export interface StatsData {
  /** 总访问次数 (PV) */
  totalVisits: StatItem
  /** 独立访客数 (UV) */
  uniqueVisitors: StatItem
  /** 当前在线访客数 */
  onlineVisitors: StatItem
  /** 总点击量 */
  clickCount: StatItem
  /** 新注册用户数 */
  newUsers: StatItem
}

/**
 * 缓存数据结构
 * 用于存储带有过期时间的统计数据
 */
export interface CachedStats {
  /** 缓存的统计数据 */
  data: StatsData
  /** 数据对应的时间范围 */
  timeRange: StatsTimeRange
  /** 缓存创建时间戳（毫秒） */
  cachedAt: number
  /** 缓存过期时间戳（毫秒） */
  expiresAt: number
}

/**
 * 统计卡片配置
 * 用于配置统计卡片组件的显示内容
 */
export interface StatsCardConfig {
  /** 统计数据键名 */
  key: keyof StatsData
  /** 卡片标题 */
  title: string
  /** 卡片图标 */
  icon: string
  /** 卡片描述（可选） */
  description?: string
}

/**
 * 趋势计算结果
 * 包含趋势百分比、方向和格式化字符串
 */
export interface TrendResult {
  /** 趋势百分比 */
  percentage: number
  /** 趋势方向 */
  direction: TrendDirection
  /** 格式化后的字符串，如 "+15%" 或 "-8%" */
  formatted: string
}

/**
 * 趋势样式配置
 * 用于根据趋势方向返回对应的显示样式
 */
export interface TrendStyle {
  /** 显示颜色 */
  color: string
  /** 前缀符号 */
  prefix: string
}

/**
 * 统计数据响应
 * API 返回的统计数据格式
 */
export interface StatsResponse {
  /** 总访问次数 (PV) */
  totalVisits: StatItem
  /** 独立访客数 (UV) */
  uniqueVisitors: StatItem
  /** 在线访客数 */
  onlineVisitors: StatItem
  /** 点击量 */
  clickCount: StatItem
  /** 新用户数 */
  newUsers: StatItem
}

/**
 * 统计错误类型
 * 用于标识不同类型的统计数据获取错误
 */
export type StatsErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'SERVER_ERROR' | 'INVALID_DATA'

/**
 * 统计错误信息
 * 包含错误代码、消息和时间戳
 */
export interface StatsError {
  /** 错误代码 */
  code: StatsErrorCode
  /** 错误消息 */
  message: string
  /** 错误发生时间戳 */
  timestamp: number
}
