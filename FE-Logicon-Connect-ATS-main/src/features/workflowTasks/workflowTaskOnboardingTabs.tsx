import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { WorkflowMyTask, WorkflowTaskMobilisationSetup } from '@/features/workflow/types'
import { Badge } from '@/components/ui/Badge'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import {
  ActionNudge,
  TaskApprovalCard,
  TaskInfoGrid,
  TaskMetricTile,
  TaskSummaryBand,
} from '@/features/workflowTasks/TaskOverviewComponents'
import { activeBadge, displayText, humanize } from '@/features/workflowTasks/workflowTaskOnboardingViews'

function mobilisationFinalizationLabel(value: string | null | undefined): string {
  if (!value || value === 'not_finalized') return 'Not finalized'
  if (value === 'finalized') return 'Finalized'
  if (value === 'failed') return 'Finalization failed'
  return humanize(value)
}

function mobilisationTypeLabel(code: string): string {
  if (code === 'new_client') return 'New client'
  if (code === 'new_site_expansion') return 'New site expansion'
  if (code === 'scope_expansion') return 'Scope expansion'
  return humanize(code)
}

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'attention'

function statusVariant(status: string): BadgeVariant {
  if (status === 'approved') return 'success'
  if (status === 'rejected' || status === 'cancelled') return 'danger'
  if (status === 'submitted') return 'info'
  if (status === 'pending_review' || status === 'review' || status === 'in_review') return 'attention'
  return 'neutral'
}

function userTypeLabel(value: string | null | undefined): string {
  if (value === 'client_admin') return 'Client admin'
  if (value === 'client_site_user') return 'Site user'
  if (value === 'site_supervisor') return 'Site supervisor'
  if (value === 'client_user') return 'Client user'
  return humanize(value)
}

function userScopeLabel(value: string | null | undefined): string {
  if (value === 'client') return 'Client-level'
  if (value === 'site') return 'Site-level'
  return humanize(value)
}

function inviteStatusLabel(value: string | null | undefined): string {
  if (value === 'not_sent') return 'Not sent'
  if (value === 'sent') return 'Sent'
  if (value === 'accepted') return 'Accepted'
  if (value === 'failed') return 'Failed'
  return humanize(value)
}

function siteName(row: { real_site_name?: string | null; real_site_code?: string | null }): string {
  const name = row.real_site_name?.trim()
  const code = row.real_site_code?.trim()
  if (name && code) return `${name} (${code})`
  return name || code || '-'
}

