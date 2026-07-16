import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, Search, Eye, Edit2, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { Project } from "../dashboardData"
import { cn } from "@/lib/cn"

const statusConfig = {
  active: { label: 'Active', className: 'bg-status-success/10 text-status-success border-status-success/20' },
  'on-hold': { label: 'On Hold', className: 'bg-status-warning/10 text-status-warning border-status-warning/20' },
  completed: { label: 'Completed', className: 'bg-brand-500/10 text-brand-500 border-brand-500/20' },
  'at-risk': { label: 'At Risk', className: 'bg-status-danger/10 text-status-danger border-status-danger/20' },
}

const riskConfig = {
  low: 'text-status-success',
  medium: 'text-status-warning',
  high: 'text-status-danger',
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-app-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", 
            value === 100 ? 'bg-status-success' : value >= 70 ? 'bg-brand-500' : value >= 40 ? 'bg-status-warning' : 'bg-status-danger'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-app-secondary w-8 text-right">{value}%</span>
    </div>
  )
}

interface ProjectTableProps {
  projects: Project[]
}

type SortKey = 'name' | 'client' | 'location' | 'status' | 'progress' | 'manager' | 'dueDate' | 'risk'

export function ProjectTable({ projects }: ProjectTableProps) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const PAGE_SIZE = 5

  const filtered = useMemo(() => {
    let data = projects.filter(p =>
      `${p.name} ${p.client} ${p.location} ${p.manager}`.toLowerCase().includes(search.toLowerCase())
    )
    if (statusFilter !== 'all') data = data.filter(p => p.status === statusFilter)
    data = [...data].sort((a, b) => {
      const va = a[sortKey] as any
      const vb = b[sortKey] as any
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [projects, search, sortKey, sortDir, statusFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 opacity-0 group-hover:opacity-40 transition-opacity"><ChevronUp className="w-3 h-3 inline" /></span>
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1 text-brand-500" /> : <ChevronDown className="w-3 h-3 inline ml-1 text-brand-500" />
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-panel overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-app-heading">Project Overview</h2>
          <p className="text-xs text-app-secondary mt-0.5">{filtered.length} projects total</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-subtle" />
            <input 
              type="text" placeholder="Search projects..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="pl-8 pr-3 py-1.5 text-xs border border-app-border rounded-lg bg-app-surface text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-44"
            />
          </div>
          <select 
            value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="text-xs px-3 py-1.5 border border-app-border rounded-lg bg-app-surface text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="at-risk">At Risk</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border bg-app-muted text-xs text-app-secondary uppercase tracking-wider">
              {(['name','client','location','status','progress','manager','dueDate','risk'] as SortKey[]).map(col => (
                <th key={col} className="px-4 py-3 text-left font-medium">
                  <button onClick={() => handleSort(col)} className="flex items-center hover:text-app-heading transition-colors group">
                    {col === 'dueDate' ? 'Due Date' : col.charAt(0).toUpperCase() + col.slice(1)}
                    <SortIcon col={col} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {paginated.map((p) => (
              <tr key={p.id} className="hover:bg-app-muted/60 transition-colors group">
                <td className="px-4 py-3.5 font-medium text-app-heading whitespace-nowrap">{p.name}</td>
                <td className="px-4 py-3.5 text-app-secondary whitespace-nowrap">{p.client}</td>
                <td className="px-4 py-3.5 text-app-secondary whitespace-nowrap">{p.location}</td>
                <td className="px-4 py-3.5">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", statusConfig[p.status].className)}>
                    {statusConfig[p.status].label}
                  </span>
                </td>
                <td className="px-4 py-3.5 w-36">
                  <ProgressBar value={p.progress} />
                </td>
                <td className="px-4 py-3.5 text-app-secondary whitespace-nowrap">{p.manager}</td>
                <td className="px-4 py-3.5 text-app-secondary whitespace-nowrap">{new Date(p.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-4 py-3.5">
                  <span className={cn("text-xs font-semibold capitalize", riskConfig[p.risk])}>{p.risk}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-app-subtle hover:text-brand-500 hover:bg-app-accent rounded-md transition-colors" title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-app-subtle hover:text-brand-500 hover:bg-app-accent rounded-md transition-colors" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                        className="p-1.5 text-app-subtle hover:text-brand-500 hover:bg-app-accent rounded-md transition-colors" title="More"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      {openMenu === p.id && (
                        <div className="absolute right-0 top-7 z-20 w-36 bg-app-surface border border-app-border rounded-lg shadow-lg py-1">
                          {['View Details','Edit','Duplicate','Archive','Delete'].map(opt => (
                            <button key={opt} onClick={() => setOpenMenu(null)} className={cn("w-full px-3 py-1.5 text-left text-xs hover:bg-app-muted transition-colors", opt === 'Delete' ? 'text-status-danger' : 'text-app-text')}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-app-secondary text-sm">No projects found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-app-border flex items-center justify-between">
          <p className="text-xs text-app-secondary">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 border border-app-border rounded-md text-app-secondary hover:bg-app-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)} className={cn("w-7 h-7 text-xs rounded-md border transition-colors", page === n ? 'bg-brand-500 border-brand-500 text-white' : 'border-app-border text-app-secondary hover:bg-app-muted')}>
                {n}
              </button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 border border-app-border rounded-md text-app-secondary hover:bg-app-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
