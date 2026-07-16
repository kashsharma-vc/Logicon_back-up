import { cn } from '@/lib/cn'

export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-app-border border-t-brand-600"
        role="status"
        aria-live="polite"
      />
      {label ? <p className="text-sm text-app-secondary">{label}</p> : null}
    </div>
  )
}




