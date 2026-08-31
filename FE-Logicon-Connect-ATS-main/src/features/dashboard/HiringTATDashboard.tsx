import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { getTATDashboard } from '@/api/hiring'
import type { HiringApplicationRow } from '@/features/hiring/types'

function formatDuration(start: string, end?: string) {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'}`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} d`
}

export function HiringTATDashboard() {
  const [apps, setApps] = useState<HiringApplicationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTATDashboard()
      .then((res) => {
        if (!cancelled) setApps(res.items)
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-app-subtle" />
      </div>
    )
  }

  // Calculate some aggregate metrics
  const totalApps = apps.length
  const deployedApps = apps.filter((a) => a.status === 'deployed')
  const avgTATDays =
    deployedApps.length > 0
      ? deployedApps.reduce((acc, a) => {
          const s = new Date(a.created_at || new Date())
          const e = new Date(a.updated_at || new Date())
          const diffMs = e.getTime() - s.getTime()
          const diffDays = diffMs / (1000 * 60 * 60 * 24)
          return acc + diffDays
        }, 0) / deployedApps.length
      : 0

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-app-heading">Hiring TAT Dashboard</h1>
        <p className="mt-1 text-sm text-app-secondary">Track the Turn Around Time (TAT) from New Lead to Deployment.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-app-secondary">Total Applications</p>
          <p className="mt-2 text-3xl font-bold text-app-heading">{totalApps}</p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-app-secondary">Successfully Deployed</p>
          <p className="mt-2 text-3xl font-bold text-status-success">{deployedApps.length}</p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-app-secondary">Average TAT to Deploy</p>
          <p className="mt-2 flex items-baseline gap-2 text-3xl font-bold text-brand-600">
            {avgTATDays.toFixed(1)} <span className="text-base font-normal text-app-subtle">days</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-app-border bg-app-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-app-muted/30 text-app-secondary border-b border-app-border/50">
              <tr>
                <th className="px-5 py-4 font-semibold">Candidate</th>
                <th className="px-5 py-4 font-semibold">Role & Site</th>
                <th className="px-5 py-4 font-semibold">Current Status</th>
                <th className="px-5 py-4 font-semibold">Started At</th>
                <th className="px-5 py-4 font-semibold text-right">Total TAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/50">
              {apps.map((app) => (
                <tr key={app.id} className="transition-colors hover:bg-app-muted/20">
                  <td className="px-5 py-4">
                    <Link to={`/hiring/applications/${app.id}`} className="font-semibold text-brand-600 hover:underline">
                      {app.candidate_name || `Candidate #${app.candidate}`}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-app-text">{app.job_role_name}</p>
                    <p className="text-xs text-app-subtle mt-0.5">{app.site_name}</p>
                  </td>
                  <td className="px-5 py-4 capitalize">
                    <div className="flex items-center gap-2">
                      {app.status === 'deployed' ? (
                        <CheckCircle2 className="h-4 w-4 text-status-success" />
                      ) : (
                        <ArrowRight className="h-4 w-4 text-app-subtle" />
                      )}
                      <span className="font-medium">{app.status.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-app-secondary">
                    {new Date(app.created_at || '').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-muted/30 px-2.5 py-1 text-xs font-medium text-app-text">
                      <Clock className="h-3.5 w-3.5 text-app-secondary" />
                      {formatDuration(app.created_at || new Date().toISOString(), app.status === 'deployed' ? app.updated_at : undefined)}
                    </div>
                  </td>
                </tr>
              ))}
              {apps.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-app-subtle">
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
