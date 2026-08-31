/**
 * Notifications API wrappers
 */
import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'
import type {
  NotificationRow,
  NotificationListParams,
  NotificationUnreadCount,
} from '@/features/notifications/types'

/**
 * List notifications with optional filters
 */
export async function listNotifications(
  params?: NotificationListParams
): Promise<{ items: NotificationRow[]; count?: number }> {
  const query: Record<string, string> = {}
  if (params?.is_read !== undefined) query.is_read = String(params.is_read)
  if (params?.notification_type) query.notification_type = params.notification_type
  if (params?.target_type) query.target_type = params.target_type
  if (params?.search) query.search = params.search
  if (params?.page) query.page = String(params.page)

  const { data } = await api.get<DrfPaginated<NotificationRow> | NotificationRow[]>(
    '/api/notifications/',
    { params: query }
  )
  return unwrapDrfResults(data)
}

/**
 * Get current user's unread notification count.
 */
export async function getNotificationUnreadCount(): Promise<NotificationUnreadCount> {
  const { data } = await api.get<NotificationUnreadCount>('/api/notifications/unread-count/')
  return data
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(id: number): Promise<NotificationRow> {
  const { data } = await api.post<NotificationRow>(`/api/notifications/${id}/mark-read/`)
  return data
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const { data } = await api.post<{ updated: number }>('/api/notifications/mark-all-read/')
  return data
}
