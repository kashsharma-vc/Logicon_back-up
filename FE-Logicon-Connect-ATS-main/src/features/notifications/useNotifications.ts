/**
 * Notifications store with polling support
 */
import { useCallback, useEffect, useState } from 'react'
import { create } from 'zustand'
import {
  getNotificationUnreadCount,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api/notifications'
import type { NotificationRow, UnreadByArea } from '@/features/notifications/types'
import { useAuthStore } from '@/features/auth/authStore'

interface NotificationState {
  notifications: NotificationRow[]
  unreadCount: number
  unreadByArea: UnreadByArea
  loading: boolean
  error: string | null
  lastFetched: number | null
  setNotifications: (notifications: NotificationRow[]) => void
  setUnreadCount: (count: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateUnreadByArea: (notifications: NotificationRow[]) => void
  markOneRead: (id: number) => void
  clearAll: () => void
}

function computeUnreadByArea(notifications: NotificationRow[]): UnreadByArea {
  const areas: UnreadByArea = {
    workflow: 0,
    sales: 0,
    operationsSurveys: 0,
    mobilisation: 0,
    mrf: 0,
  }

  for (const n of notifications) {
    if (n.is_read) continue

    // Check target_type first for specific routing
    if (n.target_type === 'mrf') {
      areas.mrf++
      continue
    }

    // Then check notification_type
    switch (n.notification_type) {
      case 'workflow_task_assigned':
      case 'workflow_completed':
        areas.workflow++
        break
      case 'sales_survey_assigned':
        areas.operationsSurveys++
        break
      case 'sales_survey_completed':
        areas.sales++
        break
      case 'mobilisation_operations_assigned':
      case 'mobilisation_setup_completed':
        areas.mobilisation++
        break
      // system and other types don't count toward sidebar badges
    }
  }

  return areas
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  unreadByArea: {
    workflow: 0,
    sales: 0,
    operationsSurveys: 0,
    mobilisation: 0,
    mrf: 0,
  },
  loading: false,
  error: null,
  lastFetched: null,

  setNotifications: (notifications) => {
    set({ notifications, lastFetched: Date.now() })
    get().updateUnreadByArea(notifications)
  },

  setUnreadCount: (count) => set({ unreadCount: count }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  updateUnreadByArea: (notifications) => {
    const unreadByArea = computeUnreadByArea(notifications)
    set({ unreadByArea })
  },

  markOneRead: (id) => {
    const { notifications } = get()
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
    )
    set({ notifications: updated })
    get().updateUnreadByArea(updated)
    // Decrement unread count
    const current = get().unreadCount
    if (current > 0) set({ unreadCount: current - 1 })
  },

  clearAll: () => {
    set({
      notifications: [],
      unreadCount: 0,
      unreadByArea: {
        workflow: 0,
        sales: 0,
        operationsSurveys: 0,
        mobilisation: 0,
        mrf: 0,
      },
      error: null,
    })
  },
}))

/**
 * Hook for components to use notifications.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const unreadByArea = useNotificationStore((s) => s.unreadByArea)
  const loading = useNotificationStore((s) => s.loading)
  const error = useNotificationStore((s) => s.error)
  const setNotifications = useNotificationStore((s) => s.setNotifications)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const setError = useNotificationStore((s) => s.setError)
  const markOneRead = useNotificationStore((s) => s.markOneRead)
  const clearAll = useNotificationStore((s) => s.clearAll)
  const [dropdownLoading, setDropdownLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return
    setDropdownLoading(true)
    setError(null)
    try {
      const [res, unread] = await Promise.all([
        listNotifications({ page: 1 }),
        getNotificationUnreadCount(),
      ])
      // Take only latest 10 for dropdown
      const items = res.items.slice(0, 10)
      setNotifications(items)
      setUnreadCount(unread.unread_count)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load notifications'
      setError(msg)
    } finally {
      setDropdownLoading(false)
    }
  }, [isAuthenticated, setError, setNotifications, setUnreadCount])

  const refresh = useCallback(async () => {
    await fetchNotifications()
  }, [fetchNotifications])

  const markRead = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await markNotificationRead(id)
        markOneRead(id)
        return true
      } catch {
        setError('Failed to mark notification as read')
        return false
      }
    },
    [markOneRead, setError]
  )

  const markAllRead = useCallback(async (): Promise<boolean> => {
    try {
      await markAllNotificationsRead()
      // Optimistically update local state
      const updated = notifications.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      }))
      setNotifications(updated)
      setUnreadCount(0)
      return true
    } catch {
      setError('Failed to mark all as read')
      return false
    }
  }, [notifications, setError, setNotifications, setUnreadCount])

  useEffect(() => {
    if (!isAuthenticated) {
      clearAll()
    }
  }, [isAuthenticated, clearAll])

  return {
    notifications,
    unreadCount,
    unreadByArea,
    loading: loading || dropdownLoading,
    error,
    refresh,
    fetchNotifications,
    markRead,
    markAllRead,
  }
}
