import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type SectionTone = 'site' | 'roles' | 'details' | 'approval'

export const SECTION_TONES: Record<
  SectionTone,
  { header: string; body: string; title: string }
> = {
  site: {
    header: 'border-brand-200/70 bg-brand-100/70 dark:border-brand-800/50 dark:bg-brand-950/40',
    body: 'bg-brand-50/50 dark:bg-brand-950/15',
    title: 'text-brand-900 dark:text-brand-100',
  },
  roles: {
    header: 'border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60',
    body: 'bg-slate-50/90 dark:bg-slate-900/25',
    title: 'text-slate-800 dark:text-slate-100',
  },
  details: {
    header: 'border-violet-200/70 bg-violet-100/60 dark:border-violet-800/50 dark:bg-violet-950/40',
    body: 'bg-violet-50/40 dark:bg-violet-950/15',
    title: 'text-violet-900 dark:text-violet-100',
  },
  approval: {
    header: 'border-amber-200/70 bg-amber-100/60 dark:border-amber-800/50 dark:bg-amber-950/40',
    body: 'bg-amber-50/40 dark:bg-amber-950/15',
    title: 'text-amber-900 dark:text-amber-100',
  },
}

export function MrfSectionPanel({
  title,
  tone,
  children,
}: {
  title: string
  tone: SectionTone
  children: ReactNode
}) {
  const styles = SECTION_TONES[tone]

  return (
    <section className="overflow-hidden rounded-lg border border-app-border">
      <div className={cn('border-b px-4 py-2.5', styles.header)}>
        <h3 className={cn('text-xs font-semibold uppercase tracking-wider', styles.title)}>
          {title}
        </h3>
      </div>
      <div className={cn('space-y-4 p-4', styles.body)}>{children}</div>
    </section>
  )
}

export function SummaryWidgets({
  headcount,
  amount,
}: {
  headcount: number
  amount: string
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/60 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/25">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80">
          Total headcount
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-app-text">{headcount}</p>
      </div>
      <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/60 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/25">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80">
          Est. monthly
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-app-text">{amount}</p>
      </div>
    </div>
  )
}

export function DetailField({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">{label}</p>
      <div className="mt-1 text-sm text-app-text">{value}</div>
    </div>
  )
}
