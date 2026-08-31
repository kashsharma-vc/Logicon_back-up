import { cn } from '@/lib/cn'

/** Shared desktop drawer + mobile drawer nav row — strong active affordance (gradient rail). */
export function shellNavLinkClassName(isActive: boolean) {
  return cn(
    'flex min-h-[42px] items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm transition-all duration-200',
    isActive
      ? cn(
          'border-brand-600 bg-gradient-to-r from-brand-600/22 via-brand-500/14 to-transparent font-semibold text-brand-900 shadow-sm',
          'dark:border-brand-400 dark:from-brand-500/28 dark:via-brand-600/16 dark:to-transparent dark:text-app-heading',
          'dark:shadow-[inset_0_0_0_1px_rgba(55,138,221,0.2)]',
        )
      : 'border-transparent font-medium text-nav-link hover:bg-nav-link-hover',
  )
}

export function shellNavIconClassName(isActive: boolean) {
  return cn('h-4 w-4 shrink-0', isActive && 'text-brand-600 dark:text-brand-400')
}
