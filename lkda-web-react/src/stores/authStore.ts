import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthApi } from '@/api/auth'
import type { UserInfoVO } from '@/types/vo'

interface AuthState {
  token: string | null
  userInfo: UserInfoVO | null
  isLoggedIn: boolean
  isAdmin: boolean
  isLeader: boolean
  setAuth: (token: string, userInfo: UserInfoVO) => void
  logout: () => void
  hasRole: (role: string) => boolean
  hasPermission: (_perm: string) => boolean
  login: (username: string, password: string) => Promise<void>
  fetchUserInfo: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      userInfo: null,
      isLoggedIn: false,
      isAdmin: false,
      isLeader: false,

      setAuth: (token, userInfo) => {
        localStorage.setItem('satoken', token)
        set({
          token,
          userInfo,
          isLoggedIn: true,
          isAdmin: userInfo.role === 'archive_admin' || userInfo.role === 'company_leader',
          isLeader: userInfo.role === 'company_leader',
        })
      },

      logout: () => {
        localStorage.removeItem('satoken')
        set({
          token: null,
          userInfo: null,
          isLoggedIn: false,
          isAdmin: false,
          isLeader: false,
        })
      },

      hasRole: (role) => {
        const r = get().userInfo?.role
        if (!r) return false
        // company_leader（公司领导）拥有全部菜单权限
        if (r === 'company_leader') return true
        return r === role
      },

      hasPermission: () => {
        // 当前后端 UserInfoVO 无 permissions 字段，管理员默认拥有全部权限
        return get().isAdmin
      },

      login: async (username, password) => {
        const res = await AuthApi.login({ username, password })
        const { token, userId, username: uname, nickname, role } = res
        // 兼容 sa-token 返回的 tokenName
        localStorage.setItem('satoken', token)
        // 构造 UserInfoVO
        const userInfo: UserInfoVO = {
          userId,
          username: uname,
          nickname,
          phone: null,
          deptId: null,
          role,
          status: 1,
        }
        get().setAuth(token, userInfo)
      },

      fetchUserInfo: async () => {
        const info = await AuthApi.getUserInfo()
        const token = get().token
        if (token && info) {
          get().setAuth(token, info)
        }
      },
    }),
    {
      name: 'lkda_auth',
      partialize: (state) => ({
        token: state.token,
        userInfo: state.userInfo,
        isLoggedIn: state.isLoggedIn,
        isAdmin: state.isAdmin,
        isLeader: state.isLeader,
      }),
    }
  )
)
