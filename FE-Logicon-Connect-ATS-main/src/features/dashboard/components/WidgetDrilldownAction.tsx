import { Link } from 'react-router-dom'

const actionClassName =
  'inline-flex min-h-9 items-center rounded-panel border border-app-border bg-app-muted px-3 py-1.5 text-xs font-medium text-app-text hover:border-brand-600 hover:text-brand-700'

interface WidgetDrilldownActionProps {
  to?: string
  label: string
  fallbackTo?: string
}

export function WidgetDrilldownAction({ to, label, fallbackTo }: WidgetDrilldownActionProps) {
  const href = to ?? fallbackTo
  if (!href) return null

  return (
    <Link to={href} className={actionClassName}>
      {label}
    </Link>
  )
}
