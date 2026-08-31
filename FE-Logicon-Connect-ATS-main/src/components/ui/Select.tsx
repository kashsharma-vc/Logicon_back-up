import type { SelectHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  children: ReactNode
}

export function Select({ id, label, error, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-app-secondary">
        {label}
      </label>
      <select
        id={id}
        className={cn(
          'min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
          error && 'border-status-danger',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-status-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}




