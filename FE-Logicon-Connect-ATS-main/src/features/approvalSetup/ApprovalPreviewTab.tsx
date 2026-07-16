import { useEffect, useMemo, useState } from 'react'
import { getApprovalSetupPreview } from '@/api/approvalSetup'
import { listClients, type ClientRow } from '@/api/clients'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { requestTypeLabel } from '@/features/approvalSetup/labels'
import type { ApprovalPreviewResponse } from '@/features/approvalSetup/types'

export function ApprovalPreviewTab() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(true)

  const [requestType, setRequestType] = useState('mrf')
  const [client, setClient] = useState('')
  const [site, setSite] = useState('')

  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApprovalPreviewResponse | null>(null)

  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, label: c.name })), [clients])
  const siteOpts = useMemo(() => {
    const cid = client ? Number(client) : null
    if (!cid) return []
    return sites.filter((s) => s.client === cid).map((s) => ({ id: s.id, label: s.name }))
  }, [sites, client])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLookupsLoading(true)
      try {
        const [c, s] = await Promise.all([listClients({ search: '', page: 1 }), listSites({ search: '', page: 1 })])
        if (!cancelled) {
          setClients(c.items)
          setSites(s.items)
        }
      } catch {
        if (!cancelled) {
          setClients([])
          setSites([])
        }
      } finally {
        if (!cancelled) setLookupsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function runCheck() {
    setChecking(true)
    setError(null)
    setResult(null)
    try {
      const data = await getApprovalSetupPreview({
        request_type: requestType,
        client: client ? Number(client) : undefined,
        site: site ? Number(site) : undefined,
      })
      setResult(data)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Preview failed').message)
    } finally {
      setChecking(false)
    }
  }

  if (lookupsLoading) return <Spinner label="Loading lookups..." />

  return (
    <div className="space-y-4">
      <p className="text-sm text-app-secondary">See which approval path and people apply before work starts.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select id="pv_rt" label="Request type" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
          <option value="mrf">{requestTypeLabel('mrf')}</option>
          <option value="client_onboarding">{requestTypeLabel('client_onboarding')}</option>
        </Select>
        <Select id="pv_client" label="Client" value={client} onChange={(e) => { setClient(e.target.value); setSite('') }}>
          <option value="">Optional</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select id="pv_site" label="Site" value={site} onChange={(e) => setSite(e.target.value)} disabled={!client}>
          <option value="">Optional</option>
          {siteOpts.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.label}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Button type="button" className="w-full min-h-10" onClick={() => void runCheck()} disabled={checking}>
            {checking ? 'Checking...' : 'Check approval setup'}
          </Button>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}

      {result ? (
        <div className="space-y-4 rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Result</span>
            {result.ok ? <Badge variant="success">OK</Badge> : <Badge variant="danger">Issues</Badge>}
          </div>
          <p className="text-sm text-app-secondary">
            Request type: <span className="font-medium text-app-text">{requestTypeLabel(result.request_type)}</span>
          </p>
          <p className="text-sm text-app-secondary">
            Selected flow:{' '}
            <span className="font-medium text-app-text">
              {result.selected_flow ? `${result.selected_flow.name} (${result.selected_flow.code})` : '-'}
            </span>
          </p>
          <p className="text-sm text-app-secondary">
            Level: <span className="font-medium text-app-text">{result.selected_rule_level ?? '-'}</span>
          </p>

          {result.steps?.length ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-app-subtle">Steps</p>
              <ul className="space-y-2">
                {result.steps.map((st, i) => (
                  <li key={`${st.code}-${i}`} className="rounded-panel border border-app-border bg-app-muted px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-app-text">
                        {st.order}. {st.name}{' '}
                        <span className="font-mono text-xs text-app-secondary">({st.code})</span>
                      </span>
                      {st.assignment_ok === false ? <Badge variant="danger">Missing</Badge> : <Badge variant="success">OK</Badge>}
                    </div>
                    <dl className="mt-2 grid gap-1 text-xs text-app-secondary sm:grid-cols-2">
                      <div>
                        <dt className="text-app-subtle">Department</dt>
                        <dd>{st.department ?? '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-app-subtle">Responsible person</dt>
                        <dd>{st.responsible_person ?? '-'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-app-subtle">Source level</dt>
                        <dd>{st.assignment_level ?? '-'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.errors?.length ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-status-danger">Errors</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-status-danger">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.warnings?.length ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">Warnings</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-app-secondary">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

