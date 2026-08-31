import { useEffect, type ReactNode } from 'react'
import { t } from '@/features/publicApply/i18n'
import type { LangCode } from '@/features/publicApply/types'

export function PublicApplyLayout({
  lang,
  campaignTitle,
  headerRight,
  children,
}: {
  lang: LangCode
  campaignTitle?: string
  headerRight?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    root.classList.remove('dark')
    return () => {
      if (wasDark) root.classList.add('dark')
    }
  }, [])

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <header className="border-b border-app-border bg-app-surface">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/LOGO-2-1.webp" alt="LOGICON" className="h-10 w-10 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-app-text">{t(lang, 'appTitle')}</p>
              {campaignTitle && (
                <p className="truncate text-xs text-app-secondary">{campaignTitle}</p>
              )}
            </div>
          </div>
          {headerRight && (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {headerRight}
            </div>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
