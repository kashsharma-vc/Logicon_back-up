import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyTheme, getStoredTheme, toggleTheme, type Theme } from '@/lib/theme'

/** Sliding switch — same interaction as workingCampaignQRCode `ThemeToggle`. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const initialTheme = getStoredTheme()
    applyTheme(initialTheme)
    setTheme(initialTheme)
  }, [])

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme((current) => toggleTheme(current))}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`relative flex h-7 w-[52px] shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ${className ?? ''} ${
        isDark ? 'bg-brand-900' : 'bg-app-muted'
      }`}
    >
      <Sun
        className={`absolute left-1.5 h-3 w-3 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-40 text-status-warning'}`}
        aria-hidden
      />
      <Moon
        className={`absolute right-1.5 h-3 w-3 transition-opacity duration-300 ${isDark ? 'opacity-40 text-brand-500' : 'opacity-0'}`}
        aria-hidden
      />

      <span
        className={`absolute flex h-[22px] w-[22px] items-center justify-center rounded-full bg-app-surface shadow-panel transition-all duration-300 dark:bg-app-surface ${
          isDark ? 'translate-x-[27px]' : 'translate-x-[3px]'
        }`}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-brand-700 dark:text-brand-600" aria-hidden />
        ) : (
          <Sun className="h-3 w-3 text-status-warning" aria-hidden />
        )}
      </span>
    </button>
  )
}



