import { redirect } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDictStore } from '@/stores/dictStore'
import { useNotifyStore } from '@/stores/notifyStore'

/**
 * 认证 + 字典预加载 loader
 * 1. 检查登录状态，未登录跳转 /login
 * 2. 若已登录且字典未加载，异步加载字典
 * 3. 加载通知计数
 */
export const authLoader = async () => {
  const { token, isLoggedIn } = useAuthStore.getState()

  // 开发模式允许无 token 访问
  if (import.meta.env.DEV && !token) {
    return null
  }

  if (!token || !isLoggedIn) {
    return redirect('/login')
  }

  // 字典预加载（与既有路由守卫等价）
  const { loaded, loadAll } = useDictStore.getState()
  if (!loaded) {
    loadAll().catch(() => {})
  }

  // 通知计数刷新
  const { refresh } = useNotifyStore.getState()
  refresh().catch(() => {})

  return null
}
