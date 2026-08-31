import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const wordmarkStyle = { fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.18em' } as const

/** Logicon header strip - matches workingCampaignQRCode AdminLayout `LogoBand`. */
export function LogoBand({
  rightSlot,
  compact = false,
  className,
  tone = 'app',
}: {
  rightSlot?: ReactNode
  compact?: boolean
  className?: string
  tone?: 'app' | 'sidebar'
}) {
  return (
    <div
      className={cn(
        'flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-5',
        tone === 'sidebar' ? 'border-nav-border bg-nav-bg' : 'border-app-border bg-app-surface',
        className,
      )}
    >
      <img
        src="/LOGO-2-1.webp"
        alt="LOGICON"
        className={cn('shrink-0 object-contain', compact ? 'h-7 w-7' : 'h-9 w-9')}
      />
      <span
        style={wordmarkStyle}
        className={cn(
          compact ? 'text-sm' : 'text-base',
          tone === 'sidebar'
            ? 'font-black text-nav-wordmark'
            : 'bg-gradient-to-r from-app-heading to-brand-600 bg-clip-text font-black text-transparent',
        )}
      >
        LOGICON
      </span>
      {rightSlot ? <div className="ml-auto flex shrink-0 items-center">{rightSlot}</div> : null}
    </div>
  )
}
