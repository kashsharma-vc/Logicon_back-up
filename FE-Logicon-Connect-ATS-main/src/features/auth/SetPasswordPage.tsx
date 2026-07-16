import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { setPassword as setPasswordApi } from '@/api/auth'
import { parseApiError } from '@/lib/apiError'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/lib/cn'

const MIN_PASSWORD_LENGTH = 8

function formatSetPasswordError(parsed: ReturnType<typeof parseApiError>): string {
  const { fields, message } = parsed
  const uidMsg = fields.uid?.toLowerCase() ?? ''
  const tokenMsg = fields.token?.toLowerCase() ?? ''
  if (
    fields.uid ||
    fields.token ||
    uidMsg.includes('invalid') ||
    tokenMsg.includes('invalid') ||
    tokenMsg.includes('expired')
  ) {
    return 'This invite link is invalid or expired.'
  }
  if (fields.password) return fields.password
  if (fields.confirm_password) return fields.confirm_password
  if (fields.detail) return fields.detail
  if (fields.non_field_errors) return fields.non_field_errors
  return message
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-white/90">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          autoComplete={id === 'password' ? 'new-password' : 'new-password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          disabled={disabled}
          className="min-h-12 w-full rounded-full border border-white/25 bg-app-accent py-3 pl-5 pr-12 text-sm text-neutral-950 caret-neutral-950 shadow-sm placeholder:text-slate-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/45 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}

export function SetPasswordPage() {
  const [params] = useSearchParams()
  const uid = params.get('uid')?.trim() ?? ''
  const token = params.get('token')?.trim() ?? ''
  const linkValid = Boolean(uid && token)

  const [password, setPasswordValue] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordMismatch = useMemo(() => {
    if (!confirmPassword) return null
    return password === confirmPassword ? null : 'Passwords do not match.'
  }, [password, confirmPassword])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!linkValid) return

    setFieldError(null)
    setSubmitError(null)

    if (!password.trim()) {
      setFieldError('New password is required.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (!confirmPassword.trim()) {
      setFieldError('Confirm password is required.')
      return
    }
    if (password !== confirmPassword) {
      setFieldError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await setPasswordApi({
        uid,
        token,
        password,
        confirm_password: confirmPassword,
      })
      setSuccess(true)
    } catch (err: unknown) {
      setSubmitError(formatSetPasswordError(parseApiError(err, 'Could not set password.')))
    } finally {
      setSubmitting(false)
    }
  }

  const shellClass =
    'login-page-static flex min-h-screen flex-col items-center justify-center bg-brand-900 px-6 py-12'
  const cardClass =
    'w-full max-w-md rounded-panel border border-white/20 bg-brand-900/80 p-8 shadow-panel'

  if (!linkValid) {
    return (
      <div className={shellClass}>
        <div className={cardClass}>
          <h1 className="text-2xl font-bold text-white">Set your password</h1>
          <p className="mt-2 text-sm text-[var(--login-rail-subtle)]">Complete your account setup from the invite email.</p>
          <div className="mt-6">
            <ErrorState message="This invite link is invalid or incomplete." />
          </div>
          <Link
            to="/login"
            className="mt-6 inline-flex min-h-10 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-brand-900 hover:bg-white/95"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={shellClass}>
        <div className={cardClass}>
          <h1 className="text-2xl font-bold text-white">Password set</h1>
          <p className="mt-4 text-sm text-white/90">Password set successfully. You can now sign in.</p>
          <Link
            to="/login"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-brand-900 shadow-md hover:bg-white/95"
          >
            Go to sign in
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <div className={cardClass}>
        <h1 className="text-2xl font-bold text-white">Set your password</h1>
        <p className="mt-2 text-sm text-[var(--login-rail-subtle)]">Choose a password for your invited account.</p>

        {submitError ? (
          <div className="mt-6">
            <ErrorState message={submitError} />
          </div>
        ) : null}
        {fieldError ? (
          <div className="mt-6">
            <ErrorState message={fieldError} />
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          className={cn('mt-8 flex flex-col gap-5', (submitError || fieldError) && 'mt-6')}
        >
          <PasswordField
            id="password"
            label="New password"
            value={password}
            onChange={(v) => {
              setPasswordValue(v)
              setFieldError(null)
            }}
            show={showPassword}
            onToggleShow={() => setShowPassword((s) => !s)}
            disabled={submitting}
          />
          <PasswordField
            id="confirm_password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v)
              setFieldError(null)
            }}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((s) => !s)}
            disabled={submitting}
          />
          {passwordMismatch ? <p className="text-xs text-red-200">{passwordMismatch}</p> : null}
          
          <div className="rounded border border-[var(--login-rail-subtle)] bg-brand-900/50 p-3">
            <p className="text-xs font-medium text-white/90">Password requirements:</p>
            <ul className="mt-1 list-inside list-disc text-xs text-[var(--login-rail-subtle)]">
              <li>At least 8 characters long</li>
              <li>One uppercase letter (A-Z)</li>
              <li>One lowercase letter (a-z)</li>
              <li>One number (0-9)</li>
              <li>One special character (e.g., @, #, $)</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-brand-900 shadow-md transition hover:bg-white/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Set password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--login-rail-subtle)]">
          Already have a password?{' '}
          <Link to="/login" className="font-medium text-white underline hover:text-white/90">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
