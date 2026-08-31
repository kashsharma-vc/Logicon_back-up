import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

const variants = {
  primary:
    'bg-[var(--color-btn-primary)] text-white hover:bg-[var(--color-btn-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 focus-visible:ring-offset-app-bg',
  secondary:
    'border border-app-border bg-app-surface text-app-text hover:bg-app-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
  ghost:
    'text-[var(--color-btn-ghost-fg)] hover:bg-[var(--color-btn-ghost-hover-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
  danger:
    'bg-status-danger text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  children: ReactNode
}

export function Button({ variant = 'primary', className, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-10 items-center justify-center rounded-panel px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}




