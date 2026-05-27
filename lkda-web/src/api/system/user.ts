import http from '@/utils/http'
import type { Page, PageQuery } from '@/types/api.d.ts'

export interface UserListVO {
  userId: number
  username: string
  nickname: string
  phone: string
  phoneRaw?: string
  deptId: number
  deptName: string
  roles: string[]
  status: number
  createdAt: string
}

export interface UserSaveDTO {
  username: string
  nickname: string
  phone: string
  deptId: number
  roles: string[]
  password?: string
}

export const UserApi = {
  page: (params: PageQuery & { username?: string; deptId?: number }) =>
    http.get<Page<UserListVO>>('/user/page', { params }),

  save: (data: UserSaveDTO) =>
    http.post<void>('/user', data),

  update: (userId: number, data: Omit<UserSaveDTO, 'password'>) =>
    http.put<void>(`/user/${userId}`, data),

  changeStatus: (userId: number, status: number) =>
    http.put<void>(`/user/${userId}`, { status }),

  resetPassword: (userId: number, newPassword: string) =>
    http.post<void>(`/user/${userId}/reset-password`, { newPassword }),
}
