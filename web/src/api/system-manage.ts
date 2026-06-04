import request from '@/utils/http'
import { AppRouteRecord } from '@/types/router'

// 获取用户列表
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserList>({
    url: '/user/list',
    params
  })
}

// 获取角色列表
export function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  return request.get<Api.SystemManage.RoleList>({
    url: '/role/list',
    params
  })
}

// 获取菜单列表
export function fetchGetMenuList() {
  return request.get<AppRouteRecord[]>({
    url: '/v3/system/menus'
  })
}

// 创建角色
export function fetchCreateRole(data: any) {
  return request.post({ url: '/role', data })
}

// 更新角色
export function fetchUpdateRole(id: number, data: any) {
  return request.put({ url: `/role/${id}`, data })
}

// 删除角色
export function fetchDeleteRole(id: number) {
  return request.delete({ url: `/role/${id}` })
}

// 获取角色权限
export function fetchGetRoleMenus(roleId: number) {
  return request.get({ url: `/role/${roleId}/menus` })
}

// 保存角色权限
export function fetchSaveRoleMenus(roleId: number, menuIds: number[]) {
  return request.put({ url: `/role/${roleId}/menus`, data: { menuIds } })
}

// 保存菜单
export function fetchSaveMenu(data: any) {
  return request.post({ url: '/menu', data })
}

// 更新菜单
export function fetchUpdateMenu(id: number, data: any) {
  return request.put({ url: `/menu/${id}`, data })
}

// 删除菜单
export function fetchDeleteMenu(id: number) {
  return request.delete({ url: `/menu/${id}` })
}
