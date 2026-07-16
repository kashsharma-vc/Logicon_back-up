import { cn } from '@/lib/cn'

interface MetricTileProps {
  label: string
  value: string | number
  subtext?: string
  className?: string
}

export function MetricTile({ label, value, subtext, className }: MetricTileProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-xs text-app-secondary">{label}</span>
      <span className="text-xl font-semibold tabular-nums text-app-text leading-tight">{value}</span>
      {subtext ? <span className="text-xs text-app-subtle">{subtext}</span> : null}
    </div>
  )
}
