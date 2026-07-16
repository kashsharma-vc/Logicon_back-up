import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import { ASSIGNMENT_MODE_LABEL } from '@/features/approvalSetup/labels'
import type { ApprovalStepRow, ApprovalStepWriteInput, AssignmentMode, ActorType } from '@/features/approvalSetup/types'

const ACTOR_TYPES: { value: ActorType; label: string }[] = [
  { value: 'internal', label: 'Internal' },
  { value: 'client', label: 'Client' },
  { value: 'field', label: 'Field' },
]

function parseApprove(initial: ApprovalStepRow | null): { kind: 'next' | 'end' | 'other'; code: string } {
  if (!initial) return { kind: 'next', code: '' }
  const v = initial.on_approve_next ?? ''
  if (v === 'END') return { kind: 'end', code: '' }
  if (!v) return { kind: 'next', code: '' }
  return { kind: 'other', code: v }
}

function parseTarget(initial: ApprovalStepRow | null, field: 'on_reject_target' | 'on_request_changes_target'): { final: boolean; code: string } {
  if (!initial) return { final: true, code: '' }
  const v = initial[field] ?? ''
  if (!v) return { final: true, code: '' }
  return { final: false, code: v }
}

export function ApprovalStepForm({
  formId,
  initial,
  flowId,
  flowOptions,
  stepsInFlow,
  submitting,
  errorMessage,
  onSubmit,
  onTemplateChange,
}: {
  formId: string
  initial: ApprovalStepRow | null
  flowId: number | null
  flowOptions: { id: number; label: string }[]
  stepsInFlow: ApprovalStepRow[]
  submitting: boolean
  errorMessage: string | null
  onSubmit: (values: ApprovalStepWriteInput) => void
  /** When creating, parent can load sibling steps after user picks a flow. */
  onTemplateChange?: (templateId: number) => void
}) {
  const [template, setTemplate] = useState(flowId != null ? String(flowId) : '')
  const [order, setOrder] = useState(initial != null ? String(initial.order) : '1')
  const [code, setCode] = useState(initial?.code ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [assignment_mode, setAssignment_mode] = useState<AssignmentMode>(initial?.assignment_mode ?? 'named_user')
  const [actor_type, setActor_type] = useState<ActorType>(initial?.actor_type ?? 'internal')
  const [approve, setApprove] = useState(() => parseApprove(initial))
  const [reject, setReject] = useState(() => parseTarget(initial, 'on_reject_target'))
  const [reqCh, setReqCh] = useState(() => parseTarget(initial, 'on_request_changes_target'))
  const [requires_comment_on_reject, setRcr] = useState(initial?.requires_comment_on_reject ?? true)
  const [requires_comment_on_request_changes, setRcrc] = useState(initial?.requires_comment_on_request_changes ?? true)
  const [sla_hours, setSla] = useState(initial?.sla_hours != null ? String(initial.sla_hours) : '')

  useEffect(() => {
    setTemplate(flowId != null ? String(flowId) : initial?.template != null ? String(initial.template) : '')
    setOrder(initial != null ? String(initial.order) : '1')
    setCode(initial?.code ?? '')
    setName(initial?.name ?? '')
    setAssignment_mode(initial?.assignment_mode ?? 'named_user')
    setActor_type(initial?.actor_type ?? 'internal')
    setApprove(parseApprove(initial))
    setReject(parseTarget(initial, 'on_reject_target'))
    setReqCh(parseTarget(initial, 'on_request_changes_target'))
    setRcr(initial?.requires_comment_on_reject ?? true)
    setRcrc(initial?.requires_comment_on_request_changes ?? true)
    setSla(initial?.sla_hours != null ? String(initial.sla_hours) : '')
  }, [initial?.id, initial?.code, flowId])

  const otherStepOptions = useMemo(() => {
    const selfCode = initial?.code
    return stepsInFlow
      .filter((s) => s.code !== selfCode)
      .map((s) => ({ code: s.code, label: `${s.order}. ${s.name} (${s.code})` }))
  }, [stepsInFlow, initial?.code])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const tid = Number(template)
    if (!Number.isFinite(tid) || tid < 1) return
    const ord = Number(order)
    let on_approve_next = ''
    if (approve.kind === 'end') on_approve_next = 'END'
    else if (approve.kind === 'other') on_approve_next = approve.code.trim()
    const on_reject_target = reject.final ? '' : reject.code.trim()
    const on_request_changes_target = reqCh.final ? '' : reqCh.code.trim()
    const sla = sla_hours.trim() ? Number(sla_hours) : null
    onSubmit({
      template: tid,
      order: Number.isFinite(ord) && ord > 0 ? ord : 1,
      code: code.trim(),
      name: name.trim(),
      assignment_mode,
      actor_type,
      on_approve_next,
      on_reject_target,
      on_request_changes_target,
      requires_comment_on_reject,
      requires_comment_on_request_changes,
      sla_hours: sla != null && Number.isFinite(sla) && sla > 0 ? sla : null,
    })
  }

  return (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      <Select
        id="as_flow"
        label="Approval flow"
        value={template}
        onChange={(e) => {
          const v = e.target.value
          setTemplate(v)
          const n = Number(v)
          if (onTemplateChange && Number.isFinite(n) && n > 0) onTemplateChange(n)
        }}
        disabled={submitting || initial != null}
        required
      >
        <option value="">Select flow</option>
        {flowOptions.map((f) => (
          <option key={f.id} value={String(f.id)}>
            {f.label}
          </option>
        ))}
      </Select>

      <Input id="as_order" label="Order" type="number" min={1} step={1} value={order} onChange={(e) => setOrder(e.target.value)} disabled={submitting} />
      <Input id="as_code" label="Step code" value={code} onChange={(e) => setCode(e.target.value)} disabled={submitting} required />
      <Input id="as_name" label="Step name" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} required />

      <Select
        id="as_am"
        label="Responsible type"
        value={assignment_mode}
        onChange={(e) => setAssignment_mode(e.target.value as AssignmentMode)}
        disabled={submitting}
      >
        <option value="named_user">{ASSIGNMENT_MODE_LABEL.named_user}</option>
        <option value="queue" disabled title="Not available yet">
          {ASSIGNMENT_MODE_LABEL.queue}
        </option>
        <option value="claim" disabled title="Not available yet">
          {ASSIGNMENT_MODE_LABEL.claim}
        </option>
      </Select>

      <Select id="as_actor" label="Actor type" value={actor_type} onChange={(e) => setActor_type(e.target.value as ActorType)} disabled={submitting}>
        {ACTOR_TYPES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </Select>

      <fieldset className="space-y-2 rounded-panel border border-app-border bg-app-muted p-3">
        <legend className="text-sm font-medium text-app-text">When approved</legend>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="apv" checked={approve.kind === 'next'} onChange={() => setApprove({ kind: 'next', code: '' })} disabled={submitting} />
          Next step (default order)
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="apv" checked={approve.kind === 'end'} onChange={() => setApprove({ kind: 'end', code: '' })} disabled={submitting} />
          Finish approval
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="apv" checked={approve.kind === 'other'} onChange={() => setApprove({ kind: 'other', code: approve.code })} disabled={submitting} />
          Go to specific step
        </label>
        {approve.kind === 'other' ? (
          <Select id="as_apv_code" label="Target step" value={approve.code} onChange={(e) => setApprove({ kind: 'other', code: e.target.value })} disabled={submitting}>
            <option value="">Select step</option>
            {otherStepOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2 rounded-panel border border-app-border bg-app-muted p-3">
        <legend className="text-sm font-medium text-app-text">When rejected</legend>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="rej" checked={reject.final} onChange={() => setReject({ final: true, code: '' })} disabled={submitting} />
          End as rejected
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input type="radio" name="rej" checked={!reject.final} onChange={() => setReject({ final: false, code: reject.code })} disabled={submitting} />
          Send back to step
        </label>
        {!reject.final ? (
          <Select id="as_rej_code" label="Target step" value={reject.code} onChange={(e) => setReject({ final: false, code: e.target.value })} disabled={submitting}>
            <option value="">Select step</option>
            {otherStepOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : null}
      </fieldset>



      <label className="flex items-center gap-2 text-sm text-app-secondary">
        <input type="checkbox" checked={requires_comment_on_reject} onChange={(e) => setRcr(e.target.checked)} disabled={submitting} />
        Reject comment required
      </label>

      <Input
        id="as_sla"
        label="SLA hours (optional)"
        type="number"
        min={1}
        step={1}
        value={sla_hours}
        onChange={(e) => setSla(e.target.value)}
        disabled={submitting}
      />
    </form>
  )
}
