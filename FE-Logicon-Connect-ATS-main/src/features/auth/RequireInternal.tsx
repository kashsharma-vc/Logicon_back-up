import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { isClientFacingUser } from '@/lib/userRoleMode'
import { Spinner } from '@/components/ui/Spinner'

interface RequireInternalProps {
  children: ReactNode
}

/**
 * Guards internal-only pages. Client-facing users get a friendly access-denied
 * screen pointing them back to Candidate review instead of seeing internal ATS/admin UI.
 */
export function RequireInternal({ children }: RequireInternalProps) {
  const me = useAuthStore((s) => s.me)
  const meLoading = useAuthStore((s) => s.meLoading)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!accessToken) {
    return null
  }

  if (meLoading && !me) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Checking access" />
      </div>
    )
  }

  if (isClientFacingUser(me)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-panel border border-app-border bg-app-surface p-6 text-center shadow-panel">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-muted text-app-secondary">
            <ShieldAlert className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-app-text">Access denied</h2>
          <p className="mt-2 text-sm text-app-secondary">
            This page is for internal teams. Use Candidate review to review submitted candidates.
          </p>
          <Link
            to="/hiring/client-review"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-panel bg-brand-600 px-4 text-sm font-semibold text-white shadow-panel hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            Go to Candidate review
          </Link>
        </div>
      </div>
    )
  }

  return children
}
