import { CalendarDays, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { cn } from '@/lib/cn'

const wordmarkStyle = { fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.18em' } as const

/** Matches login / product positioning — single source for header strapline */
const TOPBAR_TAGLINE = 'Enterprise ATS & workforce'

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <img
        src="/LOGO-2-1.webp"
        alt="Logicon"
        className={compact ? 'h-7 w-7 shrink-0 object-contain' : 'h-8 w-8 shrink-0 object-contain md:h-9 md:w-9'}
      />
      <span
        style={{
          ...wordmarkStyle,
          backgroundImage: 'var(--wordmark-gradient)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }}
        className={compact ? 'shrink-0 text-sm font-black' : 'shrink-0 text-base font-black md:text-lg'}
      >
        LOGICON
      </span>
      {!compact ? (
        <>
          <span className="hidden h-5 w-px shrink-0 bg-app-border sm:block" aria-hidden />
          <p className="hidden min-w-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-subtle sm:block">
            {TOPBAR_TAGLINE}
          </p>
        </>
      ) : (
        <>
          <span className="hidden h-4 w-px shrink-0 bg-app-border sm:block" aria-hidden />
          <p className="hidden max-w-[11rem] truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-app-subtle sm:block">
            {TOPBAR_TAGLINE}
          </p>
        </>
      )}
    </div>
  )
}

function HeaderDatePlain({ compact = false }: { compact?: boolean }) {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-IN', { weekday: 'long' })
  const dateLine = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div
      className={cn(
        'flex items-center gap-2 tabular-nums',
        // Hide entire date section on very small screens to prevent overlap
        compact && 'hidden min-[420px]:flex',
      )}
      title={now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
    >
      <CalendarDays
        className={cn('shrink-0 text-app-subtle', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')}
        aria-hidden
      />
      <div className={cn('min-w-0 text-left leading-tight', compact && 'hidden min-[480px]:block')}>
        <span
          className={cn(
            'block font-medium tracking-tight text-app-secondary',
            compact ? 'max-w-[9rem] truncate text-[11px]' : 'text-xs',
          )}
        >
          {weekday}
        </span>
        <span className={cn('mt-0.5 block text-app-subtle', compact ? 'text-[10px]' : 'text-[11px]')}>{dateLine}</span>
      </div>
    </div>
  )
}

function HeaderActions({ onLogout, compact = false }: { onLogout: () => void; compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {compact ? <HeaderDatePlain compact /> : <HeaderDatePlain />}
      <NotificationBell compact={compact} />
      <ThemeToggle />
      <Button
        type="button"
        variant="secondary"
        onClick={onLogout}
        className={cn(
          'whitespace-nowrap border-brand-600/25 font-medium text-app-heading shadow-none hover:border-brand-600/40 hover:bg-app-muted/90 dark:border-app-border dark:hover:bg-app-muted/40',
          'gap-1.5',
          compact ? 'min-h-9 px-2.5 py-2 text-xs sm:px-3.5 sm:text-sm' : 'min-h-9 px-3.5 py-2 text-sm',
        )}
      >
        <LogOut className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden />
        Log out
      </Button>
    </div>
  )
}

export function Topbar({
  onLogout,
}: {
  onLogout: () => void
}) {
  return (
    <>
      {/* Mobile — aligned with workingCampaignQRCode AdminLayout mobile header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-app-border bg-app-surface px-3 shadow-panel sm:gap-3 sm:px-4 lg:hidden">
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          <BrandBlock compact />
        </div>
        <HeaderActions onLogout={onLogout} compact />
      </header>

      {/* Desktop — full-width brand + strapline (no breadcrumb) */}
      <header className="hidden h-16 shrink-0 items-center justify-between border-b border-app-border bg-app-surface px-6 shadow-panel lg:flex">
        <BrandBlock />
        <HeaderActions onLogout={onLogout} />
      </header>
    </>
  )
}


