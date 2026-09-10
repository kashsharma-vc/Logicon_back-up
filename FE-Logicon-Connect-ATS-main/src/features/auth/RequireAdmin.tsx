import type { ReactNode } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import { isUserAdmin } from '@/lib/userRoleMode'
import { Spinner } from '@/components/ui/Spinner'
import { NoAccessPage } from '@/features/auth/NoAccessPage'

interface RequireAdminProps {
  children: ReactNode
}

/**
 * Guards admin-only routes. Non-admin users see the standard access-denied screen.
 */
export function RequireAdmin({ children }: RequireAdminProps) {
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

  if (!me || !isUserAdmin(me)) {
    return <NoAccessPage />
  }

  return <>{children}</>
}
