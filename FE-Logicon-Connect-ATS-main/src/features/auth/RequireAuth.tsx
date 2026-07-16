import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/Button'

export function RequireAuth() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const bootstrapped = useAuthStore((s) => s.bootstrapped)
  const meLoading = useAuthStore((s) => s.meLoading)
  const me = useAuthStore((s) => s.me)
  const meError = useAuthStore((s) => s.meError)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <Spinner label="Starting app" />
      </div>
    )
  }

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (meLoading && !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <Spinner label="Loading your session" />
      </div>
    )
  }

  if (!me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-bg px-4">
        <div className="w-full max-w-md">
          <ErrorState message={meError ?? 'Could not load your profile. Try signing in again.'} />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            logout()
          }}
        >
          Back to sign in
        </Button>
      </div>
    )
  }

  return <Outlet />
}




