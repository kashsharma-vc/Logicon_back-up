import type { ReactNode } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import { hasAnyCapability } from '@/lib/capabilities'
import { Spinner } from '@/components/ui/Spinner'
import { NoAccessPage } from '@/features/auth/NoAccessPage'

interface RequireCapabilityProps {
  anyOf: string[]
  children: ReactNode
}

export function RequireCapability({ anyOf, children }: RequireCapabilityProps) {
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

  if (!me) {
    return <NoAccessPage />
  }

  const caps = me.capabilities ?? []
  if (!hasAnyCapability(caps, anyOf)) {
    return <NoAccessPage required={anyOf} />
  }

  return children
}




