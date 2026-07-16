import { ShieldOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

interface NoAccessPageProps {
  /** Capabilities that would unlock this area (for support/debug copy). */
  required?: string[]
}

export function NoAccessPage({ required }: NoAccessPageProps) {
  const navigate = useNavigate()

  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-panel border border-app-border bg-app-surface px-6 py-10 text-center shadow-panel"
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-muted text-status-danger">
        <ShieldOff className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-app-text">No access</h1>
        <p className="mt-2 text-sm text-app-secondary">
          You do not have permission to view this page. If you believe this is a mistake, contact your
          administrator.
        </p>
        {required?.length ? (
          <p className="mt-3 font-mono text-xs text-app-subtle">
            Required capability: {required.join(' or ')}
          </p>
        ) : null}
      </div>
      <Button variant="secondary" type="button" onClick={() => navigate('/dashboard')}>
        Back to dashboard
      </Button>
    </div>
  )
}




