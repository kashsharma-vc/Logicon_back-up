import { useState, useEffect } from 'react'
import { inventoryApi, type StockMovementStats } from '../../inventoryApi'
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, UserCheck, UserMinus, AlertTriangle, PackageX, RefreshCw } from 'lucide-react'

interface Props {
  refreshKey: number
}

export function MovementKPIs({ refreshKey }: Props) {
  const [stats, setStats] = useState<StockMovementStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const data = await inventoryApi.getMovementStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch movement stats', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [refreshKey])

  const cards = [
    { title: 'Total Today', value: stats?.total_movements_today ?? 0, icon: RefreshCw, color: 'text-brand-600', bg: 'bg-brand-50' },
    { title: 'Incoming', value: stats?.incoming_stock ?? 0, icon: ArrowDownRight, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Outgoing', value: stats?.outgoing_stock ?? 0, icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Transfers', value: stats?.internal_transfers ?? 0, icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Issues', value: stats?.employee_issues ?? 0, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Returns', value: stats?.employee_returns ?? 0, icon: UserMinus, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Damages', value: stats?.damaged_items ?? 0, icon: PackageX, color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'Audits', value: stats?.audit_differences ?? 0, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-app-surface border border-app-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-app-secondary truncate pr-2">{card.title}</span>
            <div className={`p-1.5 rounded-lg ${card.bg}`}>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
          </div>
          {loading ? (
            <div className="h-6 w-16 bg-app-border/50 animate-pulse rounded"></div>
          ) : (
            <div className="text-xl font-bold text-app-heading">{card.value}</div>
          )}
        </div>
      ))}
    </div>
  )
}
