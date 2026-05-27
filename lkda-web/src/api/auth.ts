import http from '@/utils/http'
import type { UserInfoVO } from '@/types/vo'

export interface LoginDTO {
  username: string
  password: string
}

export interface LoginVO {
  token: string
  tokenName: string
  userId: number
  username: string
  nickname: string
  role: string
}

export const AuthApi = {
  login: (data: LoginDTO) =>
    http.post<LoginVO>('/auth/login', data),

  logout: () =>
    http.post<void>('/auth/logout'),

  getUserInfo: () =>
    http.get<UserInfoVO>('/auth/info'),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    http.put<void>('/user/password', data),
}
