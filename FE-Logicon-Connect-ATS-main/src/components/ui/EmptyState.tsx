import type { ReactNode } from 'react'

export function EmptyState({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-app-border bg-app-muted/40 px-6 py-10 text-center">
      <p className="font-medium text-app-text">{title}</p>
      {description ? <p className="mt-2 text-sm text-app-secondary">{description}</p> : null}
    </div>
  )
}




