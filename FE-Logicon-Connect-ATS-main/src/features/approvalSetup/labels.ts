/** Business-facing copy; avoid internal model names in UI. */

export const REQUEST_TYPE_LABEL: Record<string, string> = {
  mrf: 'Manpower Request',
  client_onboarding: 'Mobilisation',
}

export function requestTypeLabel(triggerType: string | undefined | null): string {
  if (!triggerType) return '-'
  return REQUEST_TYPE_LABEL[triggerType] ?? triggerType.replace(/_/g, ' ')
}

export const ASSIGNMENT_MODE_LABEL: Record<string, string> = {
  named_user: 'Specific person',
  queue: 'Team queue (future)',
  claim: 'First to claim (future)',
}

export const MAPPING_LEVEL_LABEL: Record<string, string> = {
  company: 'Company default',
  org: 'Company default',
  client: 'Client specific',
  site: 'Site specific',
}

export function mappingLevelLabel(level: string | undefined | null): string {
  if (!level) return '-'
  return MAPPING_LEVEL_LABEL[level] ?? level.replace(/_/g, ' ')
}
