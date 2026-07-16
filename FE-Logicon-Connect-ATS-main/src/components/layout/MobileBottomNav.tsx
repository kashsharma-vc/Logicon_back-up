import { NavLink, useLocation } from 'react-router-dom'
import { Home, LayoutGrid, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/features/auth/authStore'
import { buildNavGroups } from '@/components/layout/navConfig'

interface MobileBottomNavProps {
  onExploreClick: () => void
  showTasks: boolean
}

export function MobileBottomNav({ onExploreClick, showTasks }: MobileBottomNavProps) {
  const { pathname } = useLocation()
  const me = useAuthStore((s) => s.me)

  const visibleGroups = buildNavGroups(me)
  const allItems = visibleGroups.flatMap((g) => g.items)

  // Active state calculations
  const homeActive = pathname === '/dashboard' || pathname === '/'
  const tasksActive = pathname === '/my-tasks' || pathname.startsWith('/my-tasks/')
  const exploreActive =
    !homeActive &&
    !tasksActive &&
    allItems.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-nav-border bg-nav-bg lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      {/* Home */}
      <NavLink
        to="/dashboard"
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-1 py-2.5',
          homeActive ? 'text-brand-600 dark:text-brand-400' : 'text-nav-link'
        )}
      >
        <Home className="h-5 w-5" />
        <span className="text-[11px] font-medium">Home</span>
      </NavLink>

      {/* Explore */}
      <button
        type="button"
        onClick={onExploreClick}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-1 py-2.5',
          exploreActive ? 'text-brand-600 dark:text-brand-400' : 'text-nav-link'
        )}
        aria-haspopup="dialog"
      >
        <LayoutGrid className="h-5 w-5" />
        <span className="text-[11px] font-medium">Explore</span>
      </button>

      {/* Tasks - only if available in persona nav */}
      {showTasks && (
        <NavLink
          to="/my-tasks"
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-2.5',
            tasksActive ? 'text-brand-600 dark:text-brand-400' : 'text-nav-link'
          )}
        >
          <Inbox className="h-5 w-5" />
          <span className="text-[11px] font-medium">Tasks</span>
        </NavLink>
      )}
    </nav>
  )
}
