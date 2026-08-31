import type { HiringApplicationRow, PipelineStageRow } from '@/features/hiring/types'

export function groupApplicationsByStage(
  applications: HiringApplicationRow[],
  stages: PipelineStageRow[],
): Map<number, HiringApplicationRow[]> {
  const map = new Map<number, HiringApplicationRow[]>()
  for (const s of stages) map.set(s.id, [])

  const firstStageId = stages[0]?.id
  for (const app of applications) {
    const key = app.current_stage
    if (key != null && map.has(key)) {
      map.get(key)!.push(app)
    } else if (firstStageId != null) {
      // unknown or unassigned stage falls into first column
      map.get(firstStageId)!.push(app)
    }
  }
  return map
}

type BadgeVariant = 'neutral' | 'success' | 'danger' | 'info' | 'warning' | 'attention'

export function statusBadgeVariant(status: string | null | undefined): BadgeVariant {
  switch (status) {
    case 'selected':
    case 'offer_accepted':
    case 'deployed':
      return 'success'
    case 'rejected':
    case 'cancelled':
    case 'offer_declined':
      return 'danger'
    case 'interview_scheduled':
    case 'interview_in_progress':
      return 'attention'
    case 'shortlisted':
    case 'client_review':
      return 'info'
    case 'offer_released':
      return 'warning'
    default:
      return 'neutral'
  }
}
