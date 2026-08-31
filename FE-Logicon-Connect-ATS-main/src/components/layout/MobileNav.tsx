import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { buildNavGroups } from '@/components/layout/navConfig'
import { LogoBand } from '@/components/brand/LogoBand'
import { shellNavIconClassName, shellNavLinkClassName } from '@/components/layout/navLinkStyles'
import { useNotificationStore } from '@/features/notifications/useNotifications'
import type { UnreadByArea } from '@/features/notifications/types'
import { X } from 'lucide-react'

/** Maps nav paths to notification area keys */
function getUnreadCountForPath(path: string, unreadByArea: UnreadByArea): number {
  switch (path) {
    case '/my-tasks':
      return unreadByArea.workflow
    case '/sales/operations-surveys':
      return unreadByArea.operationsSurveys
    case '/sales/dashboard':
    case '/sales/leads':
      return unreadByArea.sales
    case '/mobilisation':
      return unreadByArea.mobilisation
    case '/mrf':
      return unreadByArea.mrf
    default:
      return 0
  }
}

function NavBadge({ count }: { count: number }) {
  if (count === 0) return null
  const display = count > 9 ? '9+' : count
  return (
    <span className="relative ml-auto flex items-center">
      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
        {display}
      </span>
      <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-50" />
    </span>
  )
}

/**
 * Custom active state checker for paths with special sibling route handling.
 * - /candidates should be active on /candidates and /candidates/:id (numeric)
 *   but NOT on /candidates/review-queue
 */
function isNavItemActive(itemPath: string, currentPath: string): boolean | undefined {
  if (itemPath === '/candidates') {
    if (currentPath === '/candidates') return true
    if (currentPath.startsWith('/candidates/')) {
      const rest = currentPath.slice('/candidates/'.length)
      return /^\d+$/.test(rest)
    }
    return false
  }
  return undefined
}

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const me = useAuthStore((s) => s.me)
  const unreadByArea = useNotificationStore((s) => s.unreadByArea)
  const location = useLocation()

  const visibleGroups = buildNavGroups(me)

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <button
        type="button"
        className="absolute inset-0 bg-nav-overlay backdrop-blur-[2px]"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className="app-sidebar absolute left-0 top-0 flex h-full min-h-0 w-[15rem] flex-col border-r border-nav-border bg-nav-bg shadow-nav-drawer">
        <LogoBand
          tone="sidebar"
          compact
          rightSlot={
            <button
              type="button"
              className="inline-flex min-h-9 items-center justify-center rounded-panel px-2 text-nav-wordmark transition-colors hover:bg-nav-icon-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-nav"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          }
        />
        <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 pt-3" aria-label="Main">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 flex items-center gap-2 px-3">
                <span className="h-4 w-0.5 animate-pulse rounded-full bg-brand-500" aria-hidden />
                <p className="text-[11px] font-bold uppercase tracking-wider text-nav-label/90">{group.label}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const unreadCount = getUnreadCountForPath(item.path, unreadByArea)
                  const customActive = isNavItemActive(item.path, location.pathname)
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) => {
                        const active = customActive !== undefined ? customActive : isActive
                        return shellNavLinkClassName(active)
                      }}
                    >
                      {({ isActive }) => {
                        const active = customActive !== undefined ? customActive : isActive
                        return (
                          <>
                            <item.icon className={shellNavIconClassName(active)} aria-hidden />
                            <span className="truncate">{item.label}</span>
                            <NavBadge count={unreadCount} />
                          </>
                        )
                      }}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  )
}
