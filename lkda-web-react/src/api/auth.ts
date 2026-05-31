import { Http } from '@/lib/http'
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
  login: (data: LoginDTO) => Http.post<LoginVO>('/auth/login', data),
  logout: () => Http.post<void>('/auth/logout'),
  getUserInfo: () => Http.get<UserInfoVO>('/auth/info'),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    Http.put<void>('/user/password', data),
}
