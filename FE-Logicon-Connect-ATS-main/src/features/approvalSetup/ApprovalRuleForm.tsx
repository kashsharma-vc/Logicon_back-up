import { useEffect, useState, type FormEvent } from 'react'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import { requestTypeLabel } from '@/features/approvalSetup/labels'
import type { ApprovalRuleRow, ApprovalRuleWriteInput, RequestType } from '@/features/approvalSetup/types'

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: 'mrf', label: requestTypeLabel('mrf') },
  { value: 'client_onboarding', label: requestTypeLabel('client_onboarding') },
]

export type AppliesToLevel = 'org' | 'client' | 'site'

export function ApprovalRuleForm({
  formId,
  initial,
  orgId,
  flowOptions,
  clientOptions,
  siteOptions,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  initial: ApprovalRuleRow | null
  orgId: number | null
  flowOptions: { id: number; label: string }[]
  clientOptions: { id: number; label: string }[]
  siteOptions: { id: number; label: string; client?: number }[]
  submitting: boolean
  errorMessage: string | null
  onSubmit: (values: ApprovalRuleWriteInput) => void
}) {
  const [trigger_type, setTriggerType] = useState<RequestType>(initial?.trigger_type ?? 'mrf')
  const [template, setTemplate] = useState(initial != null ? String(initial.template) : '')
  const [applies, setApplies] = useState<AppliesToLevel>(() => {
    if (!initial) return 'org'
    if (initial.site != null) return 'site'
    if (initial.client != null) return 'client'
    return 'org'
  })
  const [client, setClient] = useState(initial?.client != null ? String(initial.client) : '')
  const [site, setSite] = useState(initial?.site != null ? String(initial.site) : '')
  const [is_active, setIs_active] = useState(initial?.is_active ?? true)

  useEffect(() => {
    setTriggerType(initial?.trigger_type ?? 'mrf')
    setTemplate(initial != null ? String(initial.template) : '')
    if (!initial) {
      setApplies('org')
      setClient('')
      setSite('')
      setIs_active(true)
      return
    }
    if (initial.site != null) setApplies('site')
    else if (initial.client != null) setApplies('client')
    else setApplies('org')
    setClient(initial.client != null ? String(initial.client) : '')
    setSite(initial.site != null ? String(initial.site) : '')
    setIs_active(initial.is_active)
  }, [initial?.id, initial?.updated_at])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const tid = Number(template)
    if (!Number.isFinite(tid) || tid < 1) return
    const payload: ApprovalRuleWriteInput = {
      trigger_type,
      template: tid,
      is_active,
    }
    if (orgId != null && orgId > 0) payload.org = orgId
    if (applies === 'org') {
      payload.client = null
      payload.site = null
    } else if (applies === 'client') {
      const cid = Number(client)
      payload.client = Number.isFinite(cid) && cid > 0 ? cid : null
      payload.site = null
    } else {
      const sid = Number(site)
      payload.site = Number.isFinite(sid) && sid > 0 ? sid : null
      const cid = Number(client)
      payload.client = Number.isFinite(cid) && cid > 0 ? cid : null
    }
    onSubmit(payload)
  }

  const sitesList = applies === 'site' && client ? siteOptions.filter((s) => s.client == null || s.client === Number(client)) : []

  return (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      <Select id="ar_rt" label="Request type" value={trigger_type} onChange={(e) => setTriggerType(e.target.value as RequestType)} disabled={submitting}>
        {REQUEST_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>

      <Select id="ar_flow" label="Approval flow" value={template} onChange={(e) => setTemplate(e.target.value)} disabled={submitting} required>
        <option value="">Select flow</option>
        {flowOptions.map((f) => (
          <option key={f.id} value={String(f.id)}>
            {f.label}
          </option>
        ))}
      </Select>

      <fieldset className="space-y-2 rounded-panel border border-app-border bg-app-muted p-3">
        <legend className="text-sm font-medium text-app-text">Where it applies</legend>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="applies" checked={applies === 'org'} onChange={() => { setApplies('org'); setClient(''); setSite('') }} disabled={submitting} />
          Company default
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="applies" checked={applies === 'client'} onChange={() => { setApplies('client'); setSite('') }} disabled={submitting} />
          Client specific
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="applies" checked={applies === 'site'} onChange={() => setApplies('site')} disabled={submitting} />
          Site specific
        </label>
      </fieldset>

      {applies === 'client' || applies === 'site' ? (
        <Select id="ar_client" label="Client" value={client} onChange={(e) => { setClient(e.target.value); if (applies === 'site') setSite('') }} disabled={submitting} required>
          <option value="">Select client</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.label}
            </option>
          ))}
        </Select>
      ) : null}

      {applies === 'site' ? (
        <Select id="ar_site" label="Site" value={site} onChange={(e) => setSite(e.target.value)} disabled={submitting || !client} required>
          <option value="">{client ? 'Select site' : 'Select a client first'}</option>
          {sitesList.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.label}
            </option>
          ))}
        </Select>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-app-secondary">
        <input type="checkbox" checked={is_active} onChange={(e) => setIs_active(e.target.checked)} disabled={submitting} />
        Active
      </label>
    </form>
  )
}
