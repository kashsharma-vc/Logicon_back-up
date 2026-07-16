import { useState, useEffect } from 'react'
import { Search, Building2, MapPin, Loader2, ArrowRight, X } from 'lucide-react'
import { listScopeNodes, type ScopeNode } from '@/api/access'

export function BranchList() {
  const [scoops, setScoops] = useState<ScopeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedScoop, setSelectedScoop] = useState<ScopeNode | null>(null)

  useEffect(() => {
    // Treat 'region' node_types as Scoops based on implementation plan feedback
    listScopeNodes()
      .then(res => {
        const nodes = Array.isArray(res) ? res : (res as any).items || []
        setScoops(nodes.filter((n: any) => n.node_type === 'region'))
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = scoops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-app-heading flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-500" />
          Active Scoops
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
          <input 
            type="text" 
            placeholder="Search scoops..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-app-surface border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-app-subtle">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading scoops...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(scoop => (
            <div key={scoop.id} onClick={() => setSelectedScoop(scoop)} className="group p-4 bg-app-surface border border-app-border rounded-xl shadow-sm hover:shadow-md hover:border-brand-500/30 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-app-heading group-hover:text-brand-600 transition-colors">{scoop.name}</h3>
                    <p className="text-xs text-app-secondary font-mono">{scoop.code}</p>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-app-border flex items-center justify-between text-sm">
                <span className="text-app-secondary flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Multiple Sites</span>
                <span className="text-brand-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-app-subtle">
              No scoops found matching your search.
            </div>
          )}
        </div>
      )}

      {selectedScoop && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-app-surface w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-app-border">
              <div>
                <h2 className="text-xl font-bold text-app-heading">{selectedScoop.name}</h2>
                <p className="text-sm text-app-secondary font-mono">{selectedScoop.code}</p>
              </div>
              <button onClick={() => setSelectedScoop(null)} className="p-2 hover:bg-app-surface-hover rounded-full transition-colors text-app-subtle">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-app-secondary mb-1">Status</span>
                  <div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedScoop.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selectedScoop.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="block text-xs text-app-secondary mb-1">Hierarchy Path</span>
                  <div className="font-mono text-xs text-app-heading mt-1 bg-app-surface-alt p-1.5 rounded border border-app-border">{selectedScoop.path || selectedScoop.code}</div>
                </div>
              </div>
              <div>
                <span className="block text-xs text-app-secondary mb-1">Node Type</span>
                <div className="font-medium text-app-heading capitalize">{selectedScoop.node_type}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
