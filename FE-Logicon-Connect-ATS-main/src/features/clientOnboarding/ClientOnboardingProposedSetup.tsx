import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createClientOnboardingProposedBudget,
  createProposedDepartment,
  createProposedRoleRequirement,
  createProposedSite,
  deleteClientOnboardingProposedBudget,
  deleteProposedDepartment,
  deleteProposedRoleRequirement,
  deleteProposedSite,
  updateClientOnboardingProposedBudget,
  updateProposedDepartment,
  updateProposedRoleRequirement,
  updateProposedSite,
} from '@/api/clientOnboarding'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { listLocationAreas, listWageCategories, type LocationAreaRow, type WageCategoryRow } from '@/api/wages'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { ClientOnboardingProposedUsersSection } from '@/features/clientOnboarding/ClientOnboardingProposedUsersSection'
import {
  ProposedBudgetSections,
  proposedBudgetScopeHelpText,
} from '@/features/clientOnboarding/proposedBudgetUx'
import { BUDGET_NATURE_OPTIONS, BUDGET_TYPE_OPTIONS } from '@/features/budgets/types'
import type {
  ClientOnboardingProposedBudgetRow,
  ClientOnboardingProposedBudgetWriteInput,
  ClientOnboardingRow,
  ProposedDepartmentRow,
  ProposedDepartmentWriteInput,
  ProposedRoleRequirementRow,
  ProposedRoleRequirementWriteInput,
  ProposedSiteRow,
  ProposedSiteWriteInput,
} from '@/features/clientOnboarding/types'

function TextArea({
  id,
  label,
  value,
  onChange,
  disabled,
  rows,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  rows: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-app-secondary">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[3rem] w-full resize-y rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </div>
  )
}

async function loadAllJobRoles(): Promise<JobRoleRow[]> {
  const all: JobRoleRow[] = []
  let page = 1
  while (page <= 20) {
    const res = await listJobRoles({ is_active: true, page })
    all.push(...res.items)
    if (res.items.length < 50) break
    page += 1
  }
  return all
}

async function loadAllWageCategories(): Promise<WageCategoryRow[]> {
  const all: WageCategoryRow[] = []
  let page = 1
  while (page <= 10) {
    const chunk = await listWageCategories({ page })
    all.push(...chunk)
    if (chunk.length < 50) break
    page += 1
  }
  return all
}

async function loadLocationAreasPage(): Promise<LocationAreaRow[]> {
  const res = await listLocationAreas({ is_active: true, page: 1 })
  return res.items
}

