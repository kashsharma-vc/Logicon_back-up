/**
 * Contextual notification banner for pages
 * Shows a dismissible banner when there are unread notifications for the current area
 */
import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useNotificationStore } from '@/features/notifications/useNotifications'
import type { UnreadByArea } from '@/features/notifications/types'
import { cn } from '@/lib/cn'

type NotificationArea = keyof UnreadByArea

interface NotificationBannerProps {
  /** Which notification area to check */
  area: NotificationArea
  /** Custom message override */
  message?: string
  /** Additional CSS classes */
  className?: string
}

function getDefaultMessage(area: NotificationArea, count: number): string {
  const plural = count === 1 ? '' : 's'
  switch (area) {
    case 'workflow':
      return `You have ${count} new task${plural} awaiting your attention`
    case 'sales':
      return `You have ${count} new sales update${plural}`
    case 'operationsSurveys':
      return `You have ${count} new survey${plural} pending`
    case 'mobilisation':
      return `You have ${count} new mobilisation update${plural}`
    case 'mrf':
      return `You have ${count} new MRF notification${plural}`
    default:
      return `You have ${count} new notification${plural}`
  }
}

export function NotificationBanner({ area, message, className }: NotificationBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const unreadByArea = useNotificationStore((s) => s.unreadByArea)

  const count = unreadByArea[area]

  if (count === 0 || dismissed) {
    return null
  }

  const displayMessage = message ?? getDefaultMessage(area, count)

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-brand-100/50 px-4 py-3 shadow-sm dark:border-brand-800 dark:from-brand-950 dark:to-brand-900/50',
        className
      )}
      role="alert"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
        <Bell className="h-4 w-4 text-brand-600 dark:text-brand-400" />
      </div>
      <p className="flex-1 text-sm font-medium text-brand-800 dark:text-brand-200">
        {displayMessage}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-brand-600 transition-colors hover:bg-brand-200/50 dark:text-brand-400 dark:hover:bg-brand-800/50"
        aria-label="Dismiss notification banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
