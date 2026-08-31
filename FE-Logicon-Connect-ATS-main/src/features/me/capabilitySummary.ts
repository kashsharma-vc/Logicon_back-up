import { permissionAreaLabel } from '@/features/roles/displayLabels'

/** Ordered: longer prefixes first so `workflow.config` wins over `workflow`. */
const AREA_PREFIXES: { prefix: string; label: string }[] = [
  { prefix: 'workflow.config.', label: 'Approval setup' },
  { prefix: 'workflow.', label: 'Approvals' },
  { prefix: 'client_onboarding.', label: 'Mobilisation' },
  { prefix: 'site_role_requirement.', label: 'Site role requirements' },
  { prefix: 'job_role.', label: 'Job roles' },
  { prefix: 'hiring_application.', label: 'Hiring' },
  { prefix: 'site_deployment.', label: 'Site deployment' },
  { prefix: 'deployment.', label: 'Deployment' },
  { prefix: 'role.', label: 'Roles' },
  { prefix: 'user.', label: 'Users' },
  { prefix: 'wage.', label: 'Wages' },
  { prefix: 'client.', label: 'Clients' },
  { prefix: 'site.', label: 'Sites' },
  { prefix: 'mrf.', label: 'Manpower requests' },
  { prefix: 'department.', label: 'Departments' },
  { prefix: 'campaign.', label: 'Campaigns' },
  { prefix: 'submission.', label: 'Intake submissions' },
]

const ACTION_LABELS: Record<string, string> = {
  read: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
  reject: 'Reject',
  reassign: 'Reassign',
  start_workflow: 'Start workflow',
  manage: 'Manage',
  manage_module: 'Manage',
  export: 'Export',
  view_resume: 'View resume',
  shortlist: 'Shortlist',
}

function humanizeAction(key: string): string {
  if (!key) return ''
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface CapabilityGroup {
  areaLabel: string
  /** Stable sort key for ordering groups */
  sortKey: string
  actions: { friendly: string; raw: string }[]
}

function parseCapability(cap: string): { areaLabel: string; sortKey: string; actionKey: string } | null {
  const trimmed = cap.trim()
  if (!trimmed) return null

  for (const { prefix, label } of AREA_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return {
        areaLabel: label,
        sortKey: label,
        actionKey: trimmed.slice(prefix.length),
      }
    }
  }

  const dot = trimmed.indexOf('.')
  if (dot === -1) {
    return { areaLabel: trimmed, sortKey: trimmed, actionKey: '' }
  }
  const resource = trimmed.slice(0, dot)
  const actionKey = trimmed.slice(dot + 1)
  return {
    areaLabel: permissionAreaLabel(resource),
    sortKey: permissionAreaLabel(resource),
    actionKey,
  }
}

function friendlyActionLabel(actionKey: string): string {
  if (!actionKey) return ''
  return ACTION_LABELS[actionKey] ?? humanizeAction(actionKey)
}

/** Groups capability strings by business area; dedupes actions per area. */
export function groupCapabilities(capabilities: string[]): CapabilityGroup[] {
  const byArea = new Map<string, Map<string, { friendly: string; raw: string }>>()
  const sortKeys = new Map<string, string>()

  for (const raw of capabilities) {
    const parsed = parseCapability(raw)
    if (!parsed) continue
    const { areaLabel, sortKey, actionKey } = parsed
    sortKeys.set(areaLabel, sortKey)

    let actions = byArea.get(areaLabel)
    if (!actions) {
      actions = new Map()
      byArea.set(areaLabel, actions)
    }
    const friendly = friendlyActionLabel(actionKey)
    const dedupeKey = friendly.toLowerCase()
    if (!actions.has(dedupeKey)) {
      actions.set(dedupeKey, { friendly, raw })
    }
  }

  const rows: CapabilityGroup[] = []
  for (const [areaLabel, actionMap] of byArea) {
    const list = [...actionMap.values()].sort((a, b) => a.friendly.localeCompare(b.friendly))
    rows.push({
      areaLabel,
      sortKey: sortKeys.get(areaLabel) ?? areaLabel,
      actions: list,
    })
  }

  rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  return rows
}
