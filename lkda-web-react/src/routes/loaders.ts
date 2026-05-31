import { redirect } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDictStore } from '@/stores/dictStore'

export const authLoader = async () => {
  const { token } = useAuthStore.getState()
  if (!token) return redirect('/login')

  const { loaded } = useDictStore.getState()
  if (!loaded) {
    // await loadAll().catch(() => {})
  }
  return null
}
