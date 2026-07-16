import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import {
  BREAKDOWN_KEYS,
  breakdownBarLabel,
  formatMatchScore,
  matchStatusBadgeVariant,
} from '@/features/hiring/matchScoreLabels'
import type { CandidateMatchScorecardData } from '@/features/hiring/types'

function SkillChips({
  items,
  variant,
  emptyLabel,
}: {
  items: string[]
  variant: 'success' | 'warning' | 'neutral'
  emptyLabel?: string
}) {
  if (items.length === 0) {
    return emptyLabel ? <p className="text-xs text-app-subtle">{emptyLabel}</p> : null
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Badge key={s} variant={variant} className="text-[10px]">
          {s}
        </Badge>
      ))}
    </div>
  )
}

function BreakdownBar({ label, value }: { label: string; value: number | null | undefined }) {
  const n = value == null ? 0 : Math.max(0, Math.min(100, Number(value)))
  const pct = Number.isFinite(n) ? n : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-app-secondary">{label}</span>
        <span className="font-medium tabular-nums text-app-text">{formatMatchScore(pct)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-app-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 70 ? 'bg-status-hired' : pct >= 40 ? 'bg-status-warning' : 'bg-status-danger',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function CandidateMatchScorecard({
  data,
  compact = false,
}: {
  data: CandidateMatchScorecardData
  compact?: boolean
}) {
  const {
    candidateName,
    candidatePhone,
    score,
    matchStatus,
    scoreBreakdown,
    matchedSkills = [],
    missingSkills = [],
    extraCandidateSkills = [],
    reasons = [],
    warnings = [],
  } = data

  return (
    <div className={cn('space-y-4', compact ? 'text-sm' : '')}>
      {(candidateName || candidatePhone) ? (
        <div>
          {candidateName ? <p className="font-medium text-app-text">{candidateName}</p> : null}
          {candidatePhone ? <p className="font-mono text-xs text-app-secondary">{candidatePhone}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info" className="text-xs">
          Match score {formatMatchScore(score)}
        </Badge>
        {matchStatus ? (
          <Badge variant={matchStatusBadgeVariant(matchStatus)} className="text-xs">
            {matchStatus}
          </Badge>
        ) : null}
      </div>

      {scoreBreakdown ? (
        <div className="space-y-2.5 rounded-panel border border-app-border bg-app-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">Score breakdown</p>
          {BREAKDOWN_KEYS.map((key) => (
            <BreakdownBar
              key={key}
              label={breakdownBarLabel(key)}
              value={scoreBreakdown[key]}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-app-secondary">Matched skills</p>
          <SkillChips items={matchedSkills} variant="success" emptyLabel="None matched" />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-app-secondary">Missing skills</p>
          <SkillChips items={missingSkills} variant="warning" emptyLabel="None missing" />
        </div>
        {extraCandidateSkills.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-app-secondary">Additional skills</p>
            <SkillChips items={extraCandidateSkills} variant="neutral" />
          </div>
        ) : null}
      </div>

      {warnings.length > 0 ? (
        <div className="rounded-panel border border-status-warning/30 bg-status-warning/5 px-3 py-2">
          <p className="text-xs font-medium text-status-warning">Warnings</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-app-secondary">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {reasons.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-medium text-app-secondary">Why this match</p>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-app-secondary">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
