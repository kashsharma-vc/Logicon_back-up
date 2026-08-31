import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const variants = {
  neutral: 'bg-app-muted text-app-secondary border-app-border',
  info: 'bg-brand-600/10 text-brand-700 border-brand-600/20',
  success: 'bg-status-success/10 text-status-hired border-status-success/25',
  warning: 'bg-status-warning/15 text-status-warning border-status-warning/25',
  danger: 'bg-status-danger/10 text-status-danger border-status-danger/25',
  attention: 'bg-status-attention/10 text-status-attention border-status-attention/25',
} as const

export function Badge({
  variant = 'neutral',
  className,
  children,
}: {
  variant?: keyof typeof variants
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}




