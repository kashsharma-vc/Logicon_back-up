/** Format a 0–100 match score for display. */
export function formatMatchScore(score: number | string | null | undefined): string {
  if (score == null || score === '') return '—'
  const n = Number(score)
  if (!Number.isFinite(n)) return String(score)
  return String(Math.round(n))
}

/** Mirror backend match_status_label thresholds. */
export function matchStatusFromScore(score: number | string | null | undefined): string {
  const n = Number(score)
  if (!Number.isFinite(n)) return '—'
  if (n >= 80) return 'Strong Match'
  if (n >= 60) return 'Good Match'
  if (n >= 40) return 'Possible Match'
  return 'Weak Match'
}

export function matchStatusBadgeVariant(
  status: string | null | undefined,
): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (!status) return 'neutral'
  const s = status.toLowerCase()
  if (s.includes('strong')) return 'success'
  if (s.includes('good')) return 'info'
  if (s.includes('possible') || s.includes('partial')) return 'warning'
  if (s.includes('weak') || s.includes('unqualified')) return 'danger'
  if (s === 'qualified') return 'success'
  return 'neutral'
}

export const BREAKDOWN_KEYS = [
  'role',
  'skills',
  'experience',
  'location',
  'availability',
  'data_quality',
] as const

export type BreakdownKey = (typeof BREAKDOWN_KEYS)[number]

export function breakdownBarLabel(key: BreakdownKey): string {
  const map: Record<BreakdownKey, string> = {
    role: 'Role',
    skills: 'Skills',
    experience: 'Experience fit',
    location: 'Location fit',
    availability: 'Availability',
    data_quality: 'Data quality',
  }
  return map[key]
}
