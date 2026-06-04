/**
 * 工具管理 API
 * 对接后端 /api/tool 和 /api/category 接口
 */
import request from '@/utils/http'

/** 工具数据类型 */
export interface ToolData {
  id: number
  name: string
  description: string | null
  icon: string | null
  iconUrl: string | null
  color: string | null
  categoryId: number | null
  route: string
  badge: 'hot' | 'new' | null
  enabled: boolean
  sort: number
  createdAt: string
  updatedAt: string
  category?: CategoryData
}

/** 图标上传响应类型 */
export interface IconUploadResponse {
  url: string
  filename: string
}

/** 分类数据类型 */
export interface CategoryData {
  id: number
  identifier: string
  name: string
  icon: string | null
  sort: number
  enabled: boolean
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

/** 分页响应类型 */
export interface PaginatedResponse<T> {
  records: T[]
  total: number
  current: number
  size: number
}

/** 获取工具列表参数 */
export interface GetToolsParams {
  current?: number
  size?: number
  name?: string
  category?: string
  enabled?: boolean
}

// ==================== 工具 API ====================

/** 获取工具列表（公开，无需认证） */
export function fetchPublicToolList() {
  return request.get<PaginatedResponse<ToolData>>({
    url: '/tool/public/list',
    showErrorMessage: false
  })
}

/** 获取工具列表（需要认证） */
export function fetchToolList(params?: GetToolsParams) {
  return request.get<PaginatedResponse<ToolData>>({
    url: '/tool/list',
    params
  })
}

/** 获取单个工具 */
export function fetchToolById(id: number) {
  return request.get<ToolData>({
    url: `/tool/${id}`
  })
}

/** 创建工具 */
export function createTool(data: Partial<ToolData>) {
  return request.post<ToolData>({
    url: '/tool',
    data,
    showSuccessMessage: true
  })
}

/** 更新工具 */
export function updateTool(id: number, data: Partial<ToolData>) {
  return request.put<ToolData>({
    url: `/tool/${id}`,
    data,
    showSuccessMessage: true
  })
}

/** 删除工具 */
export function deleteTool(id: number) {
  return request.del<void>({
    url: `/tool/${id}`,
    showSuccessMessage: true
  })
}

/** 切换工具状态 */
export function toggleToolStatus(id: number) {
  return request.put<ToolData>({
    url: `/tool/${id}/toggle`,
    showSuccessMessage: true
  })
}

/** 批量更新排序 */
export function updateToolSort(items: Array<{ id: number; sort: number }>) {
  return request.put<void>({
    url: '/tool/sort',
    data: { items },
    showSuccessMessage: true
  })
}

/** 批量删除工具 */
export function batchDeleteTools(ids: number[]) {
  return request.del<{ deleted: number }>({
    url: '/tool/batch',
    data: { ids },
    showSuccessMessage: true
  })
}

/** 批量更新状态 */
export function batchToggleStatus(ids: number[], enabled: boolean) {
  return request.put<{ updated: number }>({
    url: '/tool/batch/status',
    data: { ids, enabled },
    showSuccessMessage: true
  })
}

/** 重置工具为默认配置 */
export function resetTools() {
  return request.post<void>({
    url: '/tool/reset',
    showSuccessMessage: true
  })
}

// ==================== 分类 API ====================

/** 获取分类列表（公开，无需认证） */
export function fetchPublicCategoryList() {
  return request.get<CategoryData[]>({
    url: '/category/public/list',
    showErrorMessage: false
  })
}

/** 获取分类列表（需要认证） */
export function fetchCategoryList() {
  return request.get<CategoryData[]>({
    url: '/category/list'
  })
}

/** 获取单个分类 */
export function fetchCategoryById(id: number) {
  return request.get<CategoryData>({
    url: `/category/${id}`
  })
}

/** 创建分类 */
export function createCategory(data: Partial<CategoryData>) {
  return request.post<CategoryData>({
    url: '/category',
    data,
    showSuccessMessage: true
  })
}

/** 更新分类 */
export function updateCategory(id: number, data: Partial<CategoryData>) {
  return request.put<CategoryData>({
    url: `/category/${id}`,
    data,
    showSuccessMessage: true
  })
}

/** 删除分类 */
export function deleteCategory(id: number) {
  return request.del<void>({
    url: `/category/${id}`,
    showSuccessMessage: true
  })
}

/** 批量更新分类排序 */
export function updateCategorySort(items: Array<{ id: number; sort: number }>) {
  return request.put<void>({
    url: '/category/sort',
    data: { items },
    showSuccessMessage: true
  })
}

/** 检查分类标识是否存在 */
export function checkCategoryIdentifier(identifier: string, excludeId?: number) {
  return request.get<{ exists: boolean }>({
    url: '/category/check-identifier',
    params: { identifier, excludeId }
  })
}

/** 重置分类为默认配置 */
export function resetCategories() {
  return request.post<void>({
    url: '/category/reset',
    showSuccessMessage: true
  })
}

// ==================== 图标上传 API ====================

/** 上传工具图标 */
export function uploadToolIcon(file: File): Promise<IconUploadResponse> {
  const formData = new FormData()
  formData.append('icon', file)

  return request.post<IconUploadResponse>({
    url: '/upload/icon',
    data: formData,
    showSuccessMessage: true
  })
}

/** 删除工具图标 */
export function deleteToolIcon(filename: string) {
  return request.del<void>({
    url: `/upload/icon/${filename}`,
    showSuccessMessage: true
  })
}
