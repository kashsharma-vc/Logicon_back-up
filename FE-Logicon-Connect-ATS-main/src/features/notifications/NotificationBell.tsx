/**
 * NotificationBell component with dropdown
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, ClipboardList, ExternalLink, FileCheck2, Loader2, Users } from 'lucide-react'
import { useNotifications } from '@/features/notifications/useNotifications'
import type { NotificationRow } from '@/features/notifications/types'
import { cn } from '@/lib/cn'

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getNotificationIcon(type: string): { icon: typeof Bell; bg: string; color: string } {
  switch (type) {
    case 'workflow_task_assigned':
    case 'workflow_completed':
      return { icon: ClipboardList, bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400' }
    case 'sales_survey_assigned':
    case 'sales_survey_completed':
      return { icon: FileCheck2, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' }
    case 'mobilisation_operations_assigned':
    case 'mobilisation_setup_completed':
      return { icon: Users, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' }
    default:
      return { icon: Bell, bg: 'bg-gray-100 dark:bg-gray-800', color: 'text-gray-600 dark:text-gray-400' }
  }
}

interface NotificationItemProps {
  notification: NotificationRow
  onMarkRead: (id: number) => Promise<boolean>
  onNavigate: (url: string) => void
}

function NotificationItem({ notification, onMarkRead, onNavigate }: NotificationItemProps) {
  const [marking, setMarking] = useState(false)
  const { icon: Icon, bg, color } = getNotificationIcon(notification.notification_type)

  const handleClick = async () => {
    if (!notification.is_read) {
      setMarking(true)
      await onMarkRead(notification.id)
      setMarking(false)
    }
    if (notification.target_url) {
      onNavigate(notification.target_url)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        notification.is_read
          ? 'bg-transparent hover:bg-app-muted/50'
          : 'bg-brand-50/50 hover:bg-brand-100/50 dark:bg-brand-950/30 dark:hover:bg-brand-900/40'
      )}
    >
      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', bg)}>
        <Icon className={cn('h-4 w-4', color)} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm',
            notification.is_read ? 'font-medium text-app-text' : 'font-semibold text-app-heading'
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-app-secondary">{notification.message}</p>
        <p className="mt-1 text-[10px] text-app-subtle">{formatRelativeTime(notification.created_at)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {marking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-app-subtle" />
        ) : !notification.is_read ? (
          <span className="h-2 w-2 rounded-full bg-brand-500" title="Unread" />
        ) : (
          <span title="Read">
            <Check className="h-3.5 w-3.5 text-green-500" />
          </span>
        )}
        {notification.target_url ? (
          <ExternalLink className="h-3 w-3 text-app-subtle" />
        ) : null}
      </div>
    </button>
  )
}

interface NotificationBellProps {
  compact?: boolean
}

export function NotificationBell({ compact = false }: NotificationBellProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Close dropdown on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleToggle = useCallback(() => {
    if (!open) {
      // Fetch fresh notifications when opening
      void fetchNotifications()
    }
    setOpen((prev) => !prev)
  }, [open, fetchNotifications])

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true)
    await markAllRead()
    setMarkingAll(false)
  }, [markAllRead])

  const handleNavigate = useCallback(
    (url: string) => {
      setOpen(false)
      navigate(url)
    },
    [navigate]
  )

  const displayCount = unreadCount > 99 ? '99+' : unreadCount

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          'relative flex items-center justify-center rounded-full text-app-secondary transition-all hover:text-app-text hover:bg-app-muted/50',
          compact ? 'h-9 w-9' : 'h-10 w-10'
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className={compact ? 'h-5 w-5' : 'h-6 w-6'} />

        {/* Unread badge */}
        {unreadCount > 0 ? (
          <>
            <span
              className={cn(
                'absolute flex items-center justify-center rounded-full bg-red-500 font-bold text-white shadow-sm',
                compact ? '-right-1 -top-1 min-w-[18px] px-1 text-[10px]' : '-right-1.5 -top-1.5 min-w-[20px] px-1.5 text-[11px]'
              )}
            >
              {displayCount}
            </span>
            {/* Pulse ring for unread */}
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-red-400 opacity-75" />
          </>
        ) : null}
      </button>

      {/* Dropdown */}
      {open ? (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-lg sm:w-96"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
            <h3 className="text-sm font-semibold text-app-heading">Notifications</h3>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-brand-950"
              >
                {markingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                Mark all read
              </button>
            ) : null}
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchNotifications()}
                  className="mt-2 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-app-subtle" />
                <p className="mt-2 text-sm text-app-secondary">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-app-border">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={markRead}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 ? (
            <div className="border-t border-app-border px-4 py-2">
              <button
                type="button"
                onClick={() => handleNavigate('/notifications')}
                className="w-full rounded-lg py-2 text-center text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
              >
                View all notifications
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
