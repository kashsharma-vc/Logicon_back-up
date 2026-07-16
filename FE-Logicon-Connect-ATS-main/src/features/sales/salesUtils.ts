import type { SalesLeadType } from '@/types/sales'

// ─── Lead type ────────────────────────────────────────────────────────────────

export const LEAD_TYPE_LABELS: Record<SalesLeadType, string> = {
  new_client: 'New client',
  site_expansion: 'Site expansion',
  scope_expansion: 'Scope expansion',
  renewal: 'Renewal',
}

export const ALL_LEAD_TYPES: SalesLeadType[] = [
  'new_client',
  'site_expansion',
  'scope_expansion',
  'renewal',
]

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'attention'

export function leadTypeVariant(leadType: SalesLeadType | string): BadgeVariant {
  switch (leadType) {
    case 'new_client': return 'info'
    case 'site_expansion': return 'success'
    case 'scope_expansion': return 'attention'
    case 'renewal': return 'neutral'
    default: return 'neutral'
  }
}

// ─── Stage ────────────────────────────────────────────────────────────────────

export const STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted_to_operations', label: 'Submitted to operations' },
  { value: 'site_survey_in_progress', label: 'Site survey in progress' },
  { value: 'site_survey_completed', label: 'Site survey completed' },
  { value: 'budget_generated', label: 'Budget generated' },
  { value: 'sales_review', label: 'Sales review' },
  { value: 'internal_approval', label: 'Internal approval' },
  { value: 'internally_approved', label: 'Internally approved' },
  { value: 'sent_to_client', label: 'Sent to client' },
  { value: 'client_negotiation', label: 'Client negotiation' },
  { value: 'client_revision_required', label: 'Client revision required' },
  { value: 'client_rejected', label: 'Client rejected' },
  { value: 'client_approved', label: 'Client approved' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'closed', label: 'Closed' },
]

// ─── Stage ordering ───────────────────────────────────────────────────────────

const STAGE_ORDER: string[] = [
  'draft',
  'submitted_to_operations',
  'site_survey_in_progress',
  'site_survey_completed',
  'budget_generated',
  'sales_review',
  'internal_approval',
  'internally_approved',
  'sent_to_client',
  'client_negotiation',
  'client_revision_required',
  'client_rejected',
  'client_approved',
  'won',
  'lost',
  'closed',
]

export function stageAtLeast(current: string | null | undefined, target: string): boolean {
  if (!current) return false
  const ci = STAGE_ORDER.indexOf(current)
  const ti = STAGE_ORDER.indexOf(target)
  if (ci === -1 || ti === -1) return false
  return ci >= ti
}

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return '—'
  const found = STAGE_OPTIONS.find((o) => o.value === stage)
  return found?.label ?? stage.replace(/_/g, ' ')
}

export function stageVariant(stage: string | null | undefined): BadgeVariant {
  switch (stage) {
    case 'won': return 'success'
    case 'client_approved': return 'success'
    case 'lost':
    case 'client_rejected': return 'danger'
    case 'client_negotiation':
    case 'client_revision_required': return 'attention'
    case 'internal_approval':
    case 'sent_to_client':
    case 'site_survey_in_progress':
    case 'site_survey_completed':
    case 'budget_generated':
    case 'sales_review': return 'info'
    case 'submitted_to_operations':
    case 'internally_approved': return 'warning'
    default: return 'neutral'
  }
}

// ─── Survey status ────────────────────────────────────────────────────────────

export function surveyStatusVariant(status: string | null | undefined): BadgeVariant {
  switch (status) {
    case 'completed': return 'success'
    case 'in_progress': return 'info'
    case 'pending': return 'warning'
    default: return 'neutral'
  }
}

export function surveyStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  const map: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In progress',
    completed: 'Completed',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

// ─── Proposal status ──────────────────────────────────────────────────────────

export function proposalStatusVariant(status: string | null | undefined): BadgeVariant {
  switch (status) {
    case 'approved': return 'success'
    case 'rejected': return 'danger'
    case 'client_approved': return 'success'
    case 'client_rejected': return 'danger'
    case 'internally_approved': return 'attention'
    case 'submitted_internal': return 'warning'
    case 'sent_to_client': return 'info'
    case 'not_sent': return 'neutral'
    case 'not_started': return 'neutral'
    case 'in_progress': return 'warning'
    case 'pending_internal_approval': return 'warning'
    case 'revision_requested': return 'warning'
    case 'client_revision_required': return 'warning'
    case 'client_negotiation': return 'attention'
    default: return 'neutral'
  }
}

export function proposalStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  const map: Record<string, string> = {
    draft: 'Draft',
    generated: 'Generated',
    submitted_internal: 'Pending internal approval',
    pending_internal_approval: 'Pending approval',
    not_started: 'Not started',
    in_progress: 'In progress',
    not_sent: 'Not sent',
    approved: 'Approved',
    rejected: 'Rejected',
    internally_approved: 'Approved internally',
    sent_to_client: 'Sent to client',
    client_approved: 'Client approved',
    client_rejected: 'Client rejected',
    client_revision_required: 'Revision required',
    client_negotiation: 'Negotiation required',
    revision_requested: 'Revision requested',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatShortDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
