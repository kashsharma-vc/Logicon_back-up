import { X, MapPin, Package, Users, FileText, ArrowRight, Activity, Clock } from 'lucide-react'
import { type SiteProfileRow } from '@/api/sites'

interface Props {
  site: SiteProfileRow
  onClose: () => void
}

export function SiteInventoryDetailsDrawer({ site, onClose }: Props) {
  // In a real implementation, we would fetch detailed inventory metrics,
  // list of employees at the site, and recent requests here.
  
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-app-surface shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-app-border">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-app-border bg-app-surface-alt/50">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600 shrink-0 mt-1">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-app-heading">{site.name}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-sm">
                <span className="font-mono text-app-secondary">{site.code}</span>
                <span className="w-1 h-1 rounded-full bg-app-border" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${site.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {site.is_active ? 'Active Site' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-app-border rounded-full text-app-subtle transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Quick Actions */}
          <div className="flex gap-3">
            <button className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
              <Package className="w-4 h-4" /> View Inventory
            </button>
            <button className="flex-1 py-2.5 bg-app-surface border border-app-border hover:bg-app-surface-hover text-app-heading font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
              <Activity className="w-4 h-4" /> View Transfers
            </button>
            <button className="flex-1 py-2.5 bg-app-surface border border-app-border hover:bg-app-surface-hover text-app-heading font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
              <Users className="w-4 h-4" /> View Employees
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2 border-b border-app-border pb-2">
                <FileText className="w-4 h-4 text-app-secondary" /> Hierarchy
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="block text-xs text-app-subtle mb-1">Client ID</span>
                  <div className="font-medium text-app-heading">{site.client || 'N/A'}</div>
                </div>
                <div>
                  <span className="block text-xs text-app-subtle mb-1">Project</span>
                  <div className="font-medium text-app-heading">N/A</div>
                </div>
                <div>
                  <span className="block text-xs text-app-subtle mb-1">Scoop ID</span>
                  <div className="font-medium text-app-heading">{site.scope_node || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2 border-b border-app-border pb-2">
                <Users className="w-4 h-4 text-app-secondary" /> Management
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="block text-xs text-app-subtle mb-1">Operations Manager</span>
                  <div className="font-medium text-app-heading">{site.contact_person || 'N/A'}</div>
                </div>
                <div>
                  <span className="block text-xs text-app-subtle mb-1">Project Manager</span>
                  <div className="font-medium text-app-heading">N/A</div>
                </div>
                <div>
                  <span className="block text-xs text-app-subtle mb-1">Site Manager</span>
                  <div className="font-medium text-app-heading">N/A</div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Requests Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2">
                <Clock className="w-4 h-4 text-app-secondary" /> Recent Requests
              </h3>
              <button className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="bg-app-surface-alt rounded-xl border border-app-border p-8 text-center text-app-secondary text-sm">
              <Clock className="w-8 h-8 mx-auto mb-3 text-app-subtle" />
              <p className="font-medium text-app-heading">No recent requests</p>
              <p className="mt-1">Inventory requests from this site will appear here.</p>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
