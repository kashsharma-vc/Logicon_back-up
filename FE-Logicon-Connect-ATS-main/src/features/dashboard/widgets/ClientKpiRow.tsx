import { Link } from 'react-router-dom'
import { Banknote, Building2, ClipboardCheck, FileText, MapPin, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatCount, formatMoney } from '@/features/dashboard/dashboardFormatters'

interface ClientKpiRowProps {
  activeSites: number
  approvedBudgets: number
  availableBudget: string
  mrfsInApproval: number
  candidateReviewsPending: number | null
  deployedEmployees: number | null
}

interface KpiTile {
  label: string
  value: string
  icon: LucideIcon
  to: string
}

function KpiCard({ tile }: { tile: KpiTile }) {
  const { label, value, icon: Icon, to } = tile
  return (
    <Link
      to={to}
      className={cn(
        'flex items-start justify-between gap-2 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm transition-all',
        'hover:border-brand-500 hover:shadow-md',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-xl font-bold tabular-nums text-app-text">{value}</p>
        <p className="mt-1 text-xs text-app-subtle">{label}</p>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
        <Icon className="h-4 w-4" />
      </div>
    </Link>
  )
}

/** Compact KPI tiles for the client dashboard. Counts may be null while loading/failed -> shown as "—". */
export function ClientKpiRow({
  activeSites,
  approvedBudgets,
  availableBudget,
  mrfsInApproval,
  candidateReviewsPending,
  deployedEmployees,
}: ClientKpiRowProps) {
  const tiles: KpiTile[] = [
    { label: 'Active sites', value: formatCount(activeSites), icon: MapPin, to: '/sites' },
    { label: 'Approved budgets', value: formatCount(approvedBudgets), icon: Building2, to: '/budgets' },
    { label: 'Available budget', value: formatMoney(availableBudget), icon: Banknote, to: '/budgets' },
    { label: 'MRFs in approval', value: formatCount(mrfsInApproval), icon: FileText, to: '/mrf' },
    {
      label: 'Candidate reviews pending',
      value: candidateReviewsPending == null ? '—' : formatCount(candidateReviewsPending),
      icon: ClipboardCheck,
      to: '/hiring/client-review',
    },
    {
      label: 'Deployed employees',
      value: deployedEmployees == null ? '—' : formatCount(deployedEmployees),
      icon: Users,
      to: '/deployment/client-employees',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <KpiCard key={tile.label} tile={tile} />
      ))}
    </div>
  )
}
