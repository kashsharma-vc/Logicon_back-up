import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/features/auth/authStore'
import { buildNavGroups } from '@/components/layout/navConfig'
import { Button } from '@/components/ui/Button'

interface MobileExploreSheetProps {
  open: boolean
  onClose: () => void
}

export function MobileExploreSheet({ open, onClose }: MobileExploreSheetProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const me = useAuthStore((s) => s.me)

  const visibleGroups = buildNavGroups(me)

  if (!open) {
    return null
  }

  function handleItemClick(path: string) {
    navigate(path)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Explore modules">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-app-text/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Sheet */}
      <aside
        className={cn(
          'absolute bottom-0 left-0 right-0 flex max-h-[80vh] flex-col',
          'rounded-t-2xl border-t border-app-border bg-app-surface shadow-panel',
          'animate-in slide-in-from-bottom duration-300'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-app-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-app-text">Explore</h2>
            <p className="text-sm text-app-secondary">Choose a module</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="min-h-9 px-2"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {visibleGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-app-secondary">
              No modules available for your access.
            </p>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.label} className="mb-5 last:mb-0">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-subtle">
                  {group.label}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`)
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => handleItemClick(item.path)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-lg p-3 transition-colors',
                          'hover:bg-app-muted',
                          isActive && 'bg-brand-600/10 ring-1 ring-brand-600'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            isActive ? 'text-brand-600 dark:text-brand-400' : 'text-app-secondary'
                          )}
                        />
                        <span
                          className={cn(
                            'text-center text-xs leading-tight',
                            isActive ? 'font-medium text-brand-600 dark:text-brand-400' : 'text-app-text'
                          )}
                        >
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
