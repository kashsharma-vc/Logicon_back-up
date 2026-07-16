import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Info, ListFilter, Plus } from 'lucide-react'
import {
  createProposalComponentRule,
  deleteProposalComponentRule,
  listProposalComponentRules,
  updateProposalComponentRule,
} from '@/api/sales'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import type { ProposalCalculationType, ProposalComponentRule, ProposalComponentRuleWriteInput } from '@/types/sales'

// ─── Constants ────────────────────────────────────────────────────────────────

const CALC_TYPE_OPTIONS: { value: ProposalCalculationType; label: string }[] = [
  { value: 'percent_of_basic', label: 'Percent of basic' },
  { value: 'percent_of_gross', label: 'Percent of gross' },
  { value: 'percent_of_other', label: 'Percent of other' },
  { value: 'fixed', label: 'Fixed amount' },
]

const CALC_TYPE_LABELS: Record<ProposalCalculationType, string> = Object.fromEntries(
  CALC_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ProposalCalculationType, string>

const COMPONENT_TYPE_OPTIONS = ['earning', 'deduction', 'employer_contribution', 'other']

/**
 * Required rule codes for proposal generation
 */
const REQUIRED_RULE_CODES = [
  'da',
  'hra',
  'washing',
  'other_allowance',
  'ee_pf',
  'ee_esic',
  'ee_pt',
  'er_pf',
  'er_esic',
  'bonus',
  'leave',
  'gratuity',
  'nh_fh',
  'lwf',
  'uniform',
  'bgc',
  'payroll_compliance',
  'tools',
] as const

/**
 * Templates for required rule codes with default values
 */
interface RuleTemplate {
  code: string
  component_name: string
  component_type: string
  calculation_type: ProposalCalculationType
  description: string
}

const RULE_TEMPLATES: RuleTemplate[] = [
  { code: 'da', component_name: 'Dearness Allowance', component_type: 'earning', calculation_type: 'percent_of_basic', description: 'DA as percentage of basic' },
  { code: 'hra', component_name: 'House Rent Allowance', component_type: 'earning', calculation_type: 'percent_of_basic', description: 'HRA as percentage of basic' },
  { code: 'washing', component_name: 'Washing Allowance', component_type: 'earning', calculation_type: 'fixed', description: 'Fixed washing allowance' },
  { code: 'other_allowance', component_name: 'Other Allowance', component_type: 'earning', calculation_type: 'fixed', description: 'Other fixed allowances' },
  { code: 'ee_pf', component_name: 'Employee PF', component_type: 'deduction', calculation_type: 'percent_of_basic', description: 'Employee PF contribution' },
  { code: 'ee_esic', component_name: 'Employee ESIC', component_type: 'deduction', calculation_type: 'percent_of_gross', description: 'Employee ESIC contribution' },
  { code: 'ee_pt', component_name: 'Professional Tax', component_type: 'deduction', calculation_type: 'fixed', description: 'Professional tax deduction' },
  { code: 'er_pf', component_name: 'Employer PF', component_type: 'employer_contribution', calculation_type: 'percent_of_basic', description: 'Employer PF contribution' },
  { code: 'er_esic', component_name: 'Employer ESIC', component_type: 'employer_contribution', calculation_type: 'percent_of_gross', description: 'Employer ESIC contribution' },
  { code: 'bonus', component_name: 'Bonus', component_type: 'earning', calculation_type: 'percent_of_basic', description: 'Statutory bonus' },
  { code: 'leave', component_name: 'Leave Encashment', component_type: 'earning', calculation_type: 'percent_of_basic', description: 'Leave encashment provision' },
  { code: 'gratuity', component_name: 'Gratuity', component_type: 'employer_contribution', calculation_type: 'percent_of_basic', description: 'Gratuity provision' },
  { code: 'nh_fh', component_name: 'National/Festival Holidays', component_type: 'earning', calculation_type: 'percent_of_basic', description: 'Holiday provision' },
  { code: 'lwf', component_name: 'Labour Welfare Fund', component_type: 'employer_contribution', calculation_type: 'fixed', description: 'LWF contribution' },
  { code: 'uniform', component_name: 'Uniform', component_type: 'other', calculation_type: 'fixed', description: 'Uniform provision' },
  { code: 'bgc', component_name: 'Background Check', component_type: 'other', calculation_type: 'fixed', description: 'BGC cost' },
  { code: 'payroll_compliance', component_name: 'Payroll & Compliance', component_type: 'other', calculation_type: 'percent_of_gross', description: 'Payroll processing cost' },
  { code: 'tools', component_name: 'Tools & Equipment', component_type: 'other', calculation_type: 'fixed', description: 'Tools provision' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTypeVariant(
  t: ProposalCalculationType,
): 'info' | 'success' | 'warning' | 'neutral' | 'attention' {
  if (t === 'fixed') return 'info'
  if (t === 'percent_of_basic') return 'success'
  if (t === 'percent_of_gross') return 'warning'
  return 'attention'
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return d
}

function fmt(v?: string | null) {
  return v ?? '—'
}

// ─── Blank form state ─────────────────────────────────────────────────────────

interface FormState {
  code: string
  component_name: string
  component_type: string
  calculation_type: ProposalCalculationType
  percentage: string
  fixed_amount: string
  base_component_code: string
  sort_order: string
  is_active: boolean
  effective_from: string
  effective_to: string
  remarks: string
}

const BLANK: FormState = {
  code: '',
  component_name: '',
  component_type: 'earning',
  calculation_type: 'percent_of_basic',
  percentage: '',
  fixed_amount: '',
  base_component_code: '',
  sort_order: '0',
  is_active: true,
  effective_from: '',
  effective_to: '',
  remarks: '',
}

function ruleToForm(r: ProposalComponentRule): FormState {
  return {
    code: r.code,
    component_name: r.component_name,
    component_type: r.component_type,
    calculation_type: r.calculation_type,
    percentage: r.percentage ?? '',
    fixed_amount: r.fixed_amount ?? '',
    base_component_code: r.base_component_code ?? '',
    sort_order: String(r.sort_order),
    is_active: r.is_active,
    effective_from: r.effective_from ?? '',
    effective_to: r.effective_to ?? '',
    remarks: r.remarks ?? '',
  }
}

function formToPayload(f: FormState): ProposalComponentRuleWriteInput {
  const needsPercent =
    f.calculation_type === 'percent_of_basic' ||
    f.calculation_type === 'percent_of_gross' ||
    f.calculation_type === 'percent_of_other'
  const needsFixed = f.calculation_type === 'fixed'
  const needsBase = f.calculation_type === 'percent_of_other'

  return {
    code: f.code.trim(),
    component_name: f.component_name.trim(),
    component_type: f.component_type,
    calculation_type: f.calculation_type,
    percentage: needsPercent ? f.percentage || null : null,
    fixed_amount: needsFixed ? f.fixed_amount || null : null,
    base_component_code: needsBase ? f.base_component_code.trim() || undefined : undefined,
    sort_order: Number(f.sort_order) || 0,
    is_active: f.is_active,
    effective_from: f.effective_from || null,
    effective_to: f.effective_to || null,
    remarks: f.remarks.trim() || undefined,
  }
}

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {}
  if (!f.code.trim()) e.code = 'Code is required'
  if (!f.component_name.trim()) e.component_name = 'Name is required'
  if (!f.component_type) e.component_type = 'Type is required'
  if (
    (f.calculation_type === 'percent_of_basic' ||
      f.calculation_type === 'percent_of_gross' ||
      f.calculation_type === 'percent_of_other') &&
    !f.percentage.trim()
  ) {
    e.percentage = 'Percentage is required'
  }
  if (f.calculation_type === 'fixed' && !f.fixed_amount.trim()) {
    e.fixed_amount = 'Amount is required'
  }
  if (f.calculation_type === 'percent_of_other' && !f.base_component_code.trim()) {
    e.base_component_code = 'Base component code is required'
  }
  return e
}

// ─── Form drawer ──────────────────────────────────────────────────────────────

function RuleFormDrawer({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: ProposalComponentRule | null
  onClose: () => void
  onSaved: (r: ProposalComponentRule) => void
}) {
  const [form, setForm] = useState<FormState>(BLANK)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  useEffect(() => {
    if (open) {
      setForm(editing ? ruleToForm(editing) : BLANK)
      setErrors({})
      setApiError(null)
      setSelectedTemplate('')
    }
  }, [open, editing])

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
    setErrors((prev) => ({ ...prev, [k]: undefined }))
  }

  function applyTemplate(templateCode: string) {
    const template = RULE_TEMPLATES.find((t) => t.code === templateCode)
    if (template) {
      setForm((prev) => ({
        ...prev,
        code: template.code,
        component_name: template.component_name,
        component_type: template.component_type,
        calculation_type: template.calculation_type,
      }))
      setErrors({})
    }
    setSelectedTemplate(templateCode)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    setApiError(null)
    try {
      const payload = formToPayload(form)
      const saved = editing
        ? await updateProposalComponentRule(editing.id, payload)
        : await createProposalComponentRule(payload)
      onSaved(saved)
    } catch (err) {
      setApiError(parseApiError(err, 'Failed to save rule').message)
    } finally {
      setSaving(false)
    }
  }

  const showPercent =
    form.calculation_type === 'percent_of_basic' ||
    form.calculation_type === 'percent_of_gross' ||
    form.calculation_type === 'percent_of_other'
  const showFixed = form.calculation_type === 'fixed'
  const showBase = form.calculation_type === 'percent_of_other'

  return (
    <Drawer
      open={open}
      title={editing ? 'Edit component rule' : 'New component rule'}
      description="Define how a salary component is calculated in proposals."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="rule-form" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create rule'}
          </Button>
        </div>
      }
    >
      <form id="rule-form" onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <p className="rounded-panel bg-status-danger/10 px-3 py-2 text-sm text-status-danger">{apiError}</p>
        )}

        {/* Template selector - only show when creating new rule */}
        {!editing && (
          <div className="rounded-panel border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-800 dark:bg-brand-950/30">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Quick fill from template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full min-h-9 rounded-panel border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Select a required code...</option>
              {RULE_TEMPLATES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} — {t.component_name} ({t.description})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Identification */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="rule-code"
            label="Code"
            value={form.code}
            onChange={(e) => set('code', e.target.value)}
            error={errors.code}
            placeholder="e.g. BASIC"
          />
          <Select
            id="rule-sort"
            label="Sort order"
            value={form.sort_order}
            onChange={(e) => set('sort_order', e.target.value)}
          >
            {Array.from({ length: 21 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </div>

        <Input
          id="rule-name"
          label="Component name"
          value={form.component_name}
          onChange={(e) => set('component_name', e.target.value)}
          error={errors.component_name}
          placeholder="e.g. Basic salary"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            id="rule-comp-type"
            label="Component type"
            value={form.component_type}
            onChange={(e) => set('component_type', e.target.value)}
            error={errors.component_type}
          >
            {COMPONENT_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </Select>

          <Select
            id="rule-calc-type"
            label="Calculation type"
            value={form.calculation_type}
            onChange={(e) => set('calculation_type', e.target.value as ProposalCalculationType)}
          >
            {CALC_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Conditional amount fields */}
        {showPercent && (
          <Input
            id="rule-percentage"
            label="Percentage (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.percentage}
            onChange={(e) => set('percentage', e.target.value)}
            error={errors.percentage}
            placeholder="e.g. 40.00"
          />
        )}

        {showFixed && (
          <Input
            id="rule-fixed"
            label="Fixed amount"
            type="number"
            step="0.01"
            min="0"
            value={form.fixed_amount}
            onChange={(e) => set('fixed_amount', e.target.value)}
            error={errors.fixed_amount}
            placeholder="e.g. 5000.00"
          />
        )}

        {showBase && (
          <Input
            id="rule-base-code"
            label="Base component code"
            value={form.base_component_code}
            onChange={(e) => set('base_component_code', e.target.value)}
            error={errors.base_component_code}
            placeholder="e.g. BASIC"
          />
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="rule-eff-from"
            label="Effective from"
            type="date"
            value={form.effective_from}
            onChange={(e) => set('effective_from', e.target.value)}
          />
          <Input
            id="rule-eff-to"
            label="Effective to"
            type="date"
            value={form.effective_to}
            onChange={(e) => set('effective_to', e.target.value)}
          />
        </div>

        <Input
          id="rule-remarks"
          label="Remarks"
          value={form.remarks}
          onChange={(e) => set('remarks', e.target.value)}
          placeholder="Optional notes"
        />

        {/* Active toggle */}
        <label className="flex cursor-pointer items-center gap-3 rounded-panel border border-app-border px-4 py-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-brand-600"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
          />
          <span className="text-sm text-app-text">Active</span>
        </label>
      </form>
    </Drawer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProposalComponentRulesPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canWrite = hasAnyCapability(meCaps, [CAP.SALES_PROPOSAL_UPDATE])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rowActionError, setRowActionError] = useState<string | null>(null)
  const [rows, setRows] = useState<ProposalComponentRule[]>([])

  // Filters
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active')
  const [filterCalcType, setFilterCalcType] = useState<string>('')
  const [filterCompType, setFilterCompType] = useState<string>('')
  const [filterScope, setFilterScope] = useState<'all' | 'global' | 'org'>('all')
  const [filterMissing, setFilterMissing] = useState(false)

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ProposalComponentRule | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMode, setConfirmMode] = useState<'deactivate' | 'delete'>('deactivate')
  const [confirmTarget, setConfirmTarget] = useState<ProposalComponentRule | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    listProposalComponentRules()
      .then((res) => setRows(res.items))
      .catch((e: unknown) => setError(parseApiError(e, 'Failed to load component rules').message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Compute present and missing required codes (only active rules count)
  const activeRuleCodes = useMemo(() => {
    const codes = new Set<string>()
    rows.filter((r) => r.is_active).forEach((r) => codes.add(r.code.toLowerCase()))
    return codes
  }, [rows])

  const missingRequiredCodes = useMemo(() => {
    return REQUIRED_RULE_CODES.filter((code) => !activeRuleCodes.has(code))
  }, [activeRuleCodes])

  const presentRequiredCodes = useMemo(() => {
    return REQUIRED_RULE_CODES.filter((code) => activeRuleCodes.has(code))
  }, [activeRuleCodes])

  const displayed = useMemo(() => {
    return rows.filter((r) => {
      if (filterMissing) {
        // Only show rows that match missing codes
        return missingRequiredCodes.includes(r.code.toLowerCase() as typeof REQUIRED_RULE_CODES[number])
      }
      if (filterActive === 'active' && !r.is_active) return false
      if (filterActive === 'inactive' && r.is_active) return false
      if (filterCalcType && r.calculation_type !== filterCalcType) return false
      if (filterCompType && r.component_type !== filterCompType) return false
      if (filterScope === 'global' && r.org != null) return false
      if (filterScope === 'org' && r.org == null) return false
      return true
    })
  }, [rows, filterActive, filterCalcType, filterCompType, filterScope, filterMissing, missingRequiredCodes])

  function openCreate() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(r: ProposalComponentRule) {
    setEditing(r)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
  }

  function handleSaved(saved: ProposalComponentRule) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id)
      return idx >= 0 ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev]
    })
    closeDrawer()
  }

  function handleDeactivate(r: ProposalComponentRule) {
    setConfirmTarget(r)
    setConfirmMode('deactivate')
    setConfirmOpen(true)
  }

  function handleDelete(r: ProposalComponentRule) {
    setConfirmTarget(r)
    setConfirmMode('delete')
    setConfirmOpen(true)
  }

  async function runConfirmAction() {
    if (!confirmTarget) return
    setConfirmBusy(true)
    setRowActionError(null)
    try {
      if (confirmMode === 'deactivate') {
        const updated = await updateProposalComponentRule(confirmTarget.id, { is_active: false })
        setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      } else {
        await deleteProposalComponentRule(confirmTarget.id)
        setRows((prev) => prev.filter((x) => x.id !== confirmTarget.id))
      }
      setConfirmOpen(false)
      setConfirmTarget(null)
    } catch (e: unknown) {
      setRowActionError(parseApiError(e, confirmMode === 'delete' ? 'Failed to delete rule' : 'Failed to deactivate rule').message)
    } finally {
      setConfirmBusy(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Component rules</h2>
          <p className="text-sm text-app-secondary">
            Salary component definitions used when building proposals.
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New rule
          </Button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-panel border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-brand-800 dark:text-brand-200">
            Proposal generation requires a complete active ruleset
          </p>
          <p className="mt-1 text-xs text-brand-700/80 dark:text-brand-300/80">
            Global rules apply to all organizations; org-specific rules override global rules.
          </p>
        </div>
      </div>

      {/* Missing rules warning */}
      {missingRequiredCodes.length > 0 ? (
        <div className="rounded-panel border border-status-warning/40 bg-status-warning/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-status-warning">
                {missingRequiredCodes.length} required rule{missingRequiredCodes.length === 1 ? ' is' : 's are'} missing
              </p>
              <p className="mt-1 text-xs text-app-secondary">
                The following codes need active rules for proposal generation to work:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {missingRequiredCodes.map((code) => (
                  <Badge key={code} variant="danger">{code}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : !loading && rows.length > 0 ? (
        <div className="rounded-panel border border-status-success/40 bg-status-success/8 p-3">
          <div className="flex items-center gap-2">
            <Badge variant="success">Complete</Badge>
            <span className="text-sm text-status-success">All {REQUIRED_RULE_CODES.length} required rule codes are configured</span>
          </div>
        </div>
      ) : null}

      {/* Required codes reference (collapsible) */}
      <details className="rounded-panel border border-app-border bg-app-surface shadow-panel">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-app-text hover:bg-app-muted/50">
          Required rule codes reference ({presentRequiredCodes.length}/{REQUIRED_RULE_CODES.length} present)
        </summary>
        <div className="border-t border-app-border px-4 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {REQUIRED_RULE_CODES.map((code) => {
              const isPresent = activeRuleCodes.has(code)
              return (
                <div
                  key={code}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-mono ${
                    isPresent
                      ? 'bg-status-success/10 text-status-success'
                      : 'bg-status-danger/10 text-status-danger'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isPresent ? 'bg-status-success' : 'bg-status-danger'}`} />
                  {code}
                </div>
              )
            })}
          </div>
        </div>
      </details>

      {rowActionError ? (
        <p className="rounded-panel bg-status-danger/8 px-4 py-2 text-sm text-status-danger">{rowActionError}</p>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <ListFilter className="h-4 w-4 shrink-0 text-app-subtle" />

        <select
          aria-label="Active status"
          className="min-h-9 rounded-panel border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          aria-label="Calculation type"
          className="min-h-9 rounded-panel border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          value={filterCalcType}
          onChange={(e) => setFilterCalcType(e.target.value)}
        >
          <option value="">All calc types</option>
          {CALC_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Component type"
          className="min-h-9 rounded-panel border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          value={filterCompType}
          onChange={(e) => setFilterCompType(e.target.value)}
        >
          <option value="">All component types</option>
          {COMPONENT_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>

        <select
          aria-label="Scope"
          className="min-h-9 rounded-panel border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          value={filterScope}
          onChange={(e) => setFilterScope(e.target.value as typeof filterScope)}
        >
          <option value="all">All scopes</option>
          <option value="global">Global</option>
          <option value="org">Org-specific</option>
        </select>

        <button
          type="button"
          onClick={() => setFilterMissing(!filterMissing)}
          className={`min-h-9 rounded-panel border px-3 py-1.5 text-sm font-medium shadow-panel transition-colors ${
            filterMissing
              ? 'border-status-danger/50 bg-status-danger/10 text-status-danger'
              : 'border-app-border bg-app-surface text-app-text hover:bg-app-muted'
          }`}
        >
          Missing required {missingRequiredCodes.length > 0 ? `(${missingRequiredCodes.length})` : ''}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Spinner label="Loading component rules…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : displayed.length === 0 ? (
        <EmptyState
          title="No component rules"
          description={rows.length === 0 ? 'Create your first rule to get started.' : 'No rules match the current filters.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-app-border shadow-panel">
          <Table>
            <THead>
              <TR>
                <TH>Scope</TH>
                <TH>Code</TH>
                <TH>Component name</TH>
                <TH>Component type</TH>
                <TH>Calculation</TH>
                <TH>Percentage</TH>
                <TH>Fixed amount</TH>
                <TH>Base component</TH>
                <TH>Sort</TH>
                <TH>Active</TH>
                <TH>Effective from</TH>
                <TH>Effective to</TH>
                {canWrite && <TH>Actions</TH>}
              </TR>
            </THead>
            <TBody>
              {displayed.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Badge variant={r.org == null ? 'neutral' : 'info'}>
                      {r.org == null ? 'Global' : 'Org'}
                    </Badge>
                  </TD>
                  <TD>
                    <span className="font-mono text-xs text-app-text">{r.code}</span>
                  </TD>
                  <TD>{r.component_name}</TD>
                  <TD>
                    <span className="capitalize">{r.component_type.replace(/_/g, ' ')}</span>
                  </TD>
                  <TD>
                    <Badge variant={calcTypeVariant(r.calculation_type)}>
                      {CALC_TYPE_LABELS[r.calculation_type]}
                    </Badge>
                  </TD>
                  <TD>{fmt(r.percentage) !== '—' ? `${r.percentage}%` : '—'}</TD>
                  <TD>{fmt(r.fixed_amount)}</TD>
                  <TD>
                    <span className="font-mono text-xs">{fmt(r.base_component_code)}</span>
                  </TD>
                  <TD>{r.sort_order}</TD>
                  <TD>
                    <Badge variant={r.is_active ? 'success' : 'neutral'}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  <TD>{formatDate(r.effective_from)}</TD>
                  <TD>{formatDate(r.effective_to)}</TD>
                  {canWrite && (
                    <TD>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-brand-600 hover:underline"
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </button>
                        {r.is_active && (
                          <button
                            type="button"
                            className="text-xs text-status-warning hover:underline"
                            onClick={() => handleDeactivate(r)}
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-xs text-status-danger hover:underline"
                          onClick={() => handleDelete(r)}
                        >
                          Delete
                        </button>
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <RuleFormDrawer
        open={drawerOpen}
        editing={editing}
        onClose={closeDrawer}
        onSaved={handleSaved}
      />

      <Drawer
        open={confirmOpen}
        title={confirmMode === 'delete' ? 'Delete rule' : 'Deactivate rule'}
        description={confirmTarget ? `Rule: ${confirmTarget.component_name}` : undefined}
        onClose={() => !confirmBusy && setConfirmOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={confirmBusy} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={confirmMode === 'delete' ? 'danger' : 'secondary'}
              disabled={confirmBusy}
              onClick={() => void runConfirmAction()}
            >
              {confirmBusy ? 'Saving…' : confirmMode === 'delete' ? 'Delete' : 'Deactivate'}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-app-secondary">
          {confirmMode === 'delete' ? (
            <p>This will permanently remove the rule. This cannot be undone.</p>
          ) : (
            <p>This will mark the rule inactive. You can re-create it later if needed.</p>
          )}
        </div>
      </Drawer>
    </div>
  )
}
