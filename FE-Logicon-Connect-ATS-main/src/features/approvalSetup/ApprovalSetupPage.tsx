import { useMemo, useState } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { cn } from '@/lib/cn'
import { ApprovalAssignmentsTab } from '@/features/approvalSetup/ApprovalAssignmentsTab'
import { ApprovalFlowsTab } from '@/features/approvalSetup/ApprovalFlowsTab'
import { ApprovalPreviewTab } from '@/features/approvalSetup/ApprovalPreviewTab'
import { ApprovalRulesTab } from '@/features/approvalSetup/ApprovalRulesTab'
import { ApprovalStepsTab } from '@/features/approvalSetup/ApprovalStepsTab'

const TABS = [
  { id: 'flows', label: 'Approval flows' },
  { id: 'steps', label: 'Steps' },
  { id: 'rules', label: 'Where it applies' },
  { id: 'assignments', label: 'Responsible people' },
  { id: 'preview', label: 'Preview' },
] as const

type TabId = (typeof TABS)[number]['id']

export function ApprovalSetupPage() {
  const caps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canManage = hasAnyCapability(caps, [CAP.WORKFLOW_CONFIG_MANAGE])
  const [tab, setTab] = useState<TabId>('flows')

  const hint = useMemo(
    () =>
      canManage
        ? null
        : 'You have read-only access. Create and edit actions are hidden until an administrator grants approval setup access.',
    [canManage],
  )

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Approval setup</h2>
        <p className="text-sm text-app-secondary">
          Configure how manpower and mobilisation requests are reviewed before they move forward.
        </p>
        {hint ? <p className="mt-2 text-xs text-app-subtle">{hint}</p> : null}
      </div>

      <div className="flex flex-wrap gap-8 border-b border-app-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'border-b-2 pb-3 pt-1 text-sm transition-colors -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
              tab === t.id
                ? 'border-app-text font-semibold text-app-text'
                : 'border-transparent font-normal text-app-secondary hover:text-app-text',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {tab === 'flows' ? <ApprovalFlowsTab /> : null}
        {tab === 'steps' ? <ApprovalStepsTab /> : null}
        {tab === 'rules' ? <ApprovalRulesTab /> : null}
        {tab === 'assignments' ? <ApprovalAssignmentsTab /> : null}
        {tab === 'preview' ? <ApprovalPreviewTab /> : null}
      </div>
    </div>
  )
}
