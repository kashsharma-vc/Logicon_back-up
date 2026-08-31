import type {
  CandidateMatchResultRow,
  CandidateMatchScorecardData,
  CandidatePoolResultRow,
  MatchScoreBreakdown,
  MatchSnapshot,
} from '@/features/hiring/types'
import { matchStatusFromScore } from '@/features/hiring/matchScoreLabels'

function toNum(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function asStringList(v: string[] | string | null | undefined): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x.trim())
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return []
}

function breakdownFromMatchResult(row: CandidateMatchResultRow): MatchScoreBreakdown | null {
  if (row.match_details && typeof row.match_details === 'object') {
    return row.match_details
  }
  const built: MatchScoreBreakdown = {
    role: toNum(row.role_score),
    skills: toNum(row.skill_score),
    experience: toNum(row.experience_score),
    location: toNum(row.location_score),
    availability: toNum(row.availability_score),
    data_quality: null,
  }
  const hasAny = Object.values(built).some((v) => v != null)
  return hasAny ? built : null
}

export function poolRowToScorecard(row: CandidatePoolResultRow): CandidateMatchScorecardData {
  const c = row.candidate
  const name = c.full_name?.trim() || [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ')
  return {
    candidateName: name || `Candidate #${c.id}`,
    candidatePhone: c.phone,
    score: row.score ?? null,
    matchStatus: row.match_status ?? matchStatusFromScore(row.score),
    scoreBreakdown: row.score_breakdown ?? null,
    matchedSkills: row.matched_skills ?? [],
    missingSkills: row.missing_skills ?? [],
    extraCandidateSkills: row.extra_candidate_skills ?? [],
    reasons: row.reasons ?? [],
    warnings: row.warnings ?? [],
  }
}

function snapshotBreakdown(snap: MatchSnapshot): MatchScoreBreakdown | null {
  const bd = snap.score_breakdown
  if (bd && typeof bd === 'object') return bd
  return null
}

/** Map captured application match_snapshot to scorecard UI (no frontend scoring). */
export function matchSnapshotToScorecard(
  snap: MatchSnapshot | null | undefined,
  candidateName?: string,
  candidatePhone?: string,
): CandidateMatchScorecardData | null {
  if (!snap || Object.keys(snap).length === 0) return null
  if (snap.score == null && !snap.score_breakdown && !(snap.matched_skills?.length)) return null
  return {
    candidateName,
    candidatePhone,
    score: snap.score ?? null,
    matchStatus: null,
    scoreBreakdown: snapshotBreakdown(snap),
    matchedSkills: snap.matched_skills ?? [],
    missingSkills: snap.missing_skills ?? [],
    extraCandidateSkills: [],
    reasons: snap.reasons ?? [],
    warnings: snap.warnings ?? [],
  }
}

export function matchResultToScorecard(
  row: CandidateMatchResultRow,
  candidateName?: string,
  candidatePhone?: string,
): CandidateMatchScorecardData {
  const score = toNum(row.final_score) ?? toNum(row.match_score)
  return {
    candidateName,
    candidatePhone,
    score,
    matchStatus: matchStatusFromScore(score),
    scoreBreakdown: breakdownFromMatchResult(row),
    matchedSkills: row.matched_skills ?? [],
    missingSkills: row.missing_skills ?? [],
    extraCandidateSkills: [],
    reasons: asStringList(row.match_reason),
    warnings: row.warnings ?? [],
  }
}
