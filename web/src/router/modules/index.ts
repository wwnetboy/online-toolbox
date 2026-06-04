import { AppRouteRecord } from '@/types/router'
import { adminRoutes } from './admin'

/**
 * 路由模块
 *
 * 后台管理路由（需要 /admin 前缀）：
 * - 数据概览 - 访问统计、工具使用排行、用户增长趋势
 * - 工具管理 - 工具列表、分类管理、工具配置
 * - 用户管理 - 用户列表、角色权限
 * - 用户反馈 - 反馈列表、问题处理
 * - 系统设置 - 站点配置、存储设置、安全设置
 *
 * 注意：个人中心已改为静态路由，在 staticRoutes.ts 中配置
 */
export const routeModules: AppRouteRecord[] = adminRoutes
