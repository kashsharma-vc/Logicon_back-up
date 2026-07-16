import { Link } from 'react-router-dom'

interface SectionHeaderProps {
  title: string
  ctaLabel?: string
  ctaTo?: string
}

export function SectionHeader({ title, ctaLabel, ctaTo }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-app-text">{title}</h3>
      {ctaLabel && ctaTo ? (
        <Link
          to={ctaTo}
          className="text-xs font-medium text-brand-600 hover:underline shrink-0"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}
