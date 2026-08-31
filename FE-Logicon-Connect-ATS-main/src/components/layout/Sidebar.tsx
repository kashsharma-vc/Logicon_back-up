import { NavLink, useLocation } from 'react-router-dom'
import { Activity, MapPin, FileText, Settings, Database, Clock } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { buildNavGroups } from '@/components/layout/navConfig'
import { cn } from '@/lib/cn'
import { shellNavIconClassName, shellNavLinkClassName } from '@/components/layout/navLinkStyles'
import { useNotificationStore } from '@/features/notifications/useNotifications'
import type { UnreadByArea } from '@/features/notifications/types'

import { getNavPersona } from '@/lib/userRoleMode'

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
  // Special handling for /candidates - don't match review-queue
  if (itemPath === '/candidates') {
    if (currentPath === '/candidates') return true
    if (currentPath.startsWith('/candidates/')) {
      const rest = currentPath.slice('/candidates/'.length)
      // Only match if it's a numeric ID (detail page), not another nested route
      return /^\d+$/.test(rest)
    }
    return false
  }
  // Return undefined to let NavLink use default matching
  return undefined
}

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const me = useAuthStore((s) => s.me)
  const unreadByArea = useNotificationStore((s) => s.unreadByArea)
  const location = useLocation()

  const visibleGroups = buildNavGroups(me)

  return (
    <aside
      className={cn(
        'app-sidebar flex h-full min-h-0 w-[15rem] shrink-0 flex-col border-r border-nav-border bg-nav-bg shadow-nav-inset',
        className,
      )}
    >
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 pt-4" aria-label="Main">
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
                    onClick={onNavigate}
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
        {/* Field Tracking Links */}
        {(getNavPersona(me) === 'admin' || getNavPersona(me) === 'operations') && (
          <div key="FieldTracking">
            <div className="mb-2 flex items-center gap-2 px-3">
              <span className="h-4 w-0.5 animate-pulse rounded-full bg-brand-500" aria-hidden />
              <p className="text-[11px] font-bold uppercase tracking-wider text-nav-label/90">Field Tracking</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <NavLink
                to="/attendance-dashboard"
                onClick={onNavigate}
                className={({ isActive }) => shellNavLinkClassName(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <Clock className={shellNavIconClassName(isActive)} aria-hidden />
                    <span className="truncate">Attendance Dashboard</span>
                  </>
                )}
              </NavLink>
              
              <NavLink
                to="/field-tracking"
                end
                onClick={onNavigate}
                className={({ isActive }) => shellNavLinkClassName(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <Activity className={shellNavIconClassName(isActive)} aria-hidden />
                    <span className="truncate">Tracking Dashboard</span>
                  </>
                )}
              </NavLink>
              <NavLink
                to="/field-tracking/tracking-sites"
                onClick={onNavigate}
                className={({ isActive }) => shellNavLinkClassName(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <MapPin className={shellNavIconClassName(isActive)} aria-hidden />
                    <span className="truncate">Tracking Sites</span>
                  </>
                )}
              </NavLink>
              <NavLink
                to="/field-tracking/tracking-history"
                onClick={onNavigate}
                className={({ isActive }) => shellNavLinkClassName(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <FileText className={shellNavIconClassName(isActive)} aria-hidden />
                    <span className="truncate">Route History</span>
                  </>
                )}
              </NavLink>
              <NavLink
                to="/field-tracking/audit-logs"
                onClick={onNavigate}
                className={({ isActive }) => shellNavLinkClassName(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <Database className={shellNavIconClassName(isActive)} aria-hidden />
                    <span className="truncate">Audit Logs</span>
                  </>
                )}
              </NavLink>
              <NavLink
                to="/field-tracking/master-setup"
                onClick={onNavigate}
                className={({ isActive }) => shellNavLinkClassName(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <Settings className={shellNavIconClassName(isActive)} aria-hidden />
                    <span className="truncate">Master Setup</span>
                  </>
                )}
              </NavLink>
            </div>
          </div>
        )}
      </nav>
    </aside>
  )
}
