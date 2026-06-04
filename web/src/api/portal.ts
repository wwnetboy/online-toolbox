import request from '@/utils/http'

/**
 * 前台用户注册
 * @param params 注册参数
 * @returns 注册响应
 */
export function fetchRegister(params: {
  userName: string
  email: string
  password: string
  nickName?: string
  phone?: string
  gender?: 'male' | 'female' | 'unknown'
}) {
  return request.post<{ userId: number; userName: string; email: string }>({
    url: '/auth/register',
    params
  })
}

/**
 * 前台用户更新个人信息
 * @param params 更新参数
 * @returns 更新响应
 */
export function fetchUpdateProfile(params: {
  nickName?: string
  email?: string
  phone?: string
  gender?: 'male' | 'female' | 'unknown'
  avatar?: string
  address?: string
  intro?: string
}) {
  return request.put<Api.Auth.UserInfo>({
    url: '/user/profile',
    params
  })
}

/**
 * 前台用户修改密码
 * @param params 修改密码参数
 * @returns 修改密码响应
 */
export function fetchUpdatePassword(params: { oldPassword: string; newPassword: string }) {
  return request.put<void>({
    url: '/user/password',
    params
  })
}