export function ClientOnboardingProposedSetup({
  requestId,
  row,
  onRefresh,
  focus = 'all',
}: {
  requestId: number
  row: ClientOnboardingRow
  onRefresh: () => void | Promise<void>
  focus?: 'all' | 'sites' | 'departments' | 'roles' | 'budgets' | 'users'
}) {
  const canMutate = row.status === 'draft' || row.status === 'rejected'
  const sites = row.proposed_sites ?? []
  const departments = row.proposed_departments ?? []
  const requirements = row.proposed_role_requirements ?? []
  const budgets = row.proposed_budgets ?? []
  const showUserFinalizationFields =
    row.finalization_status === 'finalized' || row.status === 'approved'

  const siteLabel = useMemo(() => {
    const m = new Map(sites.map((s) => [s.id, `${s.name} (${s.code})`]))
    return (id: number) => m.get(id) ?? `Site #${id}`
  }, [sites])

  const deptLabel = useMemo(() => {
    const m = new Map(departments.map((d) => [d.id, `${d.name} (${d.code})`]))
    return (id: number | null) => (id != null ? m.get(id) ?? `Department #${id}` : '—')
  }, [departments])

  const [jobRoles, setJobRoles] = useState<JobRoleRow[]>([])
  const [wageCategories, setWageCategories] = useState<WageCategoryRow[]>([])
  const [locationAreas, setLocationAreas] = useState<LocationAreaRow[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(true)
  const [lookupsError, setLookupsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLookupsLoading(true)
      setLookupsError(null)
      try {
        const [jr, wc, la] = await Promise.all([loadAllJobRoles(), loadAllWageCategories(), loadLocationAreasPage()])
        if (!cancelled) {
          setJobRoles(jr)
          setWageCategories(wc)
          setLocationAreas(la)
        }
      } catch (e: unknown) {
        if (!cancelled) setLookupsError(parseApiError(e, 'Lookup failed').message)
      } finally {
        if (!cancelled) setLookupsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const jobRoleLabel = useCallback(
    (id: number) => jobRoles.find((j) => j.id === id)?.name ?? `Role #${id}`,
    [jobRoles],
  )

  // —— Sites drawer ————————————————————————————————————————————————
  const [siteDrawer, setSiteDrawer] = useState(false)
  const [siteSaving, setSiteSaving] = useState(false)
  const [siteError, setSiteError] = useState<string | null>(null)
  const [siteEdit, setSiteEdit] = useState<ProposedSiteRow | null>(null)
  const [siteForm, setSiteForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    location_area: '',
    is_active: 'true',
  })

  function openSiteCreate() {
    setSiteEdit(null)
    setSiteError(null)
    setSiteForm({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      location_area: '',
      is_active: 'true',
    })
    setSiteDrawer(true)
  }

  function openSiteEdit(s: ProposedSiteRow) {
    setSiteEdit(s)
    setSiteError(null)
    setSiteForm({
      name: s.name,
      code: s.code,
      address: s.address ?? '',
      city: s.city ?? '',
      state: s.state ?? '',
      pincode: s.pincode ?? '',
      contact_person: s.contact_person ?? '',
      contact_phone: s.contact_phone ?? '',
      contact_email: s.contact_email ?? '',
      location_area: s.location_area != null ? String(s.location_area) : '',
      is_active: s.is_active ? 'true' : 'false',
    })
    setSiteDrawer(true)
  }

  async function saveSite() {
    setSiteSaving(true)
    setSiteError(null)
    const la = siteForm.location_area.trim()
    const payload: ProposedSiteWriteInput = {
      name: siteForm.name.trim(),
      code: siteForm.code.trim(),
      address: siteForm.address.trim() || undefined,
      city: siteForm.city.trim() || undefined,
      state: siteForm.state.trim() || undefined,
      pincode: siteForm.pincode.trim() || undefined,
      contact_person: siteForm.contact_person.trim() || undefined,
      contact_phone: siteForm.contact_phone.trim() || undefined,
      contact_email: siteForm.contact_email.trim() || undefined,
      location_area: la ? Number(la) : null,
      is_active: siteForm.is_active === 'true',
    }
    try {
      if (siteEdit) {
        await updateProposedSite(requestId, siteEdit.id, payload)
      } else {
        await createProposedSite(requestId, payload)
      }
      setSiteDrawer(false)
      await onRefresh()
    } catch (e: unknown) {
      setSiteError(parseApiError(e, 'Save failed').message)
    } finally {
      setSiteSaving(false)
    }
  }

  async function removeSite(s: ProposedSiteRow) {
    if (!window.confirm(`Remove proposed site “${s.name}”?`)) return
    try {
      await deleteProposedSite(requestId, s.id)
      await onRefresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
  }

  // —— Departments drawer ———————————————————————————————————————————
  const [deptDrawer, setDeptDrawer] = useState(false)
  const [deptSaving, setDeptSaving] = useState(false)
  const [deptError, setDeptError] = useState<string | null>(null)
  const [deptEdit, setDeptEdit] = useState<ProposedDepartmentRow | null>(null)
  const [deptForm, setDeptForm] = useState({
    scope_level: 'client' as 'client' | 'site',
    proposed_site: '',
    name: '',
    code: '',
    description: '',
    is_active: 'true',
  })

  function openDeptCreate() {
    setDeptEdit(null)
    setDeptError(null)
    setDeptForm({
      scope_level: 'client',
      proposed_site: '',
      name: '',
      code: '',
      description: '',
      is_active: 'true',
    })
    setDeptDrawer(true)
  }

  function openDeptEdit(d: ProposedDepartmentRow) {
    setDeptEdit(d)
    setDeptError(null)
    const sl = d.scope_level === 'client' ? 'client' : 'site'
    setDeptForm({
      scope_level: sl,
      proposed_site: d.proposed_site != null ? String(d.proposed_site) : '',
      name: d.name,
      code: d.code,
      description: d.description ?? '',
      is_active: d.is_active ? 'true' : 'false',
    })
    setDeptDrawer(true)
  }

  async function saveDept() {
    setDeptSaving(true)
    setDeptError(null)
    const siteId = deptForm.proposed_site.trim() ? Number(deptForm.proposed_site) : null
    if (deptForm.scope_level === 'site' && (siteId == null || !Number.isFinite(siteId))) {
      setDeptError('Select a proposed site for site-level departments.')
      setDeptSaving(false)
      return
    }
    const payload: ProposedDepartmentWriteInput = {
      scope_level: deptForm.scope_level,
      proposed_site: deptForm.scope_level === 'client' ? null : siteId,
      name: deptForm.name.trim(),
      code: deptForm.code.trim(),
      description: deptForm.description.trim() || undefined,
      is_active: deptForm.is_active === 'true',
    }
    try {
      if (deptEdit) {
        await updateProposedDepartment(requestId, deptEdit.id, payload)
      } else {
        await createProposedDepartment(requestId, payload)
      }
      setDeptDrawer(false)
      await onRefresh()
    } catch (e: unknown) {
      setDeptError(parseApiError(e, 'Save failed').message)
    } finally {
      setDeptSaving(false)
    }
  }

  async function removeDept(d: ProposedDepartmentRow) {
    if (!window.confirm(`Remove proposed department “${d.name}”?`)) return
    try {
      await deleteProposedDepartment(requestId, d.id)
      await onRefresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
  }

  // —— Role requirements drawer —————————————————————————————————————
  const [srrDrawer, setSrrDrawer] = useState(false)
  const [srrSaving, setSrrSaving] = useState(false)
  const [srrError, setSrrError] = useState<string | null>(null)
  const [srrEdit, setSrrEdit] = useState<ProposedRoleRequirementRow | null>(null)
  const [srrForm, setSrrForm] = useState({
    proposed_site: '',
    proposed_department: '',
    job_role: '',
    approved_headcount: '1',
    billing_type: 'billable',
    billing_rate: '',
    wage_min: '',
    wage_max: '',
    shift_hours: '',
    wage_category: '',
    effective_from: '',
    effective_to: '',
    is_active: 'true',
  })

  function openSrrCreate() {
    setSrrEdit(null)
    setSrrError(null)
    setSrrForm({
      proposed_site: sites[0] ? String(sites[0].id) : '',
      proposed_department: '',
      job_role: '',
      approved_headcount: '1',
      billing_type: 'billable',
      billing_rate: '',
      wage_min: '',
      wage_max: '',
      shift_hours: '',
      wage_category: '',
      effective_from: '',
      effective_to: '',
      is_active: 'true',
    })
    setSrrDrawer(true)
  }

  function openSrrEdit(r: ProposedRoleRequirementRow) {
    setSrrEdit(r)
    setSrrError(null)
    setSrrForm({
      proposed_site: String(r.proposed_site),
      proposed_department: r.proposed_department != null ? String(r.proposed_department) : '',
      job_role: String(r.job_role),
      approved_headcount: String(r.approved_headcount),
      billing_type: r.billing_type ?? 'billable',
      billing_rate: r.billing_rate ?? '',
      wage_min: r.wage_min ?? '',
      wage_max: r.wage_max ?? '',
      shift_hours: r.shift_hours ?? '',
      wage_category: r.wage_category != null ? String(r.wage_category) : '',
      effective_from: r.effective_from?.slice(0, 10) ?? '',
      effective_to: r.effective_to?.slice(0, 10) ?? '',
      is_active: r.is_active ? 'true' : 'false',
    })
    setSrrDrawer(true)
  }

  async function saveSrr() {
    setSrrSaving(true)
    setSrrError(null)
    const ps = Number(srrForm.proposed_site)
    if (!Number.isFinite(ps) || ps < 1) {
      setSrrError('Proposed site is required.')
      setSrrSaving(false)
      return
    }
    const hc = Number(srrForm.approved_headcount)
    if (!Number.isFinite(hc) || hc < 1) {
      setSrrError('Approved headcount must be at least 1.')
      setSrrSaving(false)
      return
    }
    if (!srrForm.effective_from.trim()) {
      setSrrError('Effective from date is required.')
      setSrrSaving(false)
      return
    }
    const jr = Number(srrForm.job_role)
    if (!Number.isFinite(jr) || jr < 1) {
      setSrrError('Select a job role.')
      setSrrSaving(false)
      return
    }
    const pd = srrForm.proposed_department.trim()
    const wc = srrForm.wage_category.trim()
    const payload: ProposedRoleRequirementWriteInput = {
      proposed_site: ps,
      proposed_department: pd ? Number(pd) : null,
      job_role: jr,
      approved_headcount: hc,
      billing_type: srrForm.billing_type,
      billing_rate: srrForm.billing_rate.trim() || null,
      wage_min: srrForm.wage_min.trim() || null,
      wage_max: srrForm.wage_max.trim() || null,
      shift_hours: srrForm.shift_hours.trim() || null,
      wage_category: wc ? Number(wc) : null,
      effective_from: srrForm.effective_from.trim(),
      effective_to: srrForm.effective_to.trim() || null,
      is_active: srrForm.is_active === 'true',
    }
    try {
      if (srrEdit) {
        await updateProposedRoleRequirement(requestId, srrEdit.id, payload)
      } else {
        await createProposedRoleRequirement(requestId, payload)
      }
      setSrrDrawer(false)
      await onRefresh()
    } catch (e: unknown) {
      setSrrError(parseApiError(e, 'Save failed').message)
    } finally {
      setSrrSaving(false)
    }
  }

  async function removeSrr(r: ProposedRoleRequirementRow) {
    if (!window.confirm('Remove this role requirement?')) return
    try {
      await deleteProposedRoleRequirement(requestId, r.id)
      await onRefresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
  }

  // —— Proposed budgets drawer ————————————————————————————————————————
  const [budDrawer, setBudDrawer] = useState(false)
  const [budSaving, setBudSaving] = useState(false)
  const [budError, setBudError] = useState<string | null>(null)
  const [budEdit, setBudEdit] = useState<ClientOnboardingProposedBudgetRow | null>(null)
  const [budForm, setBudForm] = useState({
    name: '',
    code: '',
    budget_nature: 'billable',
    budget_type: 'onboarding',
    scope_level: 'client' as 'client' | 'site' | 'department',
    proposed_site: '',
    proposed_department: '',
    amount: '',
    currency: 'INR',
    period_start: '',
    period_end: '',
    notes: '',
    is_active: 'true',
  })

  const budgetDepartmentOptions = useMemo(() => {
    if (budForm.scope_level !== 'department') return departments
    const raw = budForm.proposed_site.trim()
    if (!raw) return departments
    const sid = Number(raw)
    if (!Number.isFinite(sid)) return departments
    return departments.filter((d) => d.scope_level === 'client' || d.proposed_site === sid)
  }, [budForm.scope_level, budForm.proposed_site, departments])

  function todayInputDate() {
    return new Date().toISOString().slice(0, 10)
  }

  function openBudCreate() {
    setBudEdit(null)
    setBudError(null)
    setBudForm({
      name: '',
      code: '',
      budget_nature: 'billable',
      budget_type: 'onboarding',
      scope_level: 'client',
      proposed_site: '',
      proposed_department: '',
      amount: '',
      currency: 'INR',
      period_start: todayInputDate(),
      period_end: '',
      notes: '',
      is_active: 'true',
    })
    setBudDrawer(true)
  }

  function openBudEdit(b: ClientOnboardingProposedBudgetRow) {
    setBudEdit(b)
    setBudError(null)
    const sl = b.scope_level === 'site' || b.scope_level === 'department' ? b.scope_level : 'client'
    setBudForm({
      name: b.name,
      code: b.code,
      budget_nature: b.budget_nature,
      budget_type: b.budget_type,
      scope_level: sl,
      proposed_site: b.proposed_site != null ? String(b.proposed_site) : '',
      proposed_department: b.proposed_department != null ? String(b.proposed_department) : '',
      amount: String(b.amount),
      currency: b.currency || 'INR',
      period_start: b.period_start?.slice(0, 10) ?? '',
      period_end: b.period_end?.slice(0, 10) ?? '',
      notes: b.notes ?? '',
      is_active: b.is_active ? 'true' : 'false',
    })
    setBudDrawer(true)
  }

  async function saveBud() {
    setBudSaving(true)
    setBudError(null)
    const name = budForm.name.trim()
    const code = budForm.code.trim()
    if (!name || !code) {
      setBudError('Name and code are required.')
      setBudSaving(false)
      return
    }
    const amt = Number(budForm.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setBudError('Amount must be greater than zero.')
      setBudSaving(false)
      return
    }
    if (!budForm.period_start.trim()) {
      setBudError('Period start is required.')
      setBudSaving(false)
      return
    }
    const siteId = budForm.proposed_site.trim() ? Number(budForm.proposed_site) : null
    const deptId = budForm.proposed_department.trim() ? Number(budForm.proposed_department) : null

    if (budForm.scope_level === 'site' && (siteId == null || !Number.isFinite(siteId))) {
      setBudError('Select a proposed site for site-level budgets.')
      setBudSaving(false)
      return
    }
    if (budForm.scope_level === 'department' && (siteId == null || !Number.isFinite(siteId))) {
      setBudError('Select a proposed site for department-level budgets.')
      setBudSaving(false)
      return
    }
    if (budForm.scope_level === 'department' && (deptId == null || !Number.isFinite(deptId))) {
      setBudError('Select a proposed department for department-level budgets.')
      setBudSaving(false)
      return
    }

    const amountStr = amt.toFixed(2)
    const payload: ClientOnboardingProposedBudgetWriteInput = {
      name,
      code,
      budget_nature: budForm.budget_nature,
      budget_type: budForm.budget_type,
      scope_level: budForm.scope_level,
      proposed_site: budForm.scope_level === 'client' ? null : siteId,
      proposed_department: budForm.scope_level === 'department' ? deptId : null,
      amount: amountStr,
      currency: budForm.currency.trim() || 'INR',
      period_start: budForm.period_start.trim(),
      period_end: budForm.period_end.trim() || null,
      notes: budForm.notes.trim() || '',
      is_active: budForm.is_active === 'true',
    }

    try {
      if (budEdit) {
        await updateClientOnboardingProposedBudget(requestId, budEdit.id, payload)
      } else {
        await createClientOnboardingProposedBudget(requestId, payload)
      }
      setBudDrawer(false)
      await onRefresh()
    } catch (e: unknown) {
      setBudError(parseApiError(e, 'Save failed').message)
    } finally {
      setBudSaving(false)
    }
  }

  async function removeBud(b: ClientOnboardingProposedBudgetRow) {
    if (!window.confirm(`Remove proposed budget “${b.name}”?`)) return
    try {
      await deleteClientOnboardingProposedBudget(requestId, b.id)
      await onRefresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
  }

  const readOnlyBanner =
    !canMutate && (sites.length > 0 || departments.length > 0 || requirements.length > 0 || budgets.length > 0) ? (
      <p className="text-xs text-app-subtle">
        Proposed setup can only be edited while the request is in Draft or Rejected.
      </p>
    ) : null

  return (
    <div className="space-y-8">
      {lookupsError ? <ErrorState message={lookupsError} /> : null}
      {lookupsLoading ? (
        <Spinner label="Loading lookups" />
      ) : (
        <>
          {readOnlyBanner}
          {/* Proposed sites */}
          {focus === 'all' || focus === 'sites' ? (
          <section className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-app-text">Proposed sites</p>
              {canMutate ? (
                <Button type="button" className="min-h-9" onClick={openSiteCreate}>
                  Add site
                </Button>
              ) : null}
            </div>
            {sites.length === 0 ? (
              <p className="mt-2 text-sm text-app-secondary">No proposed sites yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH className="py-2">Name</TH>
                      <TH className="py-2">Code</TH>
                      <TH className="py-2">City</TH>
                      <TH className="py-2">Active</TH>
                      {canMutate ? <TH className="py-2 text-right">Actions</TH> : null}
                    </TR>
                  </THead>
                  <TBody>
                    {sites.map((s) => (
                      <TR key={s.id}>
                        <TD className="py-2 text-sm">{s.name}</TD>
                        <TD className="py-2 font-mono text-xs">{s.code}</TD>
                        <TD className="py-2 text-xs text-app-secondary">{s.city || '—'}</TD>
                        <TD className="py-2">{s.is_active ? <Badge variant="success">Yes</Badge> : <Badge variant="neutral">No</Badge>}</TD>
                        {canMutate ? (
                          <TD className="py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" className="min-h-8 px-2" type="button" onClick={() => openSiteEdit(s)}>
                                Edit
                              </Button>
                              <Button variant="danger" className="min-h-8 px-2" type="button" onClick={() => void removeSite(s)}>
                                Remove
                              </Button>
                            </div>
                          </TD>
                        ) : null}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </section>
          ) : null}

          {/* Proposed departments */}
          {focus === 'all' || focus === 'departments' ? (
          <section className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-app-text">Proposed departments</p>
              {canMutate ? (
                <Button type="button" className="min-h-9" onClick={openDeptCreate}>
                  Add department
                </Button>
              ) : null}
            </div>
            {departments.length === 0 ? (
              <p className="mt-2 text-sm text-app-secondary">No proposed departments yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH className="py-2">Name</TH>
                      <TH className="py-2">Code</TH>
                      <TH className="py-2">Scope</TH>
                      <TH className="py-2">Site</TH>
                      <TH className="py-2">Active</TH>
                      {canMutate ? <TH className="py-2 text-right">Actions</TH> : null}
                    </TR>
                  </THead>
                  <TBody>
                    {departments.map((d) => (
                      <TR key={d.id}>
                        <TD className="py-2 text-sm">{d.name}</TD>
                        <TD className="py-2 font-mono text-xs">{d.code}</TD>
                        <TD className="py-2 text-xs capitalize">{d.scope_level === 'client' ? 'Client-level' : 'Site-level'}</TD>
                        <TD className="py-2 text-xs text-app-secondary">
                          {d.proposed_site != null ? siteLabel(d.proposed_site) : '—'}
                        </TD>
                        <TD className="py-2">{d.is_active ? <Badge variant="success">Yes</Badge> : <Badge variant="neutral">No</Badge>}</TD>
                        {canMutate ? (
                          <TD className="py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" className="min-h-8 px-2" type="button" onClick={() => openDeptEdit(d)}>
                                Edit
                              </Button>
                              <Button variant="danger" className="min-h-8 px-2" type="button" onClick={() => void removeDept(d)}>
                                Remove
                              </Button>
                            </div>
                          </TD>
                        ) : null}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </section>
          ) : null}

          {/* Role requirements */}
          {focus === 'all' || focus === 'roles' ? (
          <section className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-app-text">Role requirements</p>
              {canMutate ? (
                <Button type="button" className="min-h-9" onClick={openSrrCreate} disabled={sites.length === 0}>
                  Add role requirement
                </Button>
              ) : null}
            </div>
            {sites.length === 0 ? (
              <p className="mt-2 text-sm text-app-secondary">Add at least one proposed site before role requirements.</p>
            ) : requirements.length === 0 ? (
              <p className="mt-2 text-sm text-app-secondary">No role requirements yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH className="py-2">Site</TH>
                      <TH className="py-2">Department</TH>
                      <TH className="py-2">Job role</TH>
                      <TH className="py-2">Headcount</TH>
                      <TH className="py-2">Effective from</TH>
                      <TH className="py-2">Active</TH>
                      {canMutate ? <TH className="py-2 text-right">Actions</TH> : null}
                    </TR>
                  </THead>
                  <TBody>
                    {requirements.map((r) => (
                      <TR key={r.id}>
                        <TD className="py-2 text-xs">{siteLabel(r.proposed_site)}</TD>
                        <TD className="py-2 text-xs text-app-secondary">{deptLabel(r.proposed_department)}</TD>
                        <TD className="py-2 text-sm">{jobRoleLabel(r.job_role)}</TD>
                        <TD className="py-2 text-xs">{r.approved_headcount}</TD>
                        <TD className="py-2 text-xs">{r.effective_from?.slice(0, 10) ?? '—'}</TD>
                        <TD className="py-2">{r.is_active ? <Badge variant="success">Yes</Badge> : <Badge variant="neutral">No</Badge>}</TD>
                        {canMutate ? (
                          <TD className="py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" className="min-h-8 px-2" type="button" onClick={() => openSrrEdit(r)}>
                                Edit
                              </Button>
                              <Button variant="danger" className="min-h-8 px-2" type="button" onClick={() => void removeSrr(r)}>
                                Remove
                              </Button>
                            </div>
                          </TD>
                        ) : null}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </section>
          ) : null}

          {/* Proposed budgets */}
          {focus === 'all' || focus === 'budgets' ? (
            <ProposedBudgetSections
              className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel"
              budgets={budgets}
              canMutate={canMutate}
              onAdd={openBudCreate}
              onEdit={(row) => openBudEdit(row as ClientOnboardingProposedBudgetRow)}
              onRemove={(row) => void removeBud(row as ClientOnboardingProposedBudgetRow)}
              resolveSite={(id) => siteLabel(id)}
              resolveDept={(id) => deptLabel(id)}
              emptyMessage="No proposed budgets yet."
            />
          ) : null}

          {focus === 'all' || focus === 'users' ? (
            <ClientOnboardingProposedUsersSection
              requestId={requestId}
              row={row}
              sites={sites}
              onRefresh={onRefresh}
              showFinalizationFields={showUserFinalizationFields}
            />
          ) : null}
        </>
      )}

      {/* Site drawer */}
      <Drawer
        open={siteDrawer}
        onClose={() => !siteSaving && setSiteDrawer(false)}
        title={siteEdit ? 'Edit proposed site' : 'Add proposed site'}
        description="Planned site details before approval."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSiteDrawer(false)} disabled={siteSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveSite()} disabled={siteSaving}>
              {siteSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {siteError ? <ErrorState message={siteError} /> : null}
          <Input
            id="co_ps_name"
            label="Name"
            value={siteForm.name}
            onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            id="co_ps_code"
            label="Code"
            value={siteForm.code}
            onChange={(e) => setSiteForm((f) => ({ ...f, code: e.target.value }))}
          />
          <TextArea id="co_ps_addr" label="Address" rows={2} value={siteForm.address} onChange={(v) => setSiteForm((f) => ({ ...f, address: v }))} />
          <Input id="co_ps_city" label="City" value={siteForm.city} onChange={(e) => setSiteForm((f) => ({ ...f, city: e.target.value }))} />
          <Input id="co_ps_state" label="State" value={siteForm.state} onChange={(e) => setSiteForm((f) => ({ ...f, state: e.target.value }))} />
          <Input id="co_ps_pin" label="Pincode" value={siteForm.pincode} onChange={(e) => setSiteForm((f) => ({ ...f, pincode: e.target.value }))} />
          <Input
            id="co_ps_cperson"
            label="Contact person"
            value={siteForm.contact_person}
            onChange={(e) => setSiteForm((f) => ({ ...f, contact_person: e.target.value }))}
          />
          <Input
            id="co_ps_cphone"
            label="Contact phone"
            value={siteForm.contact_phone}
            onChange={(e) => setSiteForm((f) => ({ ...f, contact_phone: e.target.value }))}
          />
          <Input
            id="co_ps_cemail"
            label="Contact email"
            type="email"
            value={siteForm.contact_email}
            onChange={(e) => setSiteForm((f) => ({ ...f, contact_email: e.target.value }))}
          />
          <Select
            id="co_ps_area"
            label="Location area (optional)"
            value={siteForm.location_area}
            onChange={(e) => setSiteForm((f) => ({ ...f, location_area: e.target.value }))}
          >
            <option value="">None</option>
            {locationAreas.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name} ({a.code})
              </option>
            ))}
          </Select>
          <Select
            id="co_ps_active"
            label="Active"
            value={siteForm.is_active}
            onChange={(e) => setSiteForm((f) => ({ ...f, is_active: e.target.value }))}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>
      </Drawer>

      {/* Department drawer */}
      <Drawer
        open={deptDrawer}
        onClose={() => !deptSaving && setDeptDrawer(false)}
        title={deptEdit ? 'Edit proposed department' : 'Add proposed department'}
        description="Client-level departments apply across the new client; site-level are tied to one proposed site."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeptDrawer(false)} disabled={deptSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveDept()} disabled={deptSaving}>
              {deptSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {deptError ? <ErrorState message={deptError} /> : null}
          <Select
            id="co_pd_scope"
            label="Scope level"
            value={deptForm.scope_level}
            onChange={(e) =>
              setDeptForm((f) => ({
                ...f,
                scope_level: e.target.value as 'client' | 'site',
                proposed_site: e.target.value === 'client' ? '' : f.proposed_site,
              }))
            }
          >
            <option value="client">Client-level</option>
            <option value="site">Site-level</option>
          </Select>
          {deptForm.scope_level === 'site' ? (
            <Select
              id="co_pd_site"
              label="Proposed site"
              value={deptForm.proposed_site}
              onChange={(e) => setDeptForm((f) => ({ ...f, proposed_site: e.target.value }))}
            >
              <option value="">Select site</option>
              {sites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          ) : null}
          <Input id="co_pd_name" label="Name" value={deptForm.name} onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="co_pd_code" label="Code" value={deptForm.code} onChange={(e) => setDeptForm((f) => ({ ...f, code: e.target.value }))} />
          <TextArea
            id="co_pd_desc"
            label="Description"
            rows={3}
            value={deptForm.description}
            onChange={(v) => setDeptForm((f) => ({ ...f, description: v }))}
          />
          <Select
            id="co_pd_active"
            label="Active"
            value={deptForm.is_active}
            onChange={(e) => setDeptForm((f) => ({ ...f, is_active: e.target.value }))}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>
      </Drawer>

      {/* SRR drawer */}
      <Drawer
        open={srrDrawer}
        onClose={() => !srrSaving && setSrrDrawer(false)}
        title={srrEdit ? 'Edit role requirement' : 'Add role requirement'}
        description="Planned staffing need for a proposed site."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSrrDrawer(false)} disabled={srrSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveSrr()} disabled={srrSaving}>
              {srrSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {srrError ? <ErrorState message={srrError} /> : null}
          <Select
            id="co_srr_site"
            label="Proposed site"
            value={srrForm.proposed_site}
            onChange={(e) => setSrrForm((f) => ({ ...f, proposed_site: e.target.value }))}
          >
            {sites.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
          <Select
            id="co_srr_dept"
            label="Proposed department (optional)"
            value={srrForm.proposed_department}
            onChange={(e) => setSrrForm((f) => ({ ...f, proposed_department: e.target.value }))}
          >
            <option value="">None</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name} ({d.code})
              </option>
            ))}
          </Select>
          <Select
            id="co_srr_role"
            label="Job role"
            value={srrForm.job_role}
            onChange={(e) => setSrrForm((f) => ({ ...f, job_role: e.target.value }))}
          >
            <option value="">Select role</option>
            {jobRoles.map((j) => (
              <option key={j.id} value={String(j.id)}>
                {j.name} ({j.code})
              </option>
            ))}
          </Select>
          <Input
            id="co_srr_hc"
            label="Approved headcount"
            type="number"
            min={1}
            step={1}
            value={srrForm.approved_headcount}
            onChange={(e) => setSrrForm((f) => ({ ...f, approved_headcount: e.target.value }))}
          />
          <Select
            id="co_srr_bill"
            label="Billing type"
            value={srrForm.billing_type}
            onChange={(e) => setSrrForm((f) => ({ ...f, billing_type: e.target.value }))}
          >
            <option value="billable">Billable</option>
            <option value="non_billable">Non-billable</option>
          </Select>
          <Input
            id="co_srr_br"
            label="Billing rate"
            value={srrForm.billing_rate}
            onChange={(e) => setSrrForm((f) => ({ ...f, billing_rate: e.target.value }))}
          />
          <Input id="co_srr_wmin" label="Wage min" value={srrForm.wage_min} onChange={(e) => setSrrForm((f) => ({ ...f, wage_min: e.target.value }))} />
          <Input id="co_srr_wmax" label="Wage max" value={srrForm.wage_max} onChange={(e) => setSrrForm((f) => ({ ...f, wage_max: e.target.value }))} />
          <Input
            id="co_srr_shift"
            label="Shift hours"
            value={srrForm.shift_hours}
            onChange={(e) => setSrrForm((f) => ({ ...f, shift_hours: e.target.value }))}
          />
          <Select
            id="co_srr_wc"
            label="Wage category (optional)"
            value={srrForm.wage_category}
            onChange={(e) => setSrrForm((f) => ({ ...f, wage_category: e.target.value }))}
          >
            <option value="">None</option>
            {wageCategories.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name}
              </option>
            ))}
          </Select>
          <Input
            id="co_srr_effrom"
            label="Effective from"
            type="date"
            value={srrForm.effective_from}
            onChange={(e) => setSrrForm((f) => ({ ...f, effective_from: e.target.value }))}
          />
          <Input
            id="co_srr_effto"
            label="Effective to (optional)"
            type="date"
            value={srrForm.effective_to}
            onChange={(e) => setSrrForm((f) => ({ ...f, effective_to: e.target.value }))}
          />
          <Select
            id="co_srr_active"
            label="Active"
            value={srrForm.is_active}
            onChange={(e) => setSrrForm((f) => ({ ...f, is_active: e.target.value }))}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>
      </Drawer>

      {/* Proposed budget drawer */}
      <Drawer
        open={budDrawer}
        onClose={() => !budSaving && setBudDrawer(false)}
        title={budEdit ? 'Edit proposed budget' : 'Add proposed budget'}
        description="Planned budget before approval; real budget plans are created when onboarding is finalized."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBudDrawer(false)} disabled={budSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveBud()} disabled={budSaving}>
              {budSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {budError ? <ErrorState message={budError} /> : null}
          <Input
            id="co_pb_name"
            label="Name"
            value={budForm.name}
            onChange={(e) => setBudForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            id="co_pb_code"
            label="Code"
            value={budForm.code}
            onChange={(e) => setBudForm((f) => ({ ...f, code: e.target.value }))}
          />
          <Select
            id="co_pb_nature"
            label="Budget nature"
            value={budForm.budget_nature}
            onChange={(e) => setBudForm((f) => ({ ...f, budget_nature: e.target.value }))}
          >
            {BUDGET_NATURE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            id="co_pb_type"
            label="Budget type"
            value={budForm.budget_type}
            onChange={(e) => setBudForm((f) => ({ ...f, budget_type: e.target.value }))}
          >
            {BUDGET_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            id="co_pb_scope"
            label="Scope level"
            value={budForm.scope_level}
            onChange={(e) => {
              const v = e.target.value as 'client' | 'site' | 'department'
              setBudForm((f) => ({
                ...f,
                scope_level: v,
                proposed_site: v === 'client' ? '' : f.proposed_site,
                proposed_department: v === 'client' || v === 'site' ? '' : f.proposed_department,
              }))
            }}
          >
            <option value="client">Client total</option>
            <option value="site">Site</option>
            <option value="department">Department</option>
          </Select>
          <p className="text-xs text-app-subtle">{proposedBudgetScopeHelpText(budForm.scope_level)}</p>
          {budForm.scope_level === 'site' || budForm.scope_level === 'department' ? (
            <Select
              id="co_pb_site"
              label="Proposed site"
              value={budForm.proposed_site}
              onChange={(e) => setBudForm((f) => ({ ...f, proposed_site: e.target.value, proposed_department: '' }))}
            >
              <option value="">Select site</option>
              {sites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          ) : null}
          {budForm.scope_level === 'department' ? (
            <Select
              id="co_pb_dept"
              label="Proposed department"
              value={budForm.proposed_department}
              onChange={(e) => setBudForm((f) => ({ ...f, proposed_department: e.target.value }))}
            >
              <option value="">Select department</option>
              {budgetDepartmentOptions.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name} ({d.code})
                  {d.scope_level === 'client' ? ' - client-level' : ''}
                </option>
              ))}
            </Select>
          ) : null}
          {budForm.scope_level === 'department' && departments.length === 0 ? (
            <p className="text-xs text-app-subtle">Add proposed departments before creating department-level budgets.</p>
          ) : null}
          <Input
            id="co_pb_amt"
            label="Amount"
            type="number"
            min={0.01}
            step="0.01"
            value={budForm.amount}
            onChange={(e) => setBudForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <Input
            id="co_pb_cur"
            label="Currency"
            value={budForm.currency}
            onChange={(e) => setBudForm((f) => ({ ...f, currency: e.target.value }))}
          />
          <Input
            id="co_pb_ps"
            label="Period start"
            type="date"
            value={budForm.period_start}
            onChange={(e) => setBudForm((f) => ({ ...f, period_start: e.target.value }))}
          />
          <Input
            id="co_pb_pe"
            label="Period end (optional)"
            type="date"
            value={budForm.period_end}
            onChange={(e) => setBudForm((f) => ({ ...f, period_end: e.target.value }))}
          />
          <TextArea id="co_pb_notes" label="Notes" rows={3} value={budForm.notes} onChange={(v) => setBudForm((f) => ({ ...f, notes: v }))} />
          <Select
            id="co_pb_active"
            label="Active"
            value={budForm.is_active}
            onChange={(e) => setBudForm((f) => ({ ...f, is_active: e.target.value }))}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </div>
      </Drawer>
    </div>
  )
}
