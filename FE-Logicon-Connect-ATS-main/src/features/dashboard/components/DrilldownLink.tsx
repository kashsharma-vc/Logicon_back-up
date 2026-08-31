import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface DrilldownLinkProps {
  url?: string
  className?: string
  children: ReactNode
  title?: string
}

/** Renders a router Link only when url is present; otherwise a static wrapper. */
export function DrilldownLink({ url, className, children, title }: DrilldownLinkProps) {
  if (!url) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    )
  }

  return (
    <Link
      to={url}
      className={cn('hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm', className)}
      title={title}
    >
      {children}
    </Link>
  )
}
