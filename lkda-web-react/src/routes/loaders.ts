import { redirect } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export const authLoader = async () => {
  const { token } = useAuthStore.getState()
  // Allow access in development for layout testing
  if (import.meta.env.DEV && !token) {
    return null
  }
  if (!token) return redirect('/login')
  return null
}
