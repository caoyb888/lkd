import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getToken, setToken, removeToken } from '@/utils/auth'
import type { UserInfoVO } from '@/types/vo'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token    = ref<string | null>(getToken())
    const userInfo = ref<UserInfoVO | null>(null)

    // 页面刷新后 userInfo 从持久化中恢复；若 token 也存在则视为已登录
    const isLoggedIn = computed(() => !!token.value && !!userInfo.value)
    const isAdmin    = computed(() => userInfo.value?.role === 'archive_admin' || userInfo.value?.role === 'company_leader')
    const isLeader   = computed(() => userInfo.value?.role === 'company_leader')

    function hasPermission(_permission: string): boolean {
      // 当前后端 UserInfoVO 无 permissions 字段，管理员默认拥有全部权限
      return isAdmin.value
    }

    function hasRole(role: string): boolean {
      const r = userInfo.value?.role
      if (!r) return false
      // company_leader（公司领导）拥有全部菜单权限
      if (r === 'company_leader') return true
      return r === role
    }

    function setAuth(newToken: string, info: UserInfoVO) {
      token.value    = newToken
      userInfo.value = info
      setToken(newToken)
    }

    function logout() {
      token.value    = null
      userInfo.value = null
      removeToken()
    }

    return { token, userInfo, isLoggedIn, isAdmin, isLeader, hasPermission, hasRole, setAuth, logout }
  },
  {
    persist: {
      key:     'lkda_auth',
      storage: localStorage,
      pick:    ['token', 'userInfo'],
    },
  },
)
