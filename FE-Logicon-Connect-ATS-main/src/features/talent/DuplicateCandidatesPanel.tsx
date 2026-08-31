import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCandidates, mergeCandidate } from '@/api/talent'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import type { CandidateRow } from '@/features/talent/types'

function displayName(c: CandidateRow): string {
  if (c.full_name?.trim()) return c.full_name.trim()
  return [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ')
}

export function DuplicateCandidatesPanel({
  candidate,
  onMerged,
}: {
  candidate: CandidateRow
  onMerged?: () => void
}) {
  const [matches, setMatches] = useState<CandidateRow[]>([])
  const [loading, setLoading] = useState(false)
  const [targetId, setTargetId] = useState('')
  const [mergeNote, setMergeNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const queries: string[] = []
        if (candidate.phone?.trim()) queries.push(candidate.phone.trim())
        if (candidate.email?.trim()) queries.push(candidate.email.trim())
        const seen = new Set<number>()
        const found: CandidateRow[] = []
        for (const q of queries) {
          const res = await listCandidates({ search: q, page: 1 })
          for (const row of res.items) {
            if (row.id === candidate.id || seen.has(row.id)) continue
            seen.add(row.id)
            found.push(row)
          }
        }
        if (!cancelled) setMatches(found)
      } catch {
        if (!cancelled) setMatches([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [candidate.id, candidate.phone, candidate.email])

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault()
    const target = Number(targetId)
    if (!Number.isFinite(target) || target < 1) {
      setError('Enter a valid target candidate ID.')
      return
    }
    if (target === candidate.id) {
      setError('Cannot merge a candidate into itself.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await mergeCandidate(candidate.id, {
        target_candidate: target,
        note: mergeNote.trim() || undefined,
      })
      setSuccess(`Merged into ${displayName(result.target_candidate)} (#${result.target_candidate.id}).`)
      onMerged?.()
    } catch (err: unknown) {
      setError(parseApiError(err, 'Merge failed').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {candidate.is_duplicate || candidate.duplicate_of ? (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-sm text-app-secondary">
          {candidate.duplicate_of ? (
            <span>
              Marked duplicate of{' '}
              <Link to={`/candidates/${candidate.duplicate_of}`} className="font-medium text-brand-600 hover:underline">
                candidate #{candidate.duplicate_of}
              </Link>
            </span>
          ) : (
            <span>This candidate is flagged as a duplicate record.</span>
          )}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">Possible duplicates</p>
        {loading ? (
          <div className="mt-2">
            <Spinner label="Searching…" />
          </div>
        ) : matches.length === 0 ? (
          <p className="mt-2 text-sm text-app-secondary">No other candidates found with the same phone or email.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {matches.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-app-border bg-app-surface p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-app-heading">{displayName(m)}</p>
                  <p className="text-xs text-app-secondary">{m.phone}{m.email ? ` · ${m.email}` : ''}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.is_duplicate ? <Badge variant="warning" className="text-[10px]">Duplicate</Badge> : null}
                  <Link
                    to={`/candidates/${m.id}`}
                    className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={(e) => void handleMerge(e)} className="space-y-3 rounded-xl border border-app-border bg-app-muted/20 p-4">
        <p className="text-sm font-semibold text-app-heading">Merge into target candidate</p>
        <p className="text-xs text-app-secondary">
          Merges this profile into the selected target. Blocked if either candidate has active hiring applications.
        </p>
        <Input
          id="merge_target"
          label="Target candidate ID"
          type="number"
          min={1}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder="e.g. 42"
        />
        <Input
          id="merge_note"
          label="Note (optional)"
          value={mergeNote}
          onChange={(e) => setMergeNote(e.target.value)}
          placeholder="Reason for merge"
        />
        {error ? <p className="text-sm text-status-danger">{error}</p> : null}
        {success ? <p className="text-sm text-status-hired">{success}</p> : null}
        <Button type="submit" disabled={busy} className="min-h-9">
          {busy ? 'Merging…' : 'Merge candidate'}
        </Button>
      </form>
    </div>
  )
}
