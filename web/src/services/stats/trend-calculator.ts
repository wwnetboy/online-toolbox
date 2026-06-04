/**
 * 趋势计算器模块
 *
 * 提供统计数据趋势计算和样式获取功能
 *
 * ## 主要功能
 *
 * - 计算当前值与上一周期值的百分比变化
 * - 根据趋势方向返回对应的显示样式（颜色和前缀）
 * - 处理边界情况（零值、负值）
 *
 * ## 使用场景
 *
 * - 数据概览页面趋势指示器显示
 * - 统计卡片趋势百分比计算
 *
 * @module services/stats/trend-calculator
 * @author Art Design Pro Team
 */

import type { TrendDirection, TrendResult, TrendStyle } from '@/types/stats'

/**
 * 计算趋势百分比
 *
 * 根据当前值和上一周期值计算百分比变化
 *
 * 计算公式: ((current - previous) / previous) * 100
 *
 * 边界情况处理:
 * - 当 previous 为 0 且 current > 0 时，返回 100%
 * - 当 previous 为 0 且 current = 0 时，返回 0%
 * - 当 previous 为 0 且 current < 0 时，返回 -100%
 *
 * @param current - 当前周期的值
 * @param previous - 上一周期的值
 * @returns 趋势计算结果，包含百分比、方向和格式化字符串
 *
 * @example
 * ```typescript
 * // 正常增长
 * calculateTrend(115, 100) // { percentage: 15, direction: 'up', formatted: '+15.0%' }
 *
 * // 正常下降
 * calculateTrend(92, 100) // { percentage: -8, direction: 'down', formatted: '-8.0%' }
 *
 * // 零值边界
 * calculateTrend(100, 0) // { percentage: 100, direction: 'up', formatted: '+100.0%' }
 * ```
 */
export function calculateTrend(current: number, previous: number): TrendResult {
  let percentage: number

  if (previous === 0) {
    // 边界情况：上一周期为零
    if (current > 0) {
      percentage = 100
    } else if (current < 0) {
      percentage = -100
    } else {
      percentage = 0
    }
  } else {
    // 正常计算：((current - previous) / previous) * 100
    percentage = ((current - previous) / previous) * 100
    // 四舍五入到一位小数
    percentage = Math.round(percentage * 10) / 10
  }

  // 确定趋势方向
  let direction: TrendDirection
  if (percentage > 0) {
    direction = 'up'
  } else if (percentage < 0) {
    direction = 'down'
  } else {
    direction = 'neutral'
  }

  // 格式化字符串
  const formatted = formatTrendPercentage(percentage, direction)

  return {
    percentage,
    direction,
    formatted
  }
}

/**
 * 格式化趋势百分比为显示字符串
 *
 * @param percentage - 百分比值
 * @param direction - 趋势方向
 * @returns 格式化后的字符串，如 "+15.0%" 或 "-8.0%"
 */
function formatTrendPercentage(percentage: number, direction: TrendDirection): string {
  const absPercentage = Math.abs(percentage).toFixed(1)

  switch (direction) {
    case 'up':
      return `+${absPercentage}%`
    case 'down':
      return `-${absPercentage}%`
    case 'neutral':
    default:
      return `${absPercentage}%`
  }
}

/**
 * 获取趋势显示样式
 *
 * 根据趋势方向返回对应的颜色和前缀符号
 *
 * - up (上升): 绿色，"+" 前缀
 * - down (下降): 红色，"-" 前缀
 * - neutral (持平): 灰色，无前缀
 *
 * @param direction - 趋势方向
 * @returns 趋势样式配置，包含颜色和前缀
 *
 * @example
 * ```typescript
 * getTrendStyle('up')      // { color: '#52c41a', prefix: '+' }
 * getTrendStyle('down')    // { color: '#ff4d4f', prefix: '-' }
 * getTrendStyle('neutral') // { color: '#8c8c8c', prefix: '' }
 * ```
 */
export function getTrendStyle(direction: TrendDirection): TrendStyle {
  switch (direction) {
    case 'up':
      return {
        color: '#52c41a', // 绿色 - 表示正向增长
        prefix: '+'
      }
    case 'down':
      return {
        color: '#ff4d4f', // 红色 - 表示负向下降
        prefix: '-'
      }
    case 'neutral':
    default:
      return {
        color: '#8c8c8c', // 灰色 - 表示持平
        prefix: ''
      }
  }
}

/**
 * 格式化趋势百分比为显示字符串
 *
 * 直接从趋势值格式化为带符号的百分比字符串
 *
 * @param trend - 趋势百分比值（正数表示上升，负数表示下降）
 * @returns 格式化后的字符串，如 "+15%" 或 "-8%"
 *
 * @example
 * ```typescript
 * formatTrendPercent(15)   // "+15%"
 * formatTrendPercent(-8)   // "-8%"
 * formatTrendPercent(0)    // "0%"
 * ```
 */
export function formatTrendPercent(trend: number): string {
  const rounded = Math.round(trend)
  if (rounded > 0) {
    return `+${rounded}%`
  } else if (rounded < 0) {
    return `${rounded}%`
  }
  return '0%'
}
