import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, FileText, ClipboardCheck, Briefcase, RefreshCw } from 'lucide-react'
import { getSalesDashboardSummary } from '@/api/sales'
import { parseApiError } from '@/lib/apiError'
import {
  LEAD_TYPE_LABELS,
  formatShortDate,
  leadTypeVariant,
  proposalStatusLabel,
  proposalStatusVariant,
  stageLabel,
  stageVariant,
  surveyStatusLabel,
  surveyStatusVariant,
} from '@/features/sales/salesUtils'
import { Badge } from '@/components/ui/Badge'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { NotificationBanner } from '@/features/notifications/NotificationBanner'
import type { SalesDashboardSummary } from '@/types/sales'

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  to,
  highlight,
  icon: Icon,
}: {
  label: string
  value: number
  to: string
  highlight?: 'success' | 'warning' | 'danger'
  icon?: React.ElementType
}) {
  const colorMap = {
    success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
    danger: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
  }
  const textMap = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  }
  const iconBgMap = {
    success: 'bg-green-100 dark:bg-green-900/40',
    warning: 'bg-amber-100 dark:bg-amber-900/40',
    danger: 'bg-red-100 dark:bg-red-900/40',
  }

  const border = highlight ? colorMap[highlight] : 'border-app-border bg-app-surface'
  const numColor = highlight ? textMap[highlight] : 'text-app-text'
  const iconBg = highlight ? iconBgMap[highlight] : 'bg-brand-100 dark:bg-brand-900/40'
  const iconColor = highlight ? textMap[highlight] : 'text-brand-600 dark:text-brand-400'

  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 ${border}`}
    >
      {Icon ? (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className={`text-2xl font-bold ${numColor}`}>{value}</p>
        <p className="truncate text-xs text-app-secondary">{label}</p>
      </div>
    </Link>
  )
}

// ─── Section card ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon?: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-app-border bg-app-surface shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
        {Icon ? <Icon className="h-4 w-4 text-brand-500" /> : null}
        <h3 className="text-sm font-semibold text-app-text">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// ─── Row link item ────────────────────────────────────────────────────────────

function RowItem({
  label,
  count,
  to,
  variant,
}: {
  label: string
  count: number
  to: string
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'attention'
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-app-muted"
    >
      <span className="flex items-center gap-2 text-sm text-app-text">
        {variant ? <Badge variant={variant}>{label}</Badge> : <span>{label}</span>}
      </span>
      <span className="text-sm font-bold text-app-text">{count}</span>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SalesDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SalesDashboardSummary | null>(null)

  function fetchData() {
    setLoading(true)
    setError(null)
    getSalesDashboardSummary()
      .then(setSummary)
      .catch((e: unknown) => setError(parseApiError(e, 'Failed to load sales summary').message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading && !summary) return <Spinner label="Loading sales dashboard…" />
  if (error && !summary) return <ErrorState message={error} />
  if (!summary) return null

  const { leads, surveys, proposals, conversion, recent_activity } = summary

  // ── Top tiles ───────────────────────────────────────────────────────────────
  const topTiles = [
    { label: 'Total leads', value: leads.total, to: '/sales/leads', icon: Briefcase },
    { label: 'Surveys pending', value: surveys.pending_assignment, to: '/sales/leads', highlight: surveys.pending_assignment > 0 ? ('warning' as const) : undefined, icon: ClipboardCheck },
    { label: 'Pending approval', value: proposals.pending_internal_approval, to: '/sales/leads', highlight: proposals.pending_internal_approval > 0 ? ('warning' as const) : undefined, icon: FileText },
    { label: 'Sent to client', value: proposals.sent_to_client, to: '/sales/leads', icon: FileText },
    { label: 'Won — awaiting mobilisation', value: conversion.won_pending_mobilisation, to: '/sales/leads?current_stage=won', highlight: conversion.won_pending_mobilisation > 0 ? ('success' as const) : undefined, icon: TrendingUp },
    { label: 'Converted', value: conversion.converted, to: '/sales/leads', highlight: conversion.converted > 0 ? ('success' as const) : undefined, icon: TrendingUp },
  ]

  // ── Proposal status rows ────────────────────────────────────────────────────
  const proposalRows: { key: keyof typeof proposals; label: string }[] = [
    { key: 'draft', label: proposalStatusLabel('draft') },
    { key: 'pending_internal_approval', label: proposalStatusLabel('pending_internal_approval') },
    { key: 'internally_approved', label: proposalStatusLabel('internally_approved') },
    { key: 'sent_to_client', label: proposalStatusLabel('sent_to_client') },
    { key: 'client_approved', label: proposalStatusLabel('client_approved') },
    { key: 'client_rejected', label: proposalStatusLabel('client_rejected') },
    { key: 'revision_requested', label: proposalStatusLabel('revision_requested') },
  ]

  // ── Survey rows ─────────────────────────────────────────────────────────────
  const surveyRows: { key: keyof typeof surveys; status: string }[] = [
    { key: 'pending_assignment', status: 'pending_assignment' },
    { key: 'in_progress', status: 'in_progress' },
    { key: 'completed', status: 'completed' },
  ]

  return (
    <div className="w-full space-y-6">
      <NotificationBanner area="sales" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Sales Dashboard</h1>
          <p className="mt-1 text-sm text-app-secondary">
            Pipeline overview across leads, surveys, proposals, and conversions
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-4 py-2.5 text-sm font-medium text-app-text shadow-sm transition-all hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-950"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Top tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {topTiles.map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} to={t.to} highlight={t.highlight} icon={t.icon} />
        ))}
      </div>

      {/* Main breakdown grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Lead Type" icon={Briefcase}>
          <div className="space-y-1">
            {leads.by_type.length === 0 ? (
              <p className="px-3 py-2 text-sm text-app-subtle">No leads yet.</p>
            ) : (
              leads.by_type.map((item) => (
                <RowItem
                  key={item.lead_type}
                  label={LEAD_TYPE_LABELS[item.lead_type as keyof typeof LEAD_TYPE_LABELS] ?? item.lead_type}
                  count={item.count}
                  to={`/sales/leads?lead_type=${item.lead_type}`}
                  variant={leadTypeVariant(item.lead_type)}
                />
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Lead Stage" icon={TrendingUp}>
          <div className="space-y-1">
            {leads.by_stage.length === 0 ? (
              <p className="px-3 py-2 text-sm text-app-subtle">No stage data yet.</p>
            ) : (
              leads.by_stage.map((item) => (
                <RowItem
                  key={item.stage}
                  label={stageLabel(item.stage)}
                  count={item.count}
                  to={`/sales/leads?current_stage=${item.stage}`}
                  variant={stageVariant(item.stage)}
                />
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Site Surveys" icon={ClipboardCheck}>
          <div className="space-y-1">
            {surveyRows.map(({ key, status }) => (
              <RowItem
                key={key}
                label={surveyStatusLabel(status)}
                count={surveys[key]}
                to="/sales/leads"
                variant={surveyStatusVariant(status)}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Proposals + Conversion + Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Proposals" icon={FileText}>
          <div className="space-y-1">
            {proposalRows.map(({ key, label }) => (
              <RowItem
                key={key}
                label={label}
                count={proposals[key]}
                to="/sales/leads"
                variant={proposalStatusVariant(key)}
              />
            ))}
          </div>

          <div className="mt-4 border-t border-app-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-subtle">Conversion</p>
            <div className="space-y-1">
              <RowItem
                label="Won — awaiting mobilisation"
                count={conversion.won_pending_mobilisation}
                to="/sales/leads?current_stage=won"
                variant="success"
              />
              <RowItem
                label="Converted"
                count={conversion.converted}
                to="/sales/leads"
                variant="neutral"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" icon={TrendingUp} className="lg:col-span-2">
          {recent_activity.length === 0 ? (
            <p className="px-1 py-2 text-sm text-app-subtle">No recent activity.</p>
          ) : (
            <ul className="divide-y divide-app-border">
              {recent_activity.map((item) => (
                <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                  <Link
                    to={`/sales/leads/${item.lead}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-app-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-app-text">{item.client_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant={leadTypeVariant(item.lead_type)}>
                          {LEAD_TYPE_LABELS[item.lead_type] ?? item.lead_type}
                        </Badge>
                        <Badge variant={stageVariant(item.current_stage)}>
                          {stageLabel(item.current_stage)}
                        </Badge>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-app-subtle">{formatShortDate(item.updated_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
