import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Globe,
  LayoutGrid,
  MapPin,
  MoreHorizontal,
  Plus,
  Power,
  QrCode,
  Search,
  Settings2,
  Users,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { createCampaign, deleteCampaign, downloadCampaignQrPng, listCampaigns, updateCampaign } from '@/api/campaigns'
import { listFormTemplates } from '@/api/formBuilder'
import { listSites } from '@/api/sites'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import {
  CampaignForm,
  type CampaignFormValues,
  type FormTemplateOption,
  type SiteOption,
} from '@/features/campaigns/CampaignForm'
import { CampaignRoleManager } from '@/features/campaigns/CampaignRoleManager'
import type { FormTemplateRow } from '@/features/formBuilder/types'
import type { CampaignRow } from '@/features/campaigns/types'

function parseBoolParam(v: string | null): boolean | undefined {
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

function parseNumParam(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return n
}

function parsePage(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return undefined
  return Math.floor(n)
}

function formatDateShort(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Campaign Card Component
function CampaignCard({
  campaign,
  siteName,
  templateName,
  canUpdate,
  canDelete,
  onEdit,
  onDeactivate,
}: {
  campaign: CampaignRow
  siteName?: string
  templateName?: string
  canUpdate: boolean
  canDelete: boolean
  onEdit: () => void
  onDeactivate: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showActions, setShowActions] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await downloadCampaignQrPng(campaign.id)
      const filename = res.filename ?? `qr_${campaign.token.slice(0, 12)}.png`
      saveBlob(res.blob, filename)
    } catch {
      // Silent fail for UX
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopy() {
    try {
      const applyUrl = `${window.location.origin}/apply/${campaign.token}`
      await navigator.clipboard.writeText(applyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Silent fail
    }
  }

  const hasRoles = campaign.campaign_roles?.length > 0
  const roleCount = campaign.campaign_roles?.length ?? 0

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-app-surface transition-all',
        campaign.is_active
          ? 'border-app-border/80 shadow-sm hover:border-brand-400 hover:shadow-lg'
          : 'border-dashed border-app-border/60 opacity-75 hover:opacity-100',
      )}
    >
      {/* Header with QR visual */}
      <div className="relative flex items-start gap-4 p-5">
        {/* QR Icon/Visual */}
        <div
          className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform group-hover:scale-105',
            campaign.is_active
              ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white'
              : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white',
          )}
        >
          <QrCode className="h-8 w-8" />
        </div>

        {/* Campaign Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-app-heading">
                {campaign.title || campaign.name}
              </h3>
              {campaign.title && campaign.name !== campaign.title && (
                <p className="truncate text-xs text-app-secondary">{campaign.name}</p>
              )}
            </div>
            <Badge variant={campaign.is_active ? 'success' : 'danger'} className="shrink-0">
              {campaign.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Code & Token */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-muted px-2 py-0.5 font-mono text-[10px] text-app-secondary">
              {campaign.code}
            </span>
            <span className="font-mono text-[10px] text-app-subtle">{campaign.token.slice(0, 12)}...</span>
          </div>
        </div>

        {/* Actions dropdown trigger */}
        {(canUpdate || canDelete) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActions(!showActions)}
              onBlur={() => setTimeout(() => setShowActions(false), 150)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-app-subtle transition-colors hover:bg-app-muted hover:text-app-text"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showActions && (
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-xl border border-app-border bg-app-surface py-1 shadow-lg">
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowActions(false)
                      onEdit()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text transition-colors hover:bg-app-muted"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowActions(false)
                      onDeactivate()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-status-warning transition-colors hover:bg-app-muted"
                  >
                    <Power className="h-3.5 w-3.5" />
                    Deactivate
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="flex-1 space-y-3 border-t border-app-border/50 bg-gradient-to-b from-app-muted/20 to-app-surface px-5 py-4">
        {/* Site & Template */}
        <div className="space-y-1.5">
          {siteName && (
            <div className="flex items-center gap-2 text-xs text-app-secondary">
              <MapPin className="h-3.5 w-3.5 text-app-subtle" />
              <span className="truncate">{siteName}</span>
            </div>
          )}
          {templateName && (
            <div className="flex items-center gap-2 text-xs text-app-secondary">
              <Settings2 className="h-3.5 w-3.5 text-app-subtle" />
              <span className="truncate">{templateName}</span>
            </div>
          )}
          {(campaign.starts_at || campaign.ends_at) && (
            <div className="flex items-center gap-2 text-xs text-app-secondary">
              <Calendar className="h-3.5 w-3.5 text-app-subtle" />
              <span>
                {formatDateShort(campaign.starts_at)} → {formatDateShort(campaign.ends_at)}
              </span>
            </div>
          )}
        </div>

        {/* Languages */}
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-app-subtle" />
          <div className="flex flex-wrap gap-1">
            {campaign.enabled_languages.map((lang) => (
              <span
                key={lang}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
                  lang === campaign.default_language
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                    : 'bg-app-muted text-app-subtle',
                )}
              >
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Roles */}
        {hasRoles ? (
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-subtle" />
            <div className="flex flex-wrap gap-1">
              {campaign.campaign_roles.slice(0, 3).map((cr) => (
                <Badge key={cr.id} variant={cr.is_active ? 'info' : 'neutral'} className="text-[10px]">
                  {cr.job_role_code}
                </Badge>
              ))}
              {roleCount > 3 && (
                <Badge variant="neutral" className="text-[10px]">
                  +{roleCount - 3} more
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-app-subtle">
            <Users className="h-3.5 w-3.5" />
            <span>No roles assigned</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-app-border/50 bg-app-muted/30 px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={copied}
            className={cn(
              'flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-all',
              copied
                ? 'border-status-success/30 bg-status-success/10 text-status-success'
                : 'border-app-border bg-app-surface text-app-text hover:bg-app-muted',
            )}
          >
            {copied ? (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <ExternalLink className="h-3.5 w-3.5" />
                Copy Link
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex h-9 items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 text-xs font-medium text-app-text transition-colors hover:bg-app-muted"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? 'Saving...' : 'QR'}
          </button>
        </div>
        {canUpdate && (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-3 text-xs font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

// Stats Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  iconBg: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBg)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-bold text-app-text">{value}</p>
        <p className="text-[11px] text-app-subtle">{label}</p>
      </div>
    </div>
  )
}

export function CampaignsPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.CAMPAIGN_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.CAMPAIGN_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.CAMPAIGN_DELETE])

  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const is_active = parseBoolParam(params.get('is_active'))
  const site = parseNumParam(params.get('site'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CampaignRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [sitesLoading, setSitesLoading] = useState(false)
  const [sitesError, setSitesError] = useState<string | null>(null)
  const [sites, setSites] = useState<{ id: number; name: string; code: string }[]>([])
  const siteOptions: SiteOption[] = useMemo(
    () => sites.map((s) => ({ id: s.id, label: `${s.name} (${s.code})` })),
    [sites],
  )
  const siteNameById = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites])

  const [formTemplates, setFormTemplates] = useState<FormTemplateRow[]>([])
  const [formTemplatesError, setFormTemplatesError] = useState<string | null>(null)
  const formTemplateOptions: FormTemplateOption[] = useMemo(
    () => formTemplates.map((t) => ({ id: t.id, label: `${t.name} (${t.code})` })),
    [formTemplates],
  )
  const formTemplateNameById = useMemo(
    () => new Map(formTemplates.map((t) => [t.id, t.name] as const)),
    [formTemplates],
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<CampaignRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = useMemo(() => `campaign-form-${drawerMode}`, [drawerMode])

  // Stats
  const totalCampaigns = count ?? rows.length
  const activeCampaigns = rows.filter((r) => r.is_active).length
  const withRoles = rows.filter((r) => r.campaign_roles?.length > 0).length

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.is_active !== undefined || next.site !== undefined) {
      p.delete('page')
    }
    setParams(p)
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listCampaigns({
        search: search || undefined,
        is_active,
        site,
        page,
      })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load campaigns').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadSitesLookup() {
    setSitesLoading(true)
    setSitesError(null)
    try {
      const res = await listSites({ search: '', page: 1 })
      setSites(res.items as { id: number; name: string; code: string }[])
    } catch (e: unknown) {
      setSites([])
      setSitesError(parseApiError(e, 'Site lookup failed').message)
    } finally {
      setSitesLoading(false)
    }
  }

  async function loadFormTemplatesLookup() {
    setFormTemplatesError(null)
    try {
      const res = await listFormTemplates({ is_active: true })
      setFormTemplates(res.items)
    } catch (e: unknown) {
      setFormTemplates([])
      setFormTemplatesError(parseApiError(e, 'Form template lookup failed').message)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, is_active, site, page])

  useEffect(() => {
    void loadSitesLookup()
    void loadFormTemplatesLookup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  function openCreate() {
    setDrawerMode('create')
    setEditing(null)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(r: CampaignRow) {
    setDrawerMode('edit')
    setEditing(r)
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormSubmitting(false)
    setFormError(null)
  }

  async function submit(values: CampaignFormValues) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: values.name.trim(),
        title: values.title.trim() || undefined,
        code: values.code.trim(),
        site: values.site ? Number(values.site) : null,
        form_template: values.form_template ? Number(values.form_template) : null,
        is_active: values.is_active,
        starts_at: values.starts_at ? new Date(values.starts_at).toISOString() : null,
        ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
        allow_duplicates: values.allow_duplicates,
        requires_otp: values.requires_otp,
        shuffle_fields: values.shuffle_fields,
        default_language: values.default_language,
        enabled_languages: values.enabled_languages,
      }

      if (drawerMode === 'create') {
        await createCampaign(payload)
      } else if (editing) {
        await updateCampaign(editing.id, payload)
      }

      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeactivate(r: CampaignRow) {
    if (!canDelete) return
    const ok = window.confirm(`Deactivate campaign "${r.title || r.name}"?`)
    if (!ok) return
    try {
      await deleteCampaign(r.id)
      await refresh()
    } catch (e: unknown) {
      window.alert(parseApiError(e, 'Deactivate failed').message)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-app-heading">QR Campaigns</h2>
              <p className="text-sm text-app-secondary">Create and manage QR-based candidate intake campaigns</p>
            </div>
          </div>
        </div>
        {canCreate && (
          <Button onClick={openCreate} disabled={!!sitesError} className="gap-2 sm:self-start">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        )}
      </div>

      {sitesError && <ErrorState message={`Site lookup failed. Create/Edit is disabled. ${sitesError}`} />}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={LayoutGrid}
          label="Total Campaigns"
          value={totalCampaigns}
          iconBg="bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400"
        />
        <StatCard
          icon={QrCode}
          label="Active"
          value={activeCampaigns}
          iconBg="bg-status-success/10 text-status-success"
        />
        <StatCard
          icon={Users}
          label="With Roles"
          value={withRoles}
          iconBg="bg-status-info/10 text-status-info"
        />
        <StatCard
          icon={MapPin}
          label="Sites"
          value={sites.length}
          iconBg="bg-status-warning/10 text-status-warning"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">Filters</p>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
              <Search className="h-4 w-4" aria-hidden />
            </div>
            <input
              value={search}
              onChange={(e) => updateParam({ search: e.target.value })}
              placeholder="Search by name, title, code, or token..."
              className="min-h-10 w-full rounded-xl border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-sm placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search campaigns"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[400px]">
          <Select
            id="campaign_site_filter"
            label="Site"
            value={site ? String(site) : ''}
            onChange={(e) => updateParam({ site: e.target.value || null })}
            disabled={sitesLoading || !!sitesError}
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select
            id="campaign_active_filter"
            label="Status"
            value={typeof is_active === 'boolean' ? String(is_active) : ''}
            onChange={(e) => updateParam({ is_active: e.target.value || null })}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner label="Loading campaigns..." />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-muted/30 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-app-muted">
            <QrCode className="h-8 w-8 text-app-subtle" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-app-text">No campaigns found</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-app-secondary">
            Try adjusting your filters, or create a new campaign to get started.
          </p>
          {canCreate && (
            <Button onClick={openCreate} className="mt-6 gap-2" disabled={!!sitesError}>
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Campaign Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => (
              <CampaignCard
                key={r.id}
                campaign={r}
                siteName={r.site ? siteNameById.get(r.site) : undefined}
                templateName={
                  r.form_template != null
                    ? r.form_template_name ?? formTemplateNameById.get(r.form_template)
                    : undefined
                }
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={() => openEdit(r)}
                onDeactivate={() => handleDeactivate(r)}
              />
            ))}
          </div>

          {/* Pagination */}
          {typeof totalPages === 'number' && totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm text-app-secondary">
                Page <span className="font-semibold text-app-text">{page}</span> of{' '}
                <span className="font-semibold text-app-text">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => updateParam({ page: String(page - 1) })}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  disabled={totalPages ? page >= totalPages : rows.length < 50}
                  onClick={() => updateParam({ page: String(page + 1) })}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        title={drawerMode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
        description={
          drawerMode === 'create'
            ? 'Set up a QR campaign and public apply form behavior.'
            : 'Update campaign settings and manage attached roles.'
        }
        onClose={closeDrawer}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={formSubmitting || !!sitesError}>
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <CampaignForm
          formId={formId}
          mode={drawerMode}
          initialCampaign={editing}
          siteOptions={siteOptions}
          formTemplateOptions={formTemplateOptions}
          formTemplateLookupError={formTemplatesError}
          lookupError={sitesError}
          submitting={formSubmitting}
          errorMessage={formError}
          onSubmit={submit}
        />

        {drawerMode === 'edit' && editing ? (
          <div className="mt-6">
            <CampaignRoleManager campaignId={editing.id} formTemplateId={editing.form_template ?? null} />
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
