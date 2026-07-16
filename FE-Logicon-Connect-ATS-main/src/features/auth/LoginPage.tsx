import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowRight, ClipboardList, Eye, EyeOff, QrCode, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/lib/cn'

const wordmarkStyle = { fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.18em' } as const

const features = [
  {
    icon: QrCode,
    title: 'Campaigns & intake',
    description:
      'Launch QR hiring campaigns and capture applications with structured, mobile-friendly intake.',
  },
  {
    icon: ClipboardList,
    title: 'Operational visibility',
    description:
      'Track manpower requests, submissions, and pipeline status from one operations console.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & compliant',
    description:
      'Capability-based access and scoped assignments help keep workforce data protected.',
  },
] as const

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const accessToken = useAuthStore((s) => s.accessToken)
  const login = useAuthStore((s) => s.login)
  const loginError = useAuthStore((s) => s.loginError)
  const location = useLocation()
  const [params] = useSearchParams()

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
  const nextParam = params.get('next')
  const redirectTo = nextParam && nextParam.startsWith('/') ? nextParam : from ?? '/dashboard'

  const emailFormatError = useMemo(() => {
    const t = email.trim()
    if (!t) return null
    return isValidEmail(t) ? null : 'Enter a valid email address.'
  }, [email])

  if (accessToken) {
    return <Navigate to={redirectTo} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setFieldError('Email is required.')
      return
    }
    if (!password) {
      setFieldError('Password is required.')
      return
    }
    if (!isValidEmail(trimmedEmail)) {
      setFieldError('Enter a valid email address.')
      return
    }
    setFieldError(null)
    setSubmitting(true)
    try {
      await login(trimmedEmail, password)
    } catch {
      /* loginError set in store */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page-static grid min-h-screen grid-cols-1 bg-brand-900 lg:grid-cols-2">
      {/* Features section - hidden on mobile for app-like feel */}
      <section
        className={cn(
          'order-2 hidden flex-col justify-center bg-white px-6 py-12',
          'text-app-text lg:order-1 lg:flex lg:px-10 xl:px-16',
        )}
      >
        <div className="mx-auto w-full max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app-subtle">
            Enterprise ATS &amp; workforce
          </p>

          <div className="mt-6 flex items-center gap-3 sm:gap-4">
            <img
              src="/LOGO-2-1.webp"
              alt="Logicon"
              className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12"
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
              className="text-xl font-black sm:text-2xl"
            >
              LOGICON
            </span>
          </div>

          <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-app-heading sm:text-4xl">
            Streamline hiring and workforce operations
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-app-text">
            Manage campaigns, intake, manpower requests, and organization access — all in one Logicon
            operations platform.
          </p>

          <ul className="mt-10 flex flex-col gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-app-accent text-brand-600"
                  aria-hidden
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-semibold text-app-heading">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-app-secondary">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Login form section - app-like on mobile */}
      <section
        className={cn(
          'order-1 flex min-h-screen flex-col justify-center bg-brand-900 px-6 py-12 sm:px-10',
          'lg:order-2 lg:min-h-0 lg:py-16 xl:px-14',
          // Safe area padding for notched phones
          'pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]',
          'lg:pb-16 lg:pt-16',
        )}
      >
        <div
          className={cn(
            'mx-auto w-full max-w-md',
            // Entrance animation
            'transition-all duration-500 ease-out',
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
        >
          {/* Mobile logo - only visible on mobile for app feel */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <img
              src="/LOGO-2-1.webp"
              alt="Logicon"
              className="h-16 w-16 object-contain"
            />
            <span
              style={{
                ...wordmarkStyle,
                color: 'white',
              }}
              className="mt-3 text-2xl font-black tracking-wider"
            >
              LOGICON
            </span>
          </div>

          <h2 className="text-center text-2xl font-bold text-white lg:text-left">Welcome back</h2>
          <p className="mt-2 text-center text-sm text-[var(--login-rail-subtle)] lg:text-left">
            Sign in to continue
          </p>
          {/* Desktop-only hint */}
          <p className="mt-1 hidden text-xs text-[var(--login-rail-subtle)] lg:block">
            Use the invite email to set your password before signing in.
          </p>

          {loginError ? (
            <div className="mt-8">
              <ErrorState message={loginError} />
            </div>
          ) : null}

          {fieldError ? (
            <div className={cn('mt-8', loginError && 'mt-4')}>
              <ErrorState message={fieldError} />
            </div>
          ) : null}

          <form
            onSubmit={onSubmit}
            className={cn('mt-8 flex flex-col gap-5', (loginError || fieldError) && 'mt-6')}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-white/90">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(ev) => {
                  setEmail(ev.target.value)
                  setFieldError(null)
                }}
                required
                disabled={submitting}
                className="min-h-12 w-full rounded-full border border-white/25 bg-app-accent px-5 py-3 text-sm text-neutral-950 caret-neutral-950 shadow-sm placeholder:text-slate-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/45 disabled:opacity-60"
                placeholder="you@company.com"
                aria-invalid={!!emailFormatError}
                aria-describedby={emailFormatError ? 'email-error' : undefined}
              />
              {emailFormatError ? (
                <p id="email-error" className="text-xs text-red-200">
                  {emailFormatError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-white/90">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => {
                    setPassword(ev.target.value)
                    setFieldError(null)
                  }}
                  required
                  disabled={submitting}
                  className="min-h-12 w-full rounded-full border border-white/25 bg-app-accent py-3 pl-5 pr-12 text-sm text-neutral-950 caret-neutral-950 shadow-sm placeholder:text-slate-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/45 disabled:opacity-60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-brand-900 shadow-md transition hover:bg-white/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                'Signing in...'
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