export function MobilisationOverviewTab({
  task,
  setup,
  detailUrl,
  onGoToAction,
}: {
  task: WorkflowMyTask
  setup: WorkflowTaskMobilisationSetup
  detailUrl?: string | null
  onGoToAction: () => void
}) {
  const clientName = setup.client_name?.trim() || setup.source_sales_lead_name?.trim() || '-'
  const departmentsCount = setup.proposed_departments?.length ?? 0
  const usersCount = setup.proposed_users?.length ?? 0
  const currentStatusVariant = statusVariant(setup.status)
  const finalization = mobilisationFinalizationLabel(setup.finalization_status)

  const detailRows: { label: string; value: ReactNode }[] = [
    { label: 'Mobilisation type', value: mobilisationTypeLabel(setup.mobilisation_type ?? setup.onboarding_type ?? '') },
    { label: 'Client', value: clientName },
    { label: 'Finalization', value: finalization },
    {
      label: 'Status',
      value: <Badge variant={currentStatusVariant}>{humanize(setup.status)}</Badge>,
    },
    {
      label: 'Requested by',
      value: setup.requested_by_username?.trim() || '-',
    },
  ]

  if (setup.source_sales_lead_name?.trim()) {
    detailRows.push({ label: 'Source lead', value: setup.source_sales_lead_name })
  }

  if (setup.source_proposal_version_number != null) {
    detailRows.push({
      label: 'Source proposal',
      value: `v${setup.source_proposal_version_number}`,
    })
  }

  return (
    <div className="space-y-3">
      <TaskSummaryBand
        title={`Mobilisation #${setup.id}`}
        subtitle={clientName !== '-' ? clientName : null}
        badges={
          <>
            <Badge variant="info">{task.step_name}</Badge>
            <Badge variant={currentStatusVariant}>{humanize(setup.status)}</Badge>
            <Badge variant="neutral">{finalization}</Badge>
          </>
        }
      />

      {detailUrl ? (
        <Link
          to={detailUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View full details
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TaskMetricTile label="Departments" value={departmentsCount} />
        <TaskMetricTile label="Users" value={usersCount} />
      </div>

      <TaskApprovalCard
        stepName={task.step_name}
        departmentName={task.assigned_department_name}
        activatedAt={task.activated_at}
        dueAt={task.due_at}
      />

      <TaskInfoGrid title="Mobilisation details" rows={detailRows} />

      <ActionNudge onGoToAction={onGoToAction} />
    </div>
  )
}

export function MobilisationDepartmentsTab({ setup }: { setup: WorkflowTaskMobilisationSetup }) {
  const rows = setup.proposed_departments ?? []
  if (rows.length === 0) {
    return <p className="text-sm text-app-secondary">No departments found.</p>
  }
  return (
    <div className="overflow-x-auto rounded-panel border border-app-border">
      <Table>
        <THead>
          <TR>
            <TH className="py-2">Department</TH>
            <TH className="py-2">Scope</TH>
            <TH className="py-2">Site</TH>
            <TH className="py-2">Description</TH>
            <TH className="py-2">Status</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR key={row.id}>
              <TD className="py-2 text-sm">
                <span className="font-medium text-app-text">{displayText(row.name)}</span>
                {row.code?.trim() ? (
                  <span className="ml-1 font-mono text-xs text-app-secondary">({row.code})</span>
                ) : null}
              </TD>
              <TD className="py-2 text-xs text-app-secondary">{humanize(row.scope_level)}</TD>
              <TD className="py-2 text-xs text-app-secondary">{siteName(row)}</TD>
              <TD className="py-2 text-xs text-app-secondary">{displayText(row.description)}</TD>
              <TD className="py-2">{activeBadge(row.is_active)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  )
}

export function MobilisationUsersTab({ setup }: { setup: WorkflowTaskMobilisationSetup }) {
  const users = setup.proposed_users ?? []
  if (users.length === 0) {
    return <p className="text-sm text-app-secondary">No users found.</p>
  }
  return (
    <div className="overflow-x-auto rounded-panel border border-app-border">
      <Table>
        <THead>
          <TR>
            <TH className="py-2">Name / email</TH>
            <TH className="py-2">Phone</TH>
            <TH className="py-2">User type</TH>
            <TH className="py-2">Access role</TH>
            <TH className="py-2">Scope</TH>
            <TH className="py-2">Site</TH>
            <TH className="py-2">Contact</TH>
            <TH className="py-2">Invite</TH>
            <TH className="py-2">Created user</TH>
            <TH className="py-2">Status</TH>
          </TR>
        </THead>
        <TBody>
          {users.map((user) => (
            <TR key={user.id}>
              <TD className="py-2 text-sm">
                <span className="font-medium text-app-text">{displayText(user.full_name)}</span>
                <br />
                <span className="text-xs text-app-secondary">{displayText(user.email)}</span>
              </TD>
              <TD className="py-2 text-xs text-app-secondary">{displayText(user.phone)}</TD>
              <TD className="py-2 text-xs">{userTypeLabel(user.user_type)}</TD>
              <TD className="py-2 text-xs text-app-secondary">
                {user.access_role_name?.trim()
                  ? user.access_role_code?.trim()
                    ? `${user.access_role_name} (${user.access_role_code})`
                    : user.access_role_name
                  : displayText(user.access_role_code ?? (user.access_role != null ? `#${user.access_role}` : null))}
              </TD>
              <TD className="py-2 text-xs">{userScopeLabel(user.scope_level)}</TD>
              <TD className="py-2 text-xs text-app-secondary">{siteName(user)}</TD>
              <TD className="py-2">
                {user.is_primary_contact ? (
                  <Badge variant="info">Primary contact</Badge>
                ) : (
                  <span className="text-xs text-app-subtle">-</span>
                )}
              </TD>
              <TD className="py-2 text-xs text-app-secondary">{inviteStatusLabel(user.invite_status)}</TD>
              <TD className="py-2 text-xs text-app-secondary">
                {user.created_user != null && user.created_user > 0 ? `#${user.created_user}` : '-'}
              </TD>
              <TD className="py-2">{activeBadge(user.is_active)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  )
}
