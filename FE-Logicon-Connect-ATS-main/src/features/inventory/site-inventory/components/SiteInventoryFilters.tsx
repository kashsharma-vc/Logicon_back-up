import { useState, useEffect } from 'react'
import { Filter, SlidersHorizontal, Loader2 } from 'lucide-react'
import { listScopeNodes } from '@/api/access'
import { listSites } from '@/api/sites'
import { listClients } from '@/api/clients'
import { listDepartments } from '@/api/departments'
import { listJobRoles } from '@/api/jobs'

interface Props {
  filters: Record<string, any>
  onFilterChange: (filters: Record<string, any>) => void
}

export function SiteInventoryFilters({ filters, onFilterChange }: Props) {
  const [scoops, setScoops] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      listScopeNodes(),
      listClients({}),
      listDepartments()
    ]).then(([scoopsRes, clientsRes, deptsRes]) => {
      const sNodes = Array.isArray(scoopsRes) ? scoopsRes : (scoopsRes as any).items || []
      setScoops(sNodes.filter((n: any) => n.node_type === 'region'))
      
      const cList = Array.isArray(clientsRes) ? clientsRes : (clientsRes as any).items || []
      setClients(cList)
      
      const dList = Array.isArray(deptsRes) ? deptsRes : (deptsRes as any).items || []
      setDepartments(dList)
    }).finally(() => setLoading(false))
  }, [])

  // Cascade from department to role
  useEffect(() => {
    if (filters.department) {
      listJobRoles().then(res => {
        const rList = Array.isArray(res) ? res : (res as any).items || []
        setRoles(rList)
      })
    } else {
      setRoles([])
    }
  }, [filters.department])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <select 
          className="px-3 py-2 border border-app-border rounded-lg bg-app-surface text-sm focus:ring-2 focus:ring-brand-500/20"
          value={filters.scoop || ''}
          onChange={(e) => onFilterChange({ ...filters, scoop: e.target.value })}
        >
          <option value="">All Scoops</option>
          {scoops.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 border border-app-border rounded-lg bg-app-surface text-sm focus:ring-2 focus:ring-brand-500/20 hidden md:block"
          value={filters.client || ''}
          onChange={(e) => onFilterChange({ ...filters, client: e.target.value })}
        >
          <option value="">All Clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 border border-app-border rounded-lg bg-app-surface text-sm focus:ring-2 focus:ring-brand-500/20 hidden lg:block"
          value={filters.department || ''}
          onChange={(e) => onFilterChange({ ...filters, department: e.target.value, role: '' })}
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        
        {filters.department && (
          <select 
            className="px-3 py-2 border border-app-border rounded-lg bg-app-surface text-sm focus:ring-2 focus:ring-brand-500/20 hidden lg:block"
            value={filters.role || ''}
            onChange={(e) => onFilterChange({ ...filters, role: e.target.value })}
          >
            <option value="">All Roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        )}
      </div>
      
      <button className="btn-secondary px-3" title="Advanced Filters">
        <SlidersHorizontal className="w-4 h-4 mr-2" />
        Advanced Filters
      </button>
    </div>
  )
}
