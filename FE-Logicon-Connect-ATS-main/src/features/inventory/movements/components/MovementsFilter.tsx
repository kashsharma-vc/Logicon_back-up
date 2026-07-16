import { useState, useEffect } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { listScopeNodes } from '@/api/access'
import { listSites } from '@/api/sites'

interface Props {
  filters: Record<string, any>
  onFilterChange: (filters: Record<string, any>) => void
}

export function MovementsFilter({ filters, onFilterChange }: Props) {
  const [scoops, setScoops] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])

  useEffect(() => {
    // In a real scenario, this would load from master data correctly.
    Promise.all([listScopeNodes(), listSites({})]).then(([bRes, sRes]) => {
      const bNodes = Array.isArray(bRes) ? bRes : (bRes as any).items || []
      setScoops(bNodes.filter((n: any) => n.node_type === 'region'))
      const sNodes = Array.isArray(sRes) ? sRes : (sRes as any).items || []
      setSites(sNodes)
    })
  }, [])

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <select 
          className="px-3 py-2 border border-app-border rounded-lg bg-app-surface text-sm focus:ring-2 focus:ring-brand-500/20"
          value={filters.movement_type || ''}
          onChange={(e) => onFilterChange({ ...filters, movement_type: e.target.value })}
        >
          <option value="">All Movement Types</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
          <option value="transfer">Transfer</option>
          <option value="issue">Issue</option>
          <option value="return">Return</option>
          <option value="adjustment">Adjustment</option>
          <option value="damage">Damage</option>
          <option value="disposal">Disposal</option>
          <option value="audit">Audit</option>
          <option value="purchase">Purchase</option>
        </select>

        <select 
          className="px-3 py-2 border border-app-border rounded-lg bg-app-surface text-sm focus:ring-2 focus:ring-brand-500/20 hidden md:block"
          value={filters.branch || ''}
          onChange={(e) => onFilterChange({ ...filters, branch: e.target.value })}
        >
          <option value="">All Scoops</option>
          {scoops.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 border border-app-border rounded-lg bg-app-surface text-sm focus:ring-2 focus:ring-brand-500/20 hidden lg:block"
          value={filters.site || ''}
          onChange={(e) => onFilterChange({ ...filters, site: e.target.value })}
        >
          <option value="">All Sites</option>
          {sites.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      
      <button className="btn-secondary px-3" title="Advanced Filters">
        <SlidersHorizontal className="w-4 h-4 mr-2" />
        Filters
      </button>
    </div>
  )
}
