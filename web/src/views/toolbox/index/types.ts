/**
 * 工具定义
 */
export interface Tool {
  /** 工具ID */
  id: string
  /** 工具名称 */
  name: string
  /** 工具描述 */
  description: string
  /** 工具图标 */
  icon: string
  /** 路由地址 */
  route: string
  /** 所属分类 */
  category: string
  /** 搜索关键词 */
  keywords: string[]
  /** 标签（hot/new） */
  badge?: 'hot' | 'new'
  /** 图标背景颜色 */
  color?: string
}

/**
 * 工具分类定义
 */
export interface ToolCategory {
  /** 分类ID */
  id: string
  /** 分类名称 */
  name: string
  /** 分类图标 */
  icon: string
  /** 分类下的工具列表 */
  tools: Tool[]
}
