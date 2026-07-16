import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { ErrorState } from '@/components/ui/ErrorState'
import { requestTypeLabel } from '@/features/approvalSetup/labels'
import type { ApprovalAssignmentRow, ApprovalAssignmentWriteInput, RequestType } from '@/features/approvalSetup/types'
import type { AppliesToLevel } from '@/features/approvalSetup/ApprovalRuleForm'

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: 'mrf', label: requestTypeLabel('mrf') },
  { value: 'client_onboarding', label: requestTypeLabel('client_onboarding') },
]

export function ApprovalAssignmentForm({
  formId,
  initial,
  orgId,
  stepCodeOptions,
  clientOptions,
  siteOptions,
  departmentOptions,
  userOptions,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  initial: ApprovalAssignmentRow | null
  orgId: number | null
  stepCodeOptions: { code: string; label: string }[]
  clientOptions: { id: number; label: string }[]
  siteOptions: { id: number; label: string; client?: number }[]
  departmentOptions: { id: number; label: string }[]
  userOptions: { id: number; label: string; department?: number | null }[]
  submitting: boolean
  errorMessage: string | null
  onSubmit: (values: ApprovalAssignmentWriteInput) => void
}) {
  const [trigger_type, setTriggerType] = useState<RequestType>(initial?.trigger_type ?? 'mrf')
  const [step_code, setStep_code] = useState(initial?.step_code ?? '')
  const [applies, setApplies] = useState<AppliesToLevel>(() => {
    if (!initial) return 'org'
    if (initial.site != null) return 'site'
    if (initial.client != null) return 'client'
    return 'org'
  })
  const [client, setClient] = useState(initial?.client != null ? String(initial.client) : '')
  const [site, setSite] = useState(initial?.site != null ? String(initial.site) : '')
  const [department, setDepartment] = useState(initial?.department != null ? String(initial.department) : '')
  const [named_user, setNamed_user] = useState(initial?.named_user != null ? String(initial.named_user) : '')
  const [effective_from, setFrom] = useState(initial?.effective_from ?? '')
  const [effective_to, setTo] = useState(initial?.effective_to ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [is_active, setIs_active] = useState(initial?.is_active ?? true)

  useEffect(() => {
    setTriggerType(initial?.trigger_type ?? 'mrf')
    setStep_code(initial?.step_code ?? '')
    if (!initial) {
      setApplies('org')
      setClient('')
      setSite('')
      setDepartment('')
      setNamed_user('')
      setFrom('')
      setTo('')
      setNote('')
      setIs_active(true)
      return
    }
    if (initial.site != null) setApplies('site')
    else if (initial.client != null) setApplies('client')
    else setApplies('org')
    setClient(initial.client != null ? String(initial.client) : '')
    setSite(initial.site != null ? String(initial.site) : '')
    setDepartment(initial.department != null ? String(initial.department) : '')
    setNamed_user(initial.named_user != null ? String(initial.named_user) : '')
    setFrom(initial.effective_from ?? '')
    setTo(initial.effective_to ?? '')
    setNote(initial.note ?? '')
    setIs_active(initial.is_active)
  }, [initial?.id, initial?.updated_at])

  const deptMismatch = useMemo(() => {
    if (!department || !named_user) return false
    const did = Number(department)
    const uid = Number(named_user)
    const u = userOptions.find((x) => x.id === uid)
    if (!u || u.department == null) return false
    return u.department !== did
  }, [department, named_user, userOptions])

  const sitesList =
    applies === 'site' && client ? siteOptions.filter((s) => s.client == null || s.client === Number(client)) : []

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!step_code.trim()) return
    const payload: ApprovalAssignmentWriteInput = {
      trigger_type,
      step_code: step_code.trim(),
      assignment_mode: 'named_user',
      is_active,
      note: note.trim() || undefined,
      effective_from: effective_from.trim() || null,
      effective_to: effective_to.trim() || null,
    }
    if (orgId != null && orgId > 0) payload.org = orgId
    payload.department = department.trim() ? Number(department) : null
    payload.named_user = named_user.trim() ? Number(named_user) : null
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

  return (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      <Select id="aa_rt" label="Request type" value={trigger_type} onChange={(e) => setTriggerType(e.target.value as RequestType)} disabled={submitting}>
        {REQUEST_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>

      <Select id="aa_step" label="Approval step" value={step_code} onChange={(e) => setStep_code(e.target.value)} disabled={submitting} required>
        <option value="">Select step</option>
        {stepCodeOptions.map((s) => (
          <option key={s.code} value={s.code}>
            {s.label}
          </option>
        ))}
      </Select>

      <fieldset className="space-y-2 rounded-panel border border-app-border bg-app-muted p-3">
        <legend className="text-sm font-medium text-app-text">Where it applies</legend>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="aa_applies" checked={applies === 'org'} onChange={() => { setApplies('org'); setClient(''); setSite('') }} disabled={submitting} />
          Company default
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="aa_applies" checked={applies === 'client'} onChange={() => { setApplies('client'); setSite('') }} disabled={submitting} />
          Client specific
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="aa_applies" checked={applies === 'site'} onChange={() => setApplies('site')} disabled={submitting} />
          Site specific
        </label>
      </fieldset>

      {applies === 'client' || applies === 'site' ? (
        <Select id="aa_client" label="Client" value={client} onChange={(e) => { setClient(e.target.value); setSite('') }} disabled={submitting} required>
          <option value="">Select client</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.label}
            </option>
          ))}
        </Select>
      ) : null}

      {applies === 'site' ? (
        <Select id="aa_site" label="Site" value={site} onChange={(e) => setSite(e.target.value)} disabled={submitting || !client} required>
          <option value="">{client ? 'Select site' : 'Select a client first'}</option>
          {sitesList.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.label}
            </option>
          ))}
        </Select>
      ) : null}

      <Select id="aa_dept" label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} disabled={submitting}>
        <option value="">Optional</option>
        {departmentOptions.map((d) => (
          <option key={d.id} value={String(d.id)}>
            {d.label}
          </option>
        ))}
      </Select>

      <Select id="aa_user" label="Responsible person" value={named_user} onChange={(e) => setNamed_user(e.target.value)} disabled={submitting} required>
        <option value="">Select user</option>
        {userOptions.map((u) => (
          <option key={u.id} value={String(u.id)}>
            {u.label}
          </option>
        ))}
      </Select>

      {deptMismatch ? (
        <p className="text-sm text-status-warning">
          Selected person is not in the chosen department. You can still save; the server will validate.
        </p>
      ) : null}

      <Input id="aa_from" label="Effective from (YYYY-MM-DD)" value={effective_from} onChange={(e) => setFrom(e.target.value)} disabled={submitting} />
      <Input id="aa_to" label="Effective to (YYYY-MM-DD)" value={effective_to} onChange={(e) => setTo(e.target.value)} disabled={submitting} />
      <div className="flex flex-col gap-1">
        <label htmlFor="aa_note" className="text-sm font-medium text-app-secondary">
          Note
        </label>
        <textarea
          id="aa_note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={submitting}
          className="min-h-[3rem] w-full resize-y rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-app-secondary">
        <input type="checkbox" checked={is_active} onChange={(e) => setIs_active(e.target.checked)} disabled={submitting} />
        Active
      </label>
    </form>
  )
}
