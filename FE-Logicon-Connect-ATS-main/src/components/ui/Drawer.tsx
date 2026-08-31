import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export function Drawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  panelClassName,
}: {
  open: boolean
  title: ReactNode
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Override default `max-w-[520px]` for wide panels (e.g. workflow task review). */
  panelClassName?: string
}) {
  if (!open) {
    return null
  }

  const ariaLabel = typeof title === 'string' ? title : 'Dialog'

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <button type="button" className="absolute inset-0 bg-app-text/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" />
      <aside
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-app-border bg-app-surface shadow-panel',
          panelClassName,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-app-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-app-text">{title}</h2>
            {description ? <p className="mt-1 text-sm text-app-secondary">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" className="min-h-9 px-2" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? <div className="shrink-0 border-t border-app-border bg-app-surface px-5 py-4">{footer}</div> : null}
      </aside>
    </div>
  )
}




