import { useEffect, useRef, useState } from 'react'
import { createSalesLead, updateSalesLead } from '@/api/sales'
import { listClients, type ClientRow } from '@/api/clients'
import { parseApiError } from '@/lib/apiError'
import { ALL_LEAD_TYPES, LEAD_TYPE_LABELS } from '@/features/sales/salesUtils'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { SalesLead, SalesLeadType, SalesLeadWriteInput } from '@/types/sales'

interface Props {
  open: boolean
  initialLead: SalesLead | null
  onClose: () => void
  onSaved: () => void
}

const FORM_ID = 'sales-lead-form'

function needsExistingClient(leadType: SalesLeadType | ''): boolean {
  return leadType === 'site_expansion' || leadType === 'scope_expansion'
}

export function SalesLeadFormDrawer({ open, initialLead, onClose, onSaved }: Props) {
  const isEdit = initialLead != null

  const [leadType, setLeadType] = useState<SalesLeadType | ''>('')
  const [clientName, setClientName] = useState('')
  const [existingClient, setExistingClient] = useState<string>('')
  const [contactPerson, setContactPerson] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [leadSource, setLeadSource] = useState('')
  const [industry, setIndustry] = useState('')
  const [priority, setPriority] = useState('medium')
  const [expectedStartDate, setExpectedStartDate] = useState('')
  const [expectedContractMonths, setExpectedContractMonths] = useState('')
  const [estimatedMonthlyValue, setEstimatedMonthlyValue] = useState('')
  const [rfpRequired, setRfpRequired] = useState(false)
  const [rfqRequired, setRfqRequired] = useState(false)
  const [requirementDetails, setRequirementDetails] = useState('')
  const [initialBusinessRequirement, setInitialBusinessRequirement] = useState('')
  const [notes, setNotes] = useState('')

  const [clients, setClients] = useState<ClientRow[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const initialized = useRef(false)

  useEffect(() => {
    if (!open) {
      initialized.current = false
      return
    }
    if (initialized.current) return
    initialized.current = true

    if (initialLead) {
      setLeadType(initialLead.lead_type)
      setClientName(initialLead.client_name)
      setExistingClient(initialLead.existing_client != null ? String(initialLead.existing_client) : '')
      setContactPerson(initialLead.client_contact_person ?? '')
      setClientEmail(initialLead.client_email ?? '')
      setClientPhone(initialLead.client_phone ?? '')
      setLeadSource(initialLead.lead_source ?? '')
      setIndustry(initialLead.industry ?? '')
      setPriority(initialLead.priority ?? 'medium')
      setExpectedStartDate(initialLead.expected_start_date ?? '')
      setExpectedContractMonths(
        initialLead.expected_contract_months != null ? String(initialLead.expected_contract_months) : '',
      )
      setEstimatedMonthlyValue(
        initialLead.estimated_monthly_value != null ? String(initialLead.estimated_monthly_value) : '',
      )
      setRfpRequired(Boolean(initialLead.rfp_required))
      setRfqRequired(Boolean(initialLead.rfq_required))
      setRequirementDetails(initialLead.requirement_details ?? '')
      setInitialBusinessRequirement(initialLead.initial_business_requirement ?? '')
      setNotes(initialLead.sales_remarks ?? '')
    } else {
      setLeadType('')
      setClientName('')
      setExistingClient('')
      setContactPerson('')
      setClientEmail('')
      setClientPhone('')
      setLeadSource('')
      setIndustry('')
      setPriority('medium')
      setExpectedStartDate('')
      setExpectedContractMonths('')
      setEstimatedMonthlyValue('')
      setRfpRequired(false)
      setRfqRequired(false)
      setRequirementDetails('')
      setInitialBusinessRequirement('')
      setNotes('')
    }
    setError(null)
    setFieldErrors({})
  }, [open, initialLead])

  useEffect(() => {
    if (!open) return
    setClientsLoading(true)
    listClients({ is_active: true, page: 1 })
      .then((res) => setClients(res.items))
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false))
  }, [open])

  function handleClientSelect(clientId: string) {
    setExistingClient(clientId)
    if (clientId && leadType !== 'new_client') {
      const found = clients.find((c) => String(c.id) === clientId)
      if (found && !clientName) setClientName(found.name)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!leadType) {
      setFieldErrors({ lead_type: 'Lead type is required.' })
      return
    }
    if (!clientName.trim()) {
      setFieldErrors({ client_name: 'Client name is required.' })
      return
    }
    if (needsExistingClient(leadType) && !existingClient) {
      setFieldErrors({ existing_client: 'Existing client is required for this lead type.' })
      return
    }

    const payload: SalesLeadWriteInput = {
      lead_type: leadType,
      client_name: clientName.trim(),
      existing_client: existingClient ? Number(existingClient) : null,
      client_contact_person: contactPerson.trim() || undefined,
      client_email: clientEmail.trim() || undefined,
      client_phone: clientPhone.trim() || undefined,
      lead_source: leadSource.trim() || undefined,
      industry: industry.trim() || undefined,
      priority: priority || undefined,
      expected_start_date: expectedStartDate || null,
      expected_contract_months: expectedContractMonths ? Number(expectedContractMonths) : null,
      estimated_monthly_value: estimatedMonthlyValue ? estimatedMonthlyValue : null,
      rfp_required: rfpRequired,
      rfq_required: rfqRequired,
      requirement_details: requirementDetails.trim() || undefined,
      initial_business_requirement: initialBusinessRequirement.trim() || undefined,
      sales_remarks: notes.trim() || undefined,
    }

    setSubmitting(true)
    try {
      if (isEdit && initialLead) {
        await updateSalesLead(initialLead.id, payload)
      } else {
        await createSalesLead(payload)
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      const parsed = parseApiError(e, 'Save failed')
      setError(parsed.message)
      setFieldErrors(parsed.fields)
    } finally {
      setSubmitting(false)
    }
  }

  const showExistingClient = needsExistingClient(leadType)
  const showRenewalWarning = leadType === 'renewal'

  return (
    <Drawer
      open={open}
      title={isEdit ? 'Edit lead' : 'New sales lead'}
      description={isEdit ? `Editing lead for ${initialLead?.client_name}` : 'Create a new sales opportunity.'}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting || !leadType}>
            {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create lead'}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? (
          <p className="rounded-panel bg-status-danger/8 px-4 py-3 text-sm text-status-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Select
          id="sl-lead-type"
          label="Lead type *"
          value={leadType}
          onChange={(e) => {
            setLeadType(e.target.value as SalesLeadType | '')
            if (e.target.value === 'new_client') setExistingClient('')
          }}
          error={fieldErrors.lead_type}
        >
          <option value="">Select lead type…</option>
          {ALL_LEAD_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEAD_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>

        {showRenewalWarning ? (
          <p className="rounded-panel border border-status-warning/30 bg-status-warning/8 px-4 py-3 text-sm text-status-warning">
            Renewal conversion to contract is not enabled yet. You can still create and track the lead.
          </p>
        ) : null}

        {showExistingClient ? (
          <Select
            id="sl-existing-client"
            label="Existing client *"
            value={existingClient}
            onChange={(e) => handleClientSelect(e.target.value)}
            disabled={clientsLoading}
            error={fieldErrors.existing_client}
          >
            <option value="">{clientsLoading ? 'Loading…' : 'Select client…'}</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name} ({c.code})
              </option>
            ))}
          </Select>
        ) : null}

        <Input
          id="sl-client-name"
          label="Client name *"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="e.g. Acme Corp"
          error={fieldErrors.client_name}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="sl-contact-person"
            label="Contact person"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Amit Kulkarni"
            error={fieldErrors.client_contact_person}
          />
          <Input
            id="sl-client-phone"
            label="Client phone"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="9876500010"
            error={fieldErrors.client_phone}
          />
        </div>

        <Input
          id="sl-client-email"
          label="Client email"
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="amit.kulkarni@acme.example.com"
          error={fieldErrors.client_email}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="sl-lead-source"
            label="Lead source"
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
            placeholder="Referral"
            error={fieldErrors.lead_source}
          />
          <Input
            id="sl-industry"
            label="Industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Manufacturing"
            error={fieldErrors.industry}
          />
        </div>

        <Select
          id="sl-priority"
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          error={fieldErrors.priority}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>

        <div className="grid gap-3 rounded-panel border border-app-border bg-app-muted/30 p-3 text-sm text-app-text sm:grid-cols-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rfpRequired}
              onChange={(e) => setRfpRequired(e.target.checked)}
              className="h-4 w-4 rounded border-app-border"
            />
            RFP required
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rfqRequired}
              onChange={(e) => setRfqRequired(e.target.checked)}
              className="h-4 w-4 rounded border-app-border"
            />
            RFQ required
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sl-requirement-details" className="text-sm font-medium text-app-secondary">
            Requirement details
          </label>
          <textarea
            id="sl-requirement-details"
            value={requirementDetails}
            onChange={(e) => setRequirementDetails(e.target.value)}
            rows={3}
            placeholder="Integrated facility management manpower for the Pune plant."
            className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          {fieldErrors.requirement_details ? (
            <p className="text-sm text-status-danger">{fieldErrors.requirement_details}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sl-business-requirement" className="text-sm font-medium text-app-secondary">
            Initial business requirement
          </label>
          <textarea
            id="sl-business-requirement"
            value={initialBusinessRequirement}
            onChange={(e) => setInitialBusinessRequirement(e.target.value)}
            rows={3}
            placeholder="Housekeeping, technical support, and janitorial manpower."
            className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          {fieldErrors.initial_business_requirement ? (
            <p className="text-sm text-status-danger">{fieldErrors.initial_business_requirement}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sl-notes" className="text-sm font-medium text-app-secondary">
            Notes / remarks
          </label>
          <textarea
            id="sl-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Background, context, or any notes…"
            className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          {fieldErrors.sales_remarks ? (
            <p className="text-sm text-status-danger">{fieldErrors.sales_remarks}</p>
          ) : null}
        </div>
      </form>
    </Drawer>
  )
}
