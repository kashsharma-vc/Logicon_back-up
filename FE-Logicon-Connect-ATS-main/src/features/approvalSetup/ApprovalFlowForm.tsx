import { useEffect, useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import { requestTypeLabel } from '@/features/approvalSetup/labels'
import type { ApprovalFlowRow, ApprovalFlowWriteInput, RequestType } from '@/features/approvalSetup/types'

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: 'mrf', label: requestTypeLabel('mrf') },
  { value: 'client_onboarding', label: requestTypeLabel('client_onboarding') },
]

export function ApprovalFlowForm({
  formId,
  initial,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  initial: ApprovalFlowRow | null
  submitting: boolean
  errorMessage: string | null
  onSubmit: (values: ApprovalFlowWriteInput) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [trigger_type, setTriggerType] = useState<RequestType>(initial?.trigger_type ?? 'mrf')
  const [version, setVersion] = useState(initial != null ? String(initial.version) : '1')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [is_active, setIs_active] = useState(initial?.is_active ?? true)

  useEffect(() => {
    setName(initial?.name ?? '')
    setCode(initial?.code ?? '')
    setTriggerType(initial?.trigger_type ?? 'mrf')
    setVersion(initial != null ? String(initial.version) : '1')
    setDescription(initial?.description ?? '')
    setIs_active(initial?.is_active ?? true)
  }, [initial?.id, initial?.updated_at])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const v = Number(version)
    onSubmit({
      name: name.trim(),
      code: code.trim(),
      trigger_type,
      version: Number.isFinite(v) && v > 0 ? v : 1,
      description: description.trim(),
      is_active,
    })
  }

  return (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      {errorMessage ? <ErrorState message={errorMessage} /> : null}
      <Input id="af_name" label="Flow name" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} required />
      <Input id="af_code" label="Code" value={code} onChange={(e) => setCode(e.target.value)} disabled={submitting} required />
      <Select
        id="af_rt"
        label="Request type"
        value={trigger_type}
        onChange={(e) => setTriggerType(e.target.value as RequestType)}
        disabled={submitting}
      >
        {REQUEST_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      <Input
        id="af_ver"
        label="Version"
        type="number"
        min={1}
        step={1}
        value={version}
        onChange={(e) => setVersion(e.target.value)}
        disabled={submitting}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="af_desc" className="text-sm font-medium text-app-secondary">
          Description
        </label>
        <textarea
          id="af_desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          className="min-h-[4rem] w-full resize-y rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-app-secondary">
        <input type="checkbox" checked={is_active} onChange={(e) => setIs_active(e.target.checked)} disabled={submitting} />
        Active
      </label>
    </form>
  )
}
