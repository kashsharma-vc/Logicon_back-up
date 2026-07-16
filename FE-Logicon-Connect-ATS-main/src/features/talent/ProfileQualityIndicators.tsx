import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import {
  profileQualityCheckItems,
  profileQualityCheckLabel,
  profileQualityTier,
  profileQualityTierLabel,
  profileQualityTierVariant,
} from '@/features/talent/talentLabels'
import type { CandidateRow } from '@/features/talent/types'

export function ProfileQualityIndicators({ candidate }: { candidate: CandidateRow }) {
  const pq = candidate.profile_quality
  const score = candidate.profile_quality_score ?? pq?.score ?? null
  const tier = profileQualityTier(score)
  const items = profileQualityCheckItems(pq)
  const presentCount = items.filter((i) => i.present).length
  const total = items.length || 1
  const pct = score != null ? Math.min(100, Math.max(0, score)) : (presentCount / total) * 100

  return (
    <div className="space-y-1.5" title="Profile quality from server">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={profileQualityTierVariant(tier)} className="text-[10px]">
          {profileQualityTierLabel(tier)}
        </Badge>
        {score != null ? (
          <span className="text-[10px] font-medium text-app-subtle">{score}/100</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-app-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              tier === 'complete' ? 'bg-status-hired' : tier === 'needs_info' ? 'bg-brand-500' : 'bg-status-warning',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {items.length > 0 ? (
          <span className="text-[10px] font-medium text-app-subtle">
            {presentCount}/{items.length}
          </span>
        ) : null}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {items.map(({ key, label, present }) => (
            <span
              key={key}
              className={cn(
                'inline-flex items-center gap-1 text-[10px]',
                present ? 'text-status-hired' : 'text-app-subtle opacity-60',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', present ? 'bg-status-hired' : 'bg-app-subtle')} />
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ProfileQualityChecklist({ candidate }: { candidate: CandidateRow }) {
  const pq = candidate.profile_quality
  const score = candidate.profile_quality_score ?? pq?.score ?? null
  const tier = profileQualityTier(score)
  const items = profileQualityCheckItems(pq)
  const missing = pq?.missing ?? []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={profileQualityTierVariant(tier)}>{profileQualityTierLabel(tier)}</Badge>
        {score != null ? <span className="text-sm text-app-secondary">Score: {score}/100</span> : null}
      </div>
      {items.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map(({ key, label, present }) => (
            <li
              key={key}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                present ? 'border-status-hired/30 bg-status-hired/5' : 'border-app-border bg-app-muted/30',
              )}
            >
              <span
                className={cn('h-2 w-2 shrink-0 rounded-full', present ? 'bg-status-hired' : 'bg-app-subtle')}
              />
              <span className={present ? 'text-app-text' : 'text-app-secondary'}>{label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-app-secondary">No profile quality data from server yet.</p>
      )}
      {missing.length > 0 ? (
        <p className="text-xs text-app-subtle">
          Missing: {missing.map((k) => profileQualityCheckLabel(k)).join(', ')}
        </p>
      ) : null}
    </div>
  )
}
