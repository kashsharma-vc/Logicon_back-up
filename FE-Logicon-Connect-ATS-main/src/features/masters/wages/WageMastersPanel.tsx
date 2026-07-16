import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  listLocationAreas,
  createLocationArea,
  updateLocationArea,
  deleteLocationArea,
  listWageCategoriesPaginated,
  createWageCategory,
  updateWageCategory,
  deleteWageCategory,
  listMinimumWageRates,
  createMinimumWageRate,
  updateMinimumWageRate,
  deleteMinimumWageRate,
  type LocationAreaRow,
  type LocationAreaType,
  type WageCategoryRow,
  type MinimumWageRateRow,
} from '@/api/wages'
import { listOrganizations, type OrganizationRow } from '@/api/organizations'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
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

type WageTab = 'locations' | 'categories' | 'rates'

const AREA_TYPES: { value: LocationAreaType; label: string }[] = [
  { value: 'state', label: 'State' },
  { value: 'region', label: 'Region' },
  { value: 'city', label: 'City' },
  { value: 'zone', label: 'Zone' },
]

function parseTab(v: string | null): WageTab {
  if (v === 'categories' || v === 'rates') return v
  return 'locations'
}

function parseBoolParam(v: string | null): boolean | undefined {
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

function parsePage(v: string | null): number {
  if (!v) return 1
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function parseNumParam(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return n
}

function CompactSelect({
  value,
  onChange,
  disabled,
  ariaLabel,
  children,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
    >
      {children}
    </select>
  )
}

export function WageMastersPanel() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.WAGE_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.WAGE_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.WAGE_DELETE])

  const [params, setParams] = useSearchParams()
  const tab = parseTab(params.get('tab'))
  const search = params.get('search') ?? ''
  const page = parsePage(params.get('page'))
  const is_active = parseBoolParam(params.get('is_active'))
  const area_type = (params.get('area_type') as LocationAreaType | '') || ''
  const rateWc = parseNumParam(params.get('wc'))

  const [lookupsLoading, setLookupsLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const [parentLocations, setParentLocations] = useState<LocationAreaRow[]>([])
  const [jobRoles, setJobRoles] = useState<JobRoleRow[]>([])
  const [wageCategoriesPick, setWageCategoriesPick] = useState<WageCategoryRow[]>([])

  const updateParam = useCallback(
    (next: Record<string, string | null>) => {
      const p = new URLSearchParams(params)
      Object.entries(next).forEach(([k, v]) => {
        if (v == null || v === '') p.delete(k)
        else p.set(k, v)
      })
      if (next.search !== undefined || next.is_active !== undefined || next.area_type !== undefined || next.wc !== undefined) {
        p.delete('page')
      }
      setParams(p)
    },
    [params, setParams],
  )

  async function loadLookups() {
    setLookupsLoading(true)
    setLookupError(null)
    try {
      const [orgs, locs, roles, cats] = await Promise.all([
        listOrganizations({ page: 1 }),
        listLocationAreas({ page: 1, is_active: true }),
        listJobRoles(),
        listWageCategoriesPaginated({ page: 1 }),
      ])
      setOrganizations(orgs.items)
      setParentLocations(locs.items)
      setJobRoles(roles)
      setWageCategoriesPick(cats.items)
    } catch (e: unknown) {
      setOrganizations([])
      setParentLocations([])
      setJobRoles([])
      setWageCategoriesPick([])
      setLookupError(parseApiError(e, 'Failed to load form lookups').message)
    } finally {
      setLookupsLoading(false)
    }
  }

  useEffect(() => {
    void loadLookups()
  }, [])

  // ─── Locations state ─────────────────────────────────────────────────────
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [locRows, setLocRows] = useState<LocationAreaRow[]>([])
  const [locCount, setLocCount] = useState<number | undefined>(undefined)
  const [locDrawer, setLocDrawer] = useState(false)
  const [locEditing, setLocEditing] = useState<LocationAreaRow | null>(null)
  const [locSubmit, setLocSubmit] = useState(false)
  const [locFormErr, setLocFormErr] = useState<string | null>(null)
  const [locName, setLocName] = useState('')
  const [locCode, setLocCode] = useState('')
  const [locAreaType, setLocAreaType] = useState<LocationAreaType>('state')
  const [locParent, setLocParent] = useState('')
  const [locStateName, setLocStateName] = useState('')
  const [locIsActive, setLocIsActive] = useState(true)

  async function refreshLocations() {
    if (tab !== 'locations') return
    setLocLoading(true)
    setLocError(null)
    try {
      const res = await listLocationAreas({
        search: search || undefined,
        page,
        is_active,
        area_type: area_type || undefined,
      })
      setLocRows(res.items)
      setLocCount(res.count)
    } catch (e: unknown) {
      setLocRows([])
      setLocCount(undefined)
      setLocError(parseApiError(e, 'Failed to load locations').message)
    } finally {
      setLocLoading(false)
    }
  }

  useEffect(() => {
    void refreshLocations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, page, is_active, area_type])

  function openLocCreate() {
    setLocEditing(null)
    setLocFormErr(null)
    setLocName('')
    setLocCode('')
    setLocAreaType('state')
    setLocParent('')
    setLocStateName('')
    setLocIsActive(true)
    setLocDrawer(true)
  }

  function openLocEdit(row: LocationAreaRow) {
    setLocEditing(row)
    setLocFormErr(null)
    setLocName(row.name)
    setLocCode(row.code)
    setLocAreaType(row.area_type)
    setLocParent(row.parent ? String(row.parent) : '')
    setLocStateName(row.state_name ?? '')
    setLocIsActive(row.is_active)
    setLocDrawer(true)
  }

  function closeLocDrawer() {
    setLocDrawer(false)
    setLocSubmit(false)
    setLocFormErr(null)
  }

  async function submitLocation() {
    setLocSubmit(true)
    setLocFormErr(null)
    const payload = {
      name: locName.trim(),
      code: locCode.trim(),
      area_type: locAreaType,
      parent: locParent ? Number(locParent) : null,
      state_name: locStateName.trim(),
      is_active: locIsActive,
    }
    if (!payload.name || !payload.code) {
      setLocFormErr('Name and code are required.')
      setLocSubmit(false)
      return
    }
    try {
      if (locEditing) {
        await updateLocationArea(locEditing.id, payload)
      } else {
        await createLocationArea(payload)
      }
      closeLocDrawer()
      await refreshLocations()
    } catch (e: unknown) {
      setLocFormErr(parseApiError(e, 'Save failed').message)
    } finally {
      setLocSubmit(false)
    }
  }

  async function softDeleteLocation(row: LocationAreaRow) {
    if (!canDelete) return
    const ok = window.confirm(`Deactivate location "${row.name}"? It will be marked inactive.`)
    if (!ok) return
    try {
      await deleteLocationArea(row.id)
      await refreshLocations()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Deactivate failed').message)
    }
  }

  // ─── Categories state ─────────────────────────────────────────────────────
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [catRows, setCatRows] = useState<WageCategoryRow[]>([])
  const [catCount, setCatCount] = useState<number | undefined>(undefined)
  const [catDrawer, setCatDrawer] = useState(false)
  const [catEditing, setCatEditing] = useState<WageCategoryRow | null>(null)
  const [catSubmit, setCatSubmit] = useState(false)
  const [catFormErr, setCatFormErr] = useState<string | null>(null)
  const [catName, setCatName] = useState('')
  const [catCode, setCatCode] = useState('')
  const [catDesc, setCatDesc] = useState('')

  async function refreshCategories() {
    if (tab !== 'categories') return
    setCatLoading(true)
    setCatError(null)
    try {
      const res = await listWageCategoriesPaginated({ search: search || undefined, page })
      setCatRows(res.items)
      setCatCount(res.count)
    } catch (e: unknown) {
      setCatRows([])
      setCatCount(undefined)
      setCatError(parseApiError(e, 'Failed to load wage categories').message)
    } finally {
      setCatLoading(false)
    }
  }

  useEffect(() => {
    void refreshCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, page])

  function openCatCreate() {
    setCatEditing(null)
    setCatFormErr(null)
    setCatName('')
    setCatCode('')
    setCatDesc('')
    setCatDrawer(true)
  }

  function openCatEdit(row: WageCategoryRow) {
    setCatEditing(row)
    setCatFormErr(null)
    setCatName(row.name)
    setCatCode(row.code)
    setCatDesc(row.description ?? '')
    setCatDrawer(true)
  }

  function closeCatDrawer() {
    setCatDrawer(false)
    setCatSubmit(false)
    setCatFormErr(null)
  }

  async function submitCategory() {
    setCatSubmit(true)
    setCatFormErr(null)
    const payload = { name: catName.trim(), code: catCode.trim(), description: catDesc.trim() }
    if (!payload.name || !payload.code) {
      setCatFormErr('Name and code are required.')
      setCatSubmit(false)
      return
    }
    try {
      if (catEditing) {
        await updateWageCategory(catEditing.id, payload)
      } else {
        await createWageCategory(payload)
      }
      closeCatDrawer()
      await refreshCategories()
      void loadLookups()
    } catch (e: unknown) {
      setCatFormErr(parseApiError(e, 'Save failed').message)
    } finally {
      setCatSubmit(false)
    }
  }

  async function hardDeleteCategory(row: WageCategoryRow) {
    if (!canDelete) return
    const ok = window.confirm(`Permanently delete wage category "${row.name}"? This cannot be undone.`)
    if (!ok) return
    try {
      await deleteWageCategory(row.id)
      await refreshCategories()
      void loadLookups()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
  }

  // ─── Rates state ──────────────────────────────────────────────────────────
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [rateRows, setRateRows] = useState<MinimumWageRateRow[]>([])
  const [rateCount, setRateCount] = useState<number | undefined>(undefined)
  const [rateDrawer, setRateDrawer] = useState(false)
  const [rateEditing, setRateEditing] = useState<MinimumWageRateRow | null>(null)
  const [rateSubmit, setRateSubmit] = useState(false)
  const [rateFormErr, setRateFormErr] = useState<string | null>(null)

  const [rateOrg, setRateOrg] = useState('')
  const [rateLocation, setRateLocation] = useState('')
  const [rateState, setRateState] = useState('')
  const [rateCity, setRateCity] = useState('')
  const [rateWageCategory, setRateWageCategory] = useState('')
  const [rateRole, setRateRole] = useState('')
  const [rateMonthly, setRateMonthly] = useState('')
  const [rateDaily, setRateDaily] = useState('')
  const [rateEffFrom, setRateEffFrom] = useState('')
  const [rateEffTo, setRateEffTo] = useState('')
  const [rateSource, setRateSource] = useState('')
  const [rateIsActive, setRateIsActive] = useState(true)

  const rateMonthlyNum = useMemo(() => {
    const n = Number(rateMonthly)
    return Number.isFinite(n) ? n : NaN
  }, [rateMonthly])
  const rateDailyNum = useMemo(() => {
    const t = rateDaily.trim()
    if (!t) return null
    const n = Number(rateDaily)
    return Number.isFinite(n) ? n : NaN
  }, [rateDaily])
  const rateDateErr = useMemo(() => {
    if (!rateEffFrom || !rateEffTo) return null
    return rateEffTo < rateEffFrom ? 'Effective to must be on or after effective from.' : null
  }, [rateEffFrom, rateEffTo])
  const rateWageErr = useMemo(() => {
    if (!Number.isFinite(rateMonthlyNum) || rateMonthlyNum <= 0) return 'Monthly wage must be greater than 0.'
    if (rateDailyNum != null && Number.isNaN(rateDailyNum)) return 'Daily wage must be a valid number.'
    if (rateDailyNum != null && !Number.isNaN(rateDailyNum) && rateDailyNum <= 0) return 'Daily wage must be greater than 0 when provided.'
    return null
  }, [rateMonthlyNum, rateDailyNum])

  async function refreshRates() {
    if (tab !== 'rates') return
    setRateLoading(true)
    setRateError(null)
    try {
      const res = await listMinimumWageRates({
        search: search || undefined,
        page,
        is_active,
        wage_category: rateWc,
      })
      setRateRows(res.items)
      setRateCount(res.count)
    } catch (e: unknown) {
      setRateRows([])
      setRateCount(undefined)
      setRateError(parseApiError(e, 'Failed to load wage rates').message)
    } finally {
      setRateLoading(false)
    }
  }

  useEffect(() => {
    void refreshRates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, page, is_active, rateWc])

  function openRateCreate() {
    setRateEditing(null)
    setRateFormErr(null)
    setRateOrg('')
    setRateLocation('')
    setRateState('')
    setRateCity('')
    setRateWageCategory('')
    setRateRole('')
    setRateMonthly('')
    setRateDaily('')
    setRateEffFrom('')
    setRateEffTo('')
    setRateSource('')
    setRateIsActive(true)
    setRateDrawer(true)
  }

  function openRateEdit(row: MinimumWageRateRow) {
    setRateEditing(row)
    setRateFormErr(null)
    setRateOrg(row.org != null ? String(row.org) : '')
    setRateLocation(row.location != null ? String(row.location) : '')
    setRateState(row.state ?? '')
    setRateCity(row.city ?? '')
    setRateWageCategory(String(row.wage_category))
    setRateRole(row.role != null ? String(row.role) : '')
    setRateMonthly(String(row.monthly_wage))
    setRateDaily(row.daily_wage != null ? String(row.daily_wage) : '')
    setRateEffFrom(row.effective_from)
    setRateEffTo(row.effective_to ?? '')
    setRateSource(row.source_note ?? '')
    setRateIsActive(row.is_active)
    setRateDrawer(true)
  }

  function closeRateDrawer() {
    setRateDrawer(false)
    setRateSubmit(false)
    setRateFormErr(null)
  }

  async function submitRate() {
    setRateSubmit(true)
    setRateFormErr(null)
    if (!rateWageCategory) {
      setRateFormErr('Wage category is required.')
      setRateSubmit(false)
      return
    }
    if (!rateEffFrom) {
      setRateFormErr('Effective from is required.')
      setRateSubmit(false)
      return
    }
    if (rateWageErr || rateDateErr) {
      setRateFormErr(rateWageErr || rateDateErr)
      setRateSubmit(false)
      return
    }
    const payload = {
      org: rateOrg ? Number(rateOrg) : null,
      location: rateLocation ? Number(rateLocation) : null,
      state: rateState.trim(),
      city: rateCity.trim() || null,
      wage_category: Number(rateWageCategory),
      role: rateRole ? Number(rateRole) : null,
      monthly_wage: rateMonthlyNum,
      daily_wage: rateDaily.trim() ? Number(rateDaily) : null,
      effective_from: rateEffFrom,
      effective_to: rateEffTo.trim() || null,
      source_note: rateSource.trim(),
      is_active: rateIsActive,
    }
    try {
      if (rateEditing) {
        await updateMinimumWageRate(rateEditing.id, payload)
      } else {
        await createMinimumWageRate(payload)
      }
      closeRateDrawer()
      await refreshRates()
    } catch (e: unknown) {
      setRateFormErr(parseApiError(e, 'Save failed').message)
    } finally {
      setRateSubmit(false)
    }
  }

  async function softDeleteRate(row: MinimumWageRateRow) {
    if (!canDelete) return
    const ok = window.confirm(`Deactivate this minimum wage rate? It will be marked inactive.`)
    if (!ok) return
    try {
      await deleteMinimumWageRate(row.id)
      await refreshRates()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Deactivate failed').message)
    }
  }

  const totalPages = useMemo(() => {
    const c =
      tab === 'locations' ? locCount : tab === 'categories' ? catCount : tab === 'rates' ? rateCount : undefined
    if (typeof c !== 'number') return undefined
    return Math.max(1, Math.ceil(c / 50))
  }, [tab, locCount, catCount, rateCount])

  const activeLoading =
    tab === 'locations' ? locLoading : tab === 'categories' ? catLoading : tab === 'rates' ? rateLoading : false
  const activeError =
    tab === 'locations' ? locError : tab === 'categories' ? catError : tab === 'rates' ? rateError : null
  const activeRows =
    tab === 'locations' ? locRows : tab === 'categories' ? catRows : tab === 'rates' ? rateRows : []

  return (
    <div className="w-full space-y-4">
      {lookupError ? <ErrorState message={`Form lookups failed: ${lookupError}`} /> : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">Search</p>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
              <Search className="h-4 w-4" aria-hidden />
            </div>
            <input
              value={search}
              onChange={(e) => updateParam({ search: e.target.value })}
              placeholder={tab === 'rates' ? 'State, city, source, category…' : 'Name or code…'}
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search"
            />
          </div>
        </div>

        {tab === 'locations' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
            <div>
              <p className="mb-1 text-xs font-medium text-app-subtle">Area type</p>
              <CompactSelect
                ariaLabel="Filter by area type"
                value={area_type}
                onChange={(v) => updateParam({ area_type: v || null })}
              >
                <option value="">All</option>
                {AREA_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </CompactSelect>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-app-subtle">Status</p>
              <CompactSelect
                ariaLabel="Filter by status"
                value={typeof is_active === 'boolean' ? String(is_active) : ''}
                onChange={(v) => updateParam({ is_active: v || null })}
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </CompactSelect>
            </div>
          </div>
        ) : null}

        {tab === 'rates' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
            <div>
              <p className="mb-1 text-xs font-medium text-app-subtle">Wage category</p>
              <CompactSelect
                ariaLabel="Filter by wage category"
                value={rateWc ? String(rateWc) : ''}
                onChange={(v) => updateParam({ wc: v || null })}
                disabled={lookupsLoading}
              >
                <option value="">All</option>
                {wageCategoriesPick.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name}
                  </option>
                ))}
              </CompactSelect>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-app-subtle">Status</p>
              <CompactSelect
                ariaLabel="Filter by status"
                value={typeof is_active === 'boolean' ? String(is_active) : ''}
                onChange={(v) => updateParam({ is_active: v || null })}
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </CompactSelect>
            </div>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          {tab === 'locations' && canCreate ? (
            <Button onClick={openLocCreate} disabled={!!lookupError}>
              Add location
            </Button>
          ) : null}
          {tab === 'categories' && canCreate ? (
            <Button onClick={openCatCreate} disabled={!!lookupError}>
              Add category
            </Button>
          ) : null}
          {tab === 'rates' && canCreate ? (
            <Button onClick={openRateCreate} disabled={!!lookupError}>
              Add rate
            </Button>
          ) : null}
        </div>
      </div>

      {activeLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner label="Loading" />
        </div>
      ) : activeError ? (
        <div className="space-y-3">
          <ErrorState message={activeError} />
          <Button
            variant="secondary"
            onClick={() => {
              if (tab === 'locations') void refreshLocations()
              else if (tab === 'categories') void refreshCategories()
              else void refreshRates()
            }}
          >
            Retry
          </Button>
        </div>
      ) : activeRows.length === 0 ? (
        <EmptyState title="No rows" description="Try another search or filter." />
      ) : tab === 'locations' ? (
        <>
          <div className="grid gap-3 md:hidden">
            {(activeRows as LocationAreaRow[]).map((r) => (
              <div key={r.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-text">{r.name}</p>
                    <p className="truncate text-xs text-app-secondary">
                      {r.code} · {r.area_type_display ?? r.area_type}
                    </p>
                  </div>
                  {r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
                </div>
                <dl className="mt-3 grid gap-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-app-subtle">Parent</dt>
                    <dd className="text-app-secondary">{r.parent_name ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-app-subtle">State</dt>
                    <dd className="text-app-secondary">{r.state_name || '—'}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canUpdate ? (
                    <Button variant="secondary" className="min-h-9 px-3" onClick={() => openLocEdit(r)}>
                      Edit
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button variant="danger" className="min-h-9 px-3" onClick={() => softDeleteLocation(r)}>
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Code</TH>
                  <TH>Type</TH>
                  <TH>Parent</TH>
                  <TH>State</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {(activeRows as LocationAreaRow[]).map((r) => (
                  <TR key={r.id}>
                    <TD className="text-app-text">{r.name}</TD>
                    <TD className="font-mono text-app-secondary">{r.code}</TD>
                    <TD className="text-app-secondary">{r.area_type_display ?? r.area_type}</TD>
                    <TD className="text-app-secondary">{r.parent_name ?? '—'}</TD>
                    <TD className="text-app-secondary">{r.state_name || '—'}</TD>
                    <TD>{r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate ? (
                          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openLocEdit(r)}>
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="danger" className="min-h-9 px-3" onClick={() => softDeleteLocation(r)}>
                            Deactivate
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      ) : tab === 'categories' ? (
        <>
          <div className="grid gap-3 md:hidden">
            {(activeRows as WageCategoryRow[]).map((r) => (
              <div key={r.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
                <p className="text-sm font-semibold text-app-text">{r.name}</p>
                <p className="text-xs text-app-secondary">{r.code}</p>
                <p className="mt-2 text-xs text-app-secondary">{r.description || '—'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canUpdate ? (
                    <Button variant="secondary" className="min-h-9 px-3" onClick={() => openCatEdit(r)}>
                      Edit
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button variant="danger" className="min-h-9 px-3" onClick={() => hardDeleteCategory(r)}>
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Code</TH>
                  <TH>Description</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {(activeRows as WageCategoryRow[]).map((r) => (
                  <TR key={r.id}>
                    <TD className="text-app-text">{r.name}</TD>
                    <TD className="font-mono text-app-secondary">{r.code}</TD>
                    <TD className="max-w-md truncate text-app-secondary">{r.description || '—'}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate ? (
                          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openCatEdit(r)}>
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="danger" className="min-h-9 px-3" onClick={() => hardDeleteCategory(r)}>
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {(activeRows as MinimumWageRateRow[]).map((r) => (
              <div key={r.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-text">{r.wage_category_name ?? `#${r.wage_category}`}</p>
                    <p className="truncate text-xs text-app-secondary">
                      {(r.location_name ?? [r.state, r.city].filter(Boolean).join(' / ')) || '—'}
                    </p>
                  </div>
                  {r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
                </div>
                <dl className="mt-3 grid gap-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-app-subtle">Role</dt>
                    <dd className="text-app-secondary">
                      {r.role_name ? `${r.role_name} (${r.role_code})` : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-app-subtle">Wages</dt>
                    <dd className="text-app-secondary">
                      {r.monthly_wage} / mo{r.daily_wage ? ` · ${r.daily_wage} / day` : ''}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-app-subtle">Effective</dt>
                    <dd className="font-mono text-app-secondary">
                      {r.effective_from}
                      {r.effective_to ? ` → ${r.effective_to}` : ''}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canUpdate ? (
                    <Button variant="secondary" className="min-h-9 px-3" onClick={() => openRateEdit(r)}>
                      Edit
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button variant="danger" className="min-h-9 px-3" onClick={() => softDeleteRate(r)}>
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Location</TH>
                  <TH>Category</TH>
                  <TH>Role</TH>
                  <TH>Monthly</TH>
                  <TH>Daily</TH>
                  <TH>Effective</TH>
                  <TH>Source</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {(activeRows as MinimumWageRateRow[]).map((r) => (
                  <TR key={r.id}>
                    <TD className="text-app-secondary">
                      {(r.location_name ?? [r.state, r.city].filter(Boolean).join(' / ')) || '—'}
                    </TD>
                    <TD className="text-app-text">{r.wage_category_name ?? r.wage_category}</TD>
                    <TD className="text-app-secondary">
                      {r.role_name ? (
                        <>
                          {r.role_name}
                          <span className="ml-1 font-mono text-xs text-app-subtle">{r.role_code}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </TD>
                    <TD className="font-mono text-app-secondary">{r.monthly_wage}</TD>
                    <TD className="font-mono text-app-secondary">{r.daily_wage ?? '—'}</TD>
                    <TD className="font-mono text-xs text-app-secondary">
                      {r.effective_from}
                      {r.effective_to ? ` → ${r.effective_to}` : ''}
                    </TD>
                    <TD className="max-w-[200px] truncate text-xs text-app-subtle">{r.source_note || '—'}</TD>
                    <TD>{r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate ? (
                          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openRateEdit(r)}>
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="danger" className="min-h-9 px-3" onClick={() => softDeleteRate(r)}>
                            Deactivate
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}

      {activeRows.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-app-subtle">
            {typeof (tab === 'locations' ? locCount : tab === 'categories' ? catCount : rateCount) === 'number'
              ? `${tab === 'locations' ? locCount : tab === 'categories' ? catCount : rateCount} rows`
              : `${activeRows.length} rows`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="min-h-9 px-3" disabled={page <= 1} onClick={() => updateParam({ page: String(page - 1) })}>
              Prev
            </Button>
            <span className="text-xs text-app-secondary">
              Page {page}
              {totalPages ? ` / ${totalPages}` : ''}
            </span>
            <Button
              variant="secondary"
              className="min-h-9 px-3"
              disabled={typeof totalPages === 'number' ? page >= totalPages : activeRows.length < 50}
              onClick={() => updateParam({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {/* Location drawer */}
      <Drawer
        open={locDrawer}
        onClose={closeLocDrawer}
        title={locEditing ? 'Edit location' : 'Add location'}
        description="Geography nodes for wage and commercial matching."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeLocDrawer} disabled={locSubmit}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitLocation()}
              disabled={locSubmit || (locEditing ? !canUpdate : !canCreate)}
            >
              {locSubmit ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        {locFormErr ? <ErrorState message={locFormErr} /> : null}
        <div className="space-y-4">
          <Input label="Name" value={locName} onChange={(e) => setLocName(e.target.value)} disabled={locSubmit} required />
          <Input label="Code" value={locCode} onChange={(e) => setLocCode(e.target.value)} disabled={locSubmit} required />
          <Select label="Area type" value={locAreaType} onChange={(e) => setLocAreaType(e.target.value as LocationAreaType)} disabled={locSubmit}>
            {AREA_TYPES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
          <Select label="Parent (optional)" value={locParent} onChange={(e) => setLocParent(e.target.value)} disabled={locSubmit}>
            <option value="">None</option>
            {parentLocations
              .filter((p) => !locEditing || p.id !== locEditing.id)
              .map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} ({p.code})
                </option>
              ))}
          </Select>
          <Input
            label="State name (denormalized)"
            value={locStateName}
            onChange={(e) => setLocStateName(e.target.value)}
            disabled={locSubmit}
          />
          <label className="flex items-center gap-2 text-sm text-app-secondary">
            <input type="checkbox" checked={locIsActive} onChange={(e) => setLocIsActive(e.target.checked)} disabled={locSubmit} />
            Active
          </label>
        </div>
      </Drawer>

      {/* Category drawer */}
      <Drawer
        open={catDrawer}
        onClose={closeCatDrawer}
        title={catEditing ? 'Edit wage category' : 'Add wage category'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeCatDrawer} disabled={catSubmit}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitCategory()}
              disabled={catSubmit || (catEditing ? !canUpdate : !canCreate)}
            >
              {catSubmit ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        {catFormErr ? <ErrorState message={catFormErr} /> : null}
        <div className="space-y-4">
          <Input label="Name" value={catName} onChange={(e) => setCatName(e.target.value)} disabled={catSubmit} required />
          <Input label="Code" value={catCode} onChange={(e) => setCatCode(e.target.value)} disabled={catSubmit} required />
          <Input label="Description" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} disabled={catSubmit} />
        </div>
      </Drawer>

      {/* Rate drawer */}
      <Drawer
        open={rateDrawer}
        onClose={closeRateDrawer}
        title={rateEditing ? 'Edit minimum wage rate' : 'Add minimum wage rate'}
        description="Match structured location or legacy state/city when location is empty."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeRateDrawer} disabled={rateSubmit}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitRate()}
              disabled={
                rateSubmit ||
                !!rateWageErr ||
                !!rateDateErr ||
                (rateEditing ? !canUpdate : !canCreate)
              }
            >
              {rateSubmit ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        {rateFormErr ? <ErrorState message={rateFormErr} /> : null}
        <div className="space-y-4">
          <Select label="Organization (optional)" value={rateOrg} onChange={(e) => setRateOrg(e.target.value)} disabled={rateSubmit}>
            <option value="">All organizations (default)</option>
            {organizations.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.name} ({o.code})
              </option>
            ))}
          </Select>
          <Select label="Location (optional)" value={rateLocation} onChange={(e) => setRateLocation(e.target.value)} disabled={rateSubmit}>
            <option value="">None — use state/city below</option>
            {parentLocations.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.name} ({l.code})
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="State (fallback)" value={rateState} onChange={(e) => setRateState(e.target.value)} disabled={rateSubmit} />
            <Input label="City (fallback)" value={rateCity} onChange={(e) => setRateCity(e.target.value)} disabled={rateSubmit} />
          </div>
          <Select
            label="Wage category"
            value={rateWageCategory}
            onChange={(e) => setRateWageCategory(e.target.value)}
            disabled={rateSubmit}
            required
          >
            <option value="">Select…</option>
            {wageCategoriesPick.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name} ({w.code})
              </option>
            ))}
          </Select>
          <Select label="Job role (optional)" value={rateRole} onChange={(e) => setRateRole(e.target.value)} disabled={rateSubmit}>
            <option value="">Any role</option>
            {jobRoles.map((j) => (
              <option key={j.id} value={String(j.id)}>
                {j.name} ({j.code})
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Monthly wage"
              value={rateMonthly}
              onChange={(e) => setRateMonthly(e.target.value)}
              disabled={rateSubmit}
              required
              error={rateWageErr && !Number.isFinite(rateMonthlyNum) ? rateWageErr : undefined}
            />
            <Input label="Daily wage (optional)" value={rateDaily} onChange={(e) => setRateDaily(e.target.value)} disabled={rateSubmit} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Effective from" type="date" value={rateEffFrom} onChange={(e) => setRateEffFrom(e.target.value)} disabled={rateSubmit} required />
            <Input
              label="Effective to (optional)"
              type="date"
              value={rateEffTo}
              onChange={(e) => setRateEffTo(e.target.value)}
              disabled={rateSubmit}
              error={rateDateErr ?? undefined}
            />
          </div>
          <Input label="Source note" value={rateSource} onChange={(e) => setRateSource(e.target.value)} disabled={rateSubmit} />
          <label className="flex items-center gap-2 text-sm text-app-secondary">
            <input type="checkbox" checked={rateIsActive} onChange={(e) => setRateIsActive(e.target.checked)} disabled={rateSubmit} />
            Active
          </label>
        </div>
      </Drawer>
    </div>
  )
}
