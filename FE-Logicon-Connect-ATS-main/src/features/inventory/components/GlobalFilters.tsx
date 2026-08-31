import { useState } from "react"
import { Search, X, Filter, RefreshCw } from "lucide-react"
import { cn } from "@/lib/cn"

interface GlobalFiltersProps {
  onFiltersChange?: (filters: Record<string, string>) => void
}

export function GlobalFilters({ onFiltersChange }: GlobalFiltersProps) {
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({
    project: '',
    site: '',
    dateRange: '',
    inspector: '',
    status: '',
    priority: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const activeCount = Object.values(filters).filter(v => v !== '').length

  function reset() {
    setSearch("")
    setFilters({ project: '', site: '', dateRange: '', inspector: '', status: '', priority: '' })
    onFiltersChange?.({})
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-panel p-4">
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
          <input
            type="text"
            placeholder="Search projects, sites, users, reports, tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-app-border rounded-lg bg-app-surface text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-subtle hover:text-app-text transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all",
            showFilters || activeCount > 0
              ? "border-brand-500 bg-brand-500/10 text-brand-500"
              : "border-app-border bg-app-surface text-app-text hover:bg-app-muted"
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className="bg-brand-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 border border-app-border rounded-lg text-sm text-app-secondary hover:bg-app-muted transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-app-border grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'project', label: 'Project', opts: ['City Center Tower', 'Airport Terminal B', 'Metro Bridge Ext.', 'Tech Park Phase 2'] },
            { key: 'site', label: 'Site', opts: ['Site A', 'Site B', 'Site C', 'Site D'] },
            { key: 'dateRange', label: 'Date Range', opts: ['Today', 'This Week', 'This Month', 'Last 3 Months'] },
            { key: 'inspector', label: 'Inspector', opts: ['Raj Sharma', 'Priya Patel', 'Amit Verma', 'Sara Gupta'] },
            { key: 'status', label: 'Status', opts: ['Active', 'On Hold', 'Completed', 'At Risk'] },
            { key: 'priority', label: 'Priority', opts: ['High', 'Medium', 'Low'] },
          ].map(({ key, label, opts }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-app-secondary">{label}</label>
              <select
                value={filters[key as keyof typeof filters]}
                onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-2.5 py-1.5 border border-app-border rounded-lg bg-app-surface text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                <option value="">All {label}s</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="lg:col-span-6 flex justify-end gap-2 pt-1">
            <button onClick={reset} className="px-4 py-1.5 text-xs text-app-secondary border border-app-border rounded-lg hover:bg-app-muted transition-all">
              Reset All
            </button>
            <button className="px-4 py-1.5 text-xs text-white bg-[var(--color-btn-primary)] hover:bg-[var(--color-btn-primary-hover)] rounded-lg transition-all font-medium">
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
