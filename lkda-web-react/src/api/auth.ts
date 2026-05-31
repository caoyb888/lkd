import http from '@/lib/http'

export const AuthApi = {
  login: (data: { username: string; password: string }) =>
    http.post('/auth/login', data),
  logout: () => http.post('/auth/logout'),
  getUserInfo: () => http.get('/auth/info'),
  changePassword: (data: {
    oldPassword: string
    newPassword: string
  }) => http.post('/auth/change-password', data),
}
