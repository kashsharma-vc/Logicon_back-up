import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import {
  listSurveyRoleMappings,
  createSurveyRoleMapping,
  updateSurveyRoleMapping,
  deleteSurveyRoleMapping,
} from '@/api/sales'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { listWageCategories } from '@/api/wages'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import type { SurveyRoleMapping } from '@/types/sales'

interface WageCategoryRow {
  id: number
  name: string
  code: string
}

export function SurveyRoleMappingsTab() {
  const me = useAuthStore((s) => s.me)
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canUpdate = hasAnyCapability(meCaps, [CAP.SALES_SURVEY_UPDATE])

  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<SurveyRoleMapping[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  // Dropdown options
  const [jobRoles, setJobRoles] = useState<JobRoleRow[]>([])
  const [wageCategories, setWageCategories] = useState<WageCategoryRow[]>([])

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<SurveyRoleMapping | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form Fields
  const [descriptionText, setDescriptionText] = useState('')
  const [selectedJobRole, setSelectedJobRole] = useState('')
  const [selectedWageCategory, setSelectedWageCategory] = useState('')
  const [serviceCategory, setServiceCategory] = useState('technical')
  const [shiftHours, setShiftHours] = useState('8')
  const [workingDays, setWorkingDays] = useState('26')
  const [mappingActive, setMappingActive] = useState(true)

  const orgId = me?.org ?? undefined

  const refresh = useCallback(
    async (pageOverride?: number) => {
      const usePage = pageOverride ?? page
      setLoading(true)
      setError(null)
      try {
        const res = await listSurveyRoleMappings({
          search: search || undefined,
          org: orgId,
          is_active: isActive,
          page: usePage,
        })
        setRows(res.items)
        setCount(res.count)
      } catch (e: unknown) {
        setRows([])
        setCount(undefined)
        setError(parseApiError(e, 'Failed to load survey role mappings').message)
      } finally {
        setLoading(false)
      }
    },
    [search, orgId, isActive, page],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Load dropdown resources
  useEffect(() => {
    async function loadOptions() {
      try {
        const [jrRes, wcRes] = await Promise.all([
          listJobRoles({ is_active: true }),
          listWageCategories()
        ])
        setJobRoles(jrRes.items || [])
        // If listWageCategories returns unwrapped items array directly or an object, handle it:
        const wcItems = Array.isArray(wcRes) ? wcRes : (wcRes as any).items || []
        setWageCategories(wcItems)
      } catch (err) {
        console.error('Failed to load mapping dropdown options', err)
      }
    }
    void loadOptions()
  }, [])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  function openCreate() {
    setDrawerMode('create')
    setEditing(null)
    setDescriptionText('')
    setSelectedJobRole('')
    setSelectedWageCategory('')
    setServiceCategory('technical')
    setShiftHours('8')
    setWorkingDays('26')
    setMappingActive(true)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(r: SurveyRoleMapping) {
    setDrawerMode('edit')
    setEditing(r)
    setDescriptionText(r.description_text)
    setSelectedJobRole(String(r.job_role))
    setSelectedWageCategory(String(r.wage_category))
    setServiceCategory(r.service_category || 'technical')
    setShiftHours(String(r.shift_hours ?? 8))
    setWorkingDays(String(r.working_days ?? 26))
    setMappingActive(r.is_active)
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormSubmitting(false)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedJobRole || !selectedWageCategory || !descriptionText.trim()) {
      setFormError('Please fill in all required fields.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      const payload = {
        org: orgId,
        description_text: descriptionText.trim(),
        job_role: parseInt(selectedJobRole),
        wage_category: parseInt(selectedWageCategory),
        service_category: serviceCategory,
        shift_hours: parseFloat(shiftHours) || 8,
        working_days: parseFloat(workingDays) || 26,
        is_active: mappingActive,
      }

      if (drawerMode === 'create') {
        await createSurveyRoleMapping(payload)
      } else if (editing) {
        await updateSurveyRoleMapping(editing.id, payload)
      }

      closeDrawer()
      void refresh()
    } catch (err: unknown) {
      setFormError(parseApiError(err, 'Failed to save survey role mapping').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Are you sure you want to delete this survey role mapping?')) return
    try {
      await deleteSurveyRoleMapping(id)
      void refresh()
    } catch (err: unknown) {
      alert(parseApiError(err, 'Delete failed').message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-app-subtle" />
            <input
              type="text"
              placeholder="Search by label or role..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-9 pr-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <select
            value={isActive === undefined ? 'all' : String(isActive)}
            onChange={(e) => {
              const v = e.target.value
              setIsActive(v === 'all' ? undefined : v === 'true')
              setPage(1)
            }}
            className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="all">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        {canUpdate && (
          <Button onClick={openCreate} className="flex items-center gap-1.5 self-start sm:self-center">
            <Plus className="h-4 w-4" /> Add Mapping
          </Button>
        )}
      </div>

      {/* Main Table */}
      {loading ? (
        <Spinner label="Loading mappings..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No survey role mappings found" description="Create a mapping to resolve deployment rows to job roles." />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-app-border bg-app-surface shadow-panel">
          <Table>
            <THead>
              <TR>
                <TH>Deployment Text (Label)</TH>
                <TH>Mapped Job Role</TH>
                <TH>Wage Category</TH>
                <TH>Service Type</TH>
                <TH>Defaults (Hours/Days)</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-semibold text-app-text">{r.description_text}</TD>
                  <TD className="text-sm">{r.job_role_name || `Role #${r.job_role}`}</TD>
                  <TD className="text-sm">{r.wage_category_name || `Category #${r.wage_category}`}</TD>
                  <TD className="text-sm capitalize">{r.service_category || '—'}</TD>
                  <TD className="text-sm">{r.shift_hours}h / {r.working_days} days</TD>
                  <TD>
                    {r.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <div className="flex gap-2 justify-end">
                      {canUpdate && (
                        <>
                          <Button variant="ghost" onClick={() => openEdit(r)}>
                            Edit
                          </Button>
                          <Button variant="danger" onClick={() => handleDelete(r.id)}>
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages && totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-app-secondary">
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Editor Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerMode === 'create' ? 'Create Survey Role Mapping' : 'Edit Survey Role Mapping'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="srm-form" disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : 'Save Mapping'}
            </Button>
          </div>
        }
      >
        <form id="srm-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {formError && (
            <p className="rounded-panel bg-status-danger/8 px-4 py-3 text-sm text-status-danger" role="alert">
              {formError}
            </p>
          )}

          <Input
            label="Deployment Text (Label) *"
            placeholder="e.g. Plumber"
            value={descriptionText}
            onChange={(e) => setDescriptionText(e.target.value)}
            required
            disabled={drawerMode === 'edit'}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-app-secondary">Mapped Job Role *</label>
            <select
              value={selectedJobRole}
              onChange={(e) => setSelectedJobRole(e.target.value)}
              required
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none"
            >
              <option value="">Select job role...</option>
              {jobRoles.map((jr) => (
                <option key={jr.id} value={jr.id}>
                  {jr.name} ({jr.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-app-secondary">Wage Category *</label>
            <select
              value={selectedWageCategory}
              onChange={(e) => setSelectedWageCategory(e.target.value)}
              required
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none"
            >
              <option value="">Select wage category...</option>
              {wageCategories.map((wc) => (
                <option key={wc.id} value={wc.id}>
                  {wc.name} ({wc.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-app-secondary">Service Type *</label>
            <select
              value={serviceCategory}
              onChange={(e) => setServiceCategory(e.target.value)}
              required
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none"
            >
              <option value="housekeeping">Housekeeping</option>
              <option value="technical">Technical / O&M</option>
              <option value="others">Others</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Shift Hours"
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={shiftHours}
              onChange={(e) => setShiftHours(e.target.value)}
              required
            />
            <Input
              label="Working Days"
              type="number"
              min="1"
              max="31"
              step="0.5"
              value={workingDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={mappingActive}
              onChange={(e) => setMappingActive(e.target.checked)}
            />
            <span className="text-sm font-medium text-app-text">Is Active</span>
          </label>
        </form>
      </Drawer>
    </div>
  )
}
