import { AppRouteRecord } from '@/types/router'
import { overviewRoutes } from './overview'
import { toolManageRoutes } from './tool-manage'
import { userManageRoutes } from './user-manage'
import { feedbackRoutes } from './feedback'
import { settingsRoutes } from './settings'

/**
 * 后台管理路由模块
 *
 * 菜单结构：
 * - 数据概览 - 访问统计、工具使用排行、用户增长趋势
 * - 工具管理 - 工具列表、分类管理、工具配置、功能权限
 * - 用户管理 - 用户列表、角色权限
 * - 用户反馈 - 反馈列表、问题处理
 * - 系统设置 - 站点配置、存储设置、安全设置
 */
export const adminRoutes: AppRouteRecord[] = [
  overviewRoutes,
  toolManageRoutes,
  userManageRoutes,
  feedbackRoutes,
  settingsRoutes
]

export {
  overviewRoutes,
  toolManageRoutes,
  userManageRoutes,
  feedbackRoutes,
  settingsRoutes
}
