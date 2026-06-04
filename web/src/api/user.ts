/**
 * 用户相关 API
 */
import request from '@/utils/http'

/**
 * 获取当前用户信息
 */
export function fetchCurrentUserInfo() {
  return request.get<Api.Auth.UserInfo>({
    url: '/user/info'
  })
}

/**
 * 更新用户个人资料
 */
export interface UpdateProfileParams {
  nickName?: string
  email?: string
  phone?: string
  gender?: string
  avatar?: string
  address?: string
  intro?: string
  backgroundImage?: string
}

export function updateUserProfile(data: UpdateProfileParams) {
  return request.put({
    url: '/user/profile',
    data
  })
}

/**
 * 修改密码
 */
export interface UpdatePasswordParams {
  oldPassword: string
  newPassword: string
}

export function updateUserPassword(data: UpdatePasswordParams) {
  return request.put({
    url: '/user/password',
    data
  })
}

/**
 * 上传头像
 */
export function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('avatar', file)

  return request.post<{ url: string; filename: string }>({
    url: '/upload/avatar',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 上传背景图片
 */
export function uploadBackgroundImage(file: File) {
  const formData = new FormData()
  formData.append('background', file)

  return request.post<{ url: string; filename: string }>({
    url: '/upload/background',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
