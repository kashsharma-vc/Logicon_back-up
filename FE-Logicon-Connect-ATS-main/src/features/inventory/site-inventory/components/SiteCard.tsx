import { MapPin, Users, Package, Clock, AlertTriangle, FileText, ArrowRight } from 'lucide-react'
import { type SiteProfileRow } from '@/api/sites'

interface Props {
  site: SiteProfileRow
  onSelect: () => void
}

export function SiteCard({ site, onSelect }: Props) {
  // Stats would normally come from an API. We'll show empty states/loaders if missing.
  // We'll mock them as 0 for now until backend support is added for these stats.
  const stats = {
    employees: 0,
    totalValue: 0,
    available: 0,
    lowStock: 0,
    pendingRequests: 0,
    lastSync: site.updated_at
  }

  return (
    <div 
      className="group bg-app-surface border border-app-border rounded-xl shadow-sm hover:shadow-md hover:border-brand-500/30 transition-all flex flex-col cursor-pointer"
      onClick={onSelect}
    >
      {/* Header */}
      <div className="p-4 border-b border-app-border">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-app-heading group-hover:text-brand-600 transition-colors line-clamp-1">{site.name}</h3>
              <p className="text-xs text-app-secondary font-mono mt-0.5">{site.code}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${site.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {site.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
          <div>
            <span className="block text-app-subtle mb-0.5">Project</span>
            <span className="font-medium text-app-heading line-clamp-1">N/A</span>
          </div>
          <div>
            <span className="block text-app-subtle mb-0.5">Client ID</span>
            <span className="font-medium text-app-heading line-clamp-1">{site.client || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Managers */}
      <div className="px-4 py-3 bg-app-surface-alt/50 border-b border-app-border text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="block text-app-subtle mb-0.5">Ops Mgr</span>
            <span className="font-medium text-app-heading truncate block">{site.contact_person || 'N/A'}</span>
          </div>
          <div>
            <span className="block text-app-subtle mb-0.5">Proj Mgr</span>
            <span className="font-medium text-app-heading truncate block">N/A</span>
          </div>
          <div>
            <span className="block text-app-subtle mb-0.5">Site Mgr</span>
            <span className="font-medium text-app-heading truncate block">N/A</span>
          </div>
        </div>
      </div>

      {/* Inventory Stats */}
      <div className="p-4 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-app-secondary" />
            <div>
              <div className="text-lg font-bold text-app-heading">{stats.employees}</div>
              <div className="text-xs text-app-subtle">Employees</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-app-secondary" />
            <div>
              <div className="text-lg font-bold text-app-heading">{stats.available}</div>
              <div className="text-xs text-app-subtle">Items Available</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${stats.lowStock > 0 ? 'text-amber-500' : 'text-app-secondary'}`} />
            <div>
              <div className={`text-lg font-bold ${stats.lowStock > 0 ? 'text-amber-600' : 'text-app-heading'}`}>{stats.lowStock}</div>
              <div className="text-xs text-app-subtle">Low Stock</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-app-secondary" />
            <div>
              <div className="text-lg font-bold text-app-heading">{stats.pendingRequests}</div>
              <div className="text-xs text-app-subtle">Pending Req.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-app-border flex items-center justify-between text-xs bg-app-surface-alt rounded-b-xl">
        <div className="flex items-center gap-1.5 text-app-subtle">
          <Clock className="w-3.5 h-3.5" />
          <span>Last sync: {new Date(stats.lastSync).toLocaleDateString()}</span>
        </div>
        <div className="font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          View Details <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  )
}
