import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserInfo {
  userId: number
  username: string
  nickname: string
  deptId: number
  roles: string[]
}

interface AuthState {
  token: string | null
  userInfo: UserInfo | null
  setToken: (token: string) => void
  setUserInfo: (user: UserInfo) => void
  logout: () => void
  hasRole: (role: string) => boolean
  hasPermission: (perm: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: import.meta.env.DEV ? 'dev-token' : null,
      userInfo: import.meta.env.DEV
        ? { userId: 1, username: 'admin', nickname: '管理员', deptId: 1, roles: ['archive_admin', 'company_leader'] }
        : null,
      setToken: (token) => set({ token }),
      setUserInfo: (userInfo) => set({ userInfo }),
      logout: () => set({ token: null, userInfo: null }),
      hasRole: (role) => get().userInfo?.roles?.includes(role) ?? false,
      hasPermission: () => true,
    }),
    { name: 'lkda_auth' }
  )
)
