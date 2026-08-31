import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/features/auth/authStore'

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    useAuthStore.getState().markBootstrapped()
    const { accessToken, loadMe } = useAuthStore.getState()
    if (accessToken) {
      void loadMe()
    }
  }, [])

  return children
}




