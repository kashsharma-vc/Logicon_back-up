import { AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { ClientOnboardingRow } from '@/features/clientOnboarding/types'

export type OnboardingSetupTab = 'request' | 'sites' | 'departments' | 'roles' | 'budgets' | 'users'

function activeCount<T extends { is_active?: boolean }>(items: T[] | undefined): number {
  if (!items?.length) return 0
  return items.filter((x) => x.is_active !== false).length
}

function clientDetailsOk(row: ClientOnboardingRow): boolean {
  if (row.onboarding_type === 'new_site_expansion') {
    return row.client != null && row.client > 0
  }
  return Boolean(row.proposed_client_name?.trim() && row.proposed_client_code?.trim())
}

function ChecklistRow({ label, detail, done }: { label: string; detail: string; done: boolean }) {
  return (
    <li className="flex gap-3 rounded-panel border border-app-border bg-app-muted/50 px-3 py-2.5">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-hidden />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', done ? 'text-app-text' : 'text-app-secondary')}>{label}</p>
        <p className="mt-0.5 text-xs text-app-subtle">{detail}</p>
      </div>
    </li>
  )
}

export function ClientOnboardingReadinessPanel({
  row,
  onGoToTab,
}: {
  row: ClientOnboardingRow
  onGoToTab: (tab: OnboardingSetupTab) => void
}) {
  const ready = row.readiness_ok === true
  const siteCount = activeCount(row.proposed_sites)
  const deptCount = activeCount(row.proposed_departments)
  const roleCount = activeCount(row.proposed_role_requirements)
  const budgetCount = activeCount(row.proposed_budgets)
  const userCount = activeCount(row.proposed_users)
  const expectedSites = row.expected_site_count

  const sitesOk =
    siteCount > 0 && (expectedSites == null || expectedSites <= 0 || siteCount >= expectedSites)
  const deptsOk = deptCount > 0
  const rolesOk = roleCount > 0
  const budgetsOk = budgetCount > 0
  const usersOk = userCount > 0
  const clientOk = clientDetailsOk(row)

  const backendErrors = row.readiness_errors ?? []
  const warnings = row.readiness_warnings ?? []

  if (ready) {
    return (
      <section className="rounded-panel border border-status-success/30 bg-status-success/5 p-4 shadow-panel">
        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-status-success" aria-hidden />
          <p className="text-sm font-medium text-app-text">Setup complete. This request is ready to send for approval.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-status-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-app-text">Complete setup before sending for approval</p>
          <p className="mt-1 text-xs text-app-secondary">
            Approval workflow appears after proposed setup is complete.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        <ChecklistRow
          label="Proposed client details"
          detail={
            row.onboarding_type === 'new_site_expansion'
              ? row.client_name?.trim()
                ? `Linked client: ${row.client_name}`
                : 'Link an existing client on the request'
              : row.proposed_client_name?.trim()
                ? `${row.proposed_client_name}${row.proposed_client_code ? ` (${row.proposed_client_code})` : ''}`
                : 'Add proposed client name and code on request details'
          }
          done={clientOk}
        />
        <ChecklistRow
          label="Proposed sites"
          detail={
            expectedSites != null && expectedSites > 0
              ? `${siteCount} of ${expectedSites} expected active site(s)`
              : `${siteCount} active site(s)`
          }
          done={sitesOk}
        />
        <ChecklistRow label="Proposed departments" detail={`${deptCount} active department(s)`} done={deptsOk} />
        <ChecklistRow label="Role requirements" detail={`${roleCount} active role requirement(s)`} done={rolesOk} />
        <ChecklistRow label="Proposed budgets" detail={`${budgetCount} active budget(s)`} done={budgetsOk} />
        <ChecklistRow label="Proposed users" detail={`${userCount} active proposed user(s)`} done={usersOk} />
      </ul>

      {backendErrors.length > 0 ? (
        <div className="mt-4 rounded-panel border border-status-danger/30 bg-status-danger/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-status-danger">Required to continue</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-app-secondary">
            {backendErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-4 rounded-panel border border-app-border bg-app-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Recommended before sending</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-app-secondary">
            {warnings.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!clientOk ? (
          <Button type="button" variant="secondary" className="min-h-9 text-sm" onClick={() => onGoToTab('request')}>
            Go to request details
          </Button>
        ) : null}
        {!sitesOk ? (
          <Button type="button" variant="secondary" className="min-h-9 text-sm" onClick={() => onGoToTab('sites')}>
            Go to sites
          </Button>
        ) : null}
        {!deptsOk ? (
          <Button type="button" variant="secondary" className="min-h-9 text-sm" onClick={() => onGoToTab('departments')}>
            Go to departments
          </Button>
        ) : null}
        {!rolesOk ? (
          <Button type="button" variant="secondary" className="min-h-9 text-sm" onClick={() => onGoToTab('roles')}>
            Go to role requirements
          </Button>
        ) : null}
        {!budgetsOk ? (
          <Button type="button" variant="secondary" className="min-h-9 text-sm" onClick={() => onGoToTab('budgets')}>
            Go to budgets
          </Button>
        ) : null}
        {!usersOk ? (
          <Button type="button" variant="secondary" className="min-h-9 text-sm" onClick={() => onGoToTab('users')}>
            Go to proposed users
          </Button>
        ) : null}
      </div>
    </section>
  )
}
