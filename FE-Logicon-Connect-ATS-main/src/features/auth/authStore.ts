import { create } from 'zustand'
import { obtainTokenPair, refreshTokenPair, logoutApi } from '@/api/auth'
import { fetchMe } from '@/api/me'
import { readStorage, removeStorage, storageKeys, writeStorage } from '@/lib/storage'
import type { MeResponse } from '@/types/api'


function loadPersistedTokens(): { access: string | null; refresh: string | null } {
  return {
    access: readStorage(storageKeys.accessToken),
    refresh: readStorage(storageKeys.refreshToken),
  }
}

const initialTokens = loadPersistedTokens()

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  me: MeResponse | null
  bootstrapped: boolean
  meLoading: boolean
  meError: string | null
  loginError: string | null
  isAuthenticated: boolean

  setTokens: (access: string, refresh: string) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loadMe: () => Promise<void>
  refreshAccessToken: () => Promise<boolean>
  markBootstrapped: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: initialTokens.access,
  refreshToken: initialTokens.refresh,
  me: null,
  bootstrapped: false,
  meLoading: false,
  meError: null,
  loginError: null,
  isAuthenticated: !!initialTokens.access,

  setTokens: (access, refresh) => {
    writeStorage(storageKeys.accessToken, access)
    writeStorage(storageKeys.refreshToken, refresh)
    set({
      accessToken: access,
      refreshToken: refresh,
      isAuthenticated: true,
    })
  },

  markBootstrapped: () => set({ bootstrapped: true }),

  login: async (email, password) => {
    set({ loginError: null })
    try {
      const pair = await obtainTokenPair(email, password)
      get().setTokens(pair.access, pair.refresh)
      await get().loadMe()
    } catch (e: unknown) {
      const status =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { status?: number } }).response?.status
          : undefined
      const message =
        status === 401 || status === 400
          ? 'Invalid email or password.'
          : status != null
            ? 'Could not sign in. Try again.'
            : 'Could not sign in. Check your connection.'
      set({ loginError: message })
      throw new Error(message)
    }
  },

  logout: async () => {
    try {
      await logoutApi()
    } catch (e) {
      console.error("Failed to notify backend of logout:", e)
    }
    removeStorage(storageKeys.accessToken)
    removeStorage(storageKeys.refreshToken)
    set({
      accessToken: null,
      refreshToken: null,
      me: null,
      isAuthenticated: false,
      meError: null,
      loginError: null,
    })
  },

  loadMe: async () => {
    const { accessToken } = get()
    if (!accessToken) {
      set({ me: null, meLoading: false })
      return
    }
    set({ meLoading: true, meError: null })
    try {
      const me = await fetchMe()
      set({ me, meLoading: false })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load profile'
      set({ me: null, meLoading: false, meError: message })
    }
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get()
    if (!refreshToken) {
      return false
    }
    try {
      const pair = await refreshTokenPair(refreshToken)
      get().setTokens(pair.access, pair.refresh ?? refreshToken)
      return true
    } catch {
      return false
    }
  },
}))




