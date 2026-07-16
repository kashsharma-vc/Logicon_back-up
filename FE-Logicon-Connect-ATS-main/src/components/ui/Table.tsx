import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-panel border border-app-border bg-app-surface shadow-panel', className)}>
      <table className="w-full min-w-[900px] border-collapse text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b-2 border-brand-500 bg-app-surface text-xs font-bold uppercase tracking-wider text-brand-700 dark:border-brand-400 dark:text-brand-300">
      {children}
    </thead>
  )
}

export function TH({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 text-left', className)}>{children}</th>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-app-border">{children}</tbody>
}

export function TR({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-app-muted/60', className)} {...props}>
      {children}
    </tr>
  )
}

export function TD({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-top', className)} {...props}>
      {children}
    </td>
  )
}




