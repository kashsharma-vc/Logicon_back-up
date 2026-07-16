import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { api, isAuthRequestUrl } from '@/api/client'
import { useAuthStore } from '@/features/auth/authStore'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let refreshPromise: Promise<boolean> | null = null

async function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        return await useAuthStore.getState().refreshAccessToken()
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

function redirectLogin(): void {
  const path = `${window.location.pathname}${window.location.search}`
  if (!path.startsWith('/login')) {
    window.location.replace(`/login?next=${encodeURIComponent(path)}`)
  }
}

export function setupApiInterceptors(): void {
  api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken
    const url = config.url ?? ''
    const fullUrl = `${config.baseURL ?? ''}${url}`
    if (token && !isAuthRequestUrl(fullUrl) && !isAuthRequestUrl(url)) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as RetryConfig | undefined
      const status = error.response?.status

      if (!original) {
        return Promise.reject(error)
      }

      const reqUrl = original.url ?? ''
      if (isAuthRequestUrl(reqUrl)) {
        return Promise.reject(error)
      }

      if (status !== 401 || original._retry) {
        return Promise.reject(error)
      }

      original._retry = true
      const ok = await refreshOnce()
      if (ok) {
        const token = useAuthStore.getState().accessToken
        if (token) {
          original.headers.Authorization = `Bearer ${token}`
        }
        return api(original)
      }

      useAuthStore.getState().logout()
      redirectLogin()
      return Promise.reject(error)
    },
  )
}




