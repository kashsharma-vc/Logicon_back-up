import { useState, useEffect } from 'react'
import { Search, MapPin, Loader2, Filter, MoreHorizontal, User, Eye, X } from 'lucide-react'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { listClients, type ClientRow } from '@/api/clients'

export function SiteList() {
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [clients, setClients] = useState<Record<number, ClientRow>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSite, setSelectedSite] = useState<SiteProfileRow | null>(null)

  useEffect(() => {
    Promise.all([
      listSites({}),
      listClients({})
    ]).then(([sitesRes, clientsRes]) => {
      setSites(sitesRes.items || (sitesRes as any))
      
      const clientMap: Record<number, ClientRow> = {}
      ;(clientsRes.items || (clientsRes as any)).forEach((c: ClientRow) => {
        clientMap[c.id] = c
      })
      setClients(clientMap)
    }).catch(err => console.error(err))
    .finally(() => setLoading(false))
  }, [])

  const filtered = sites.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-app-heading flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-500" />
          Construction Sites
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
            <input 
              type="text" 
              placeholder="Search sites..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-app-surface border border-app-border rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <button className="p-2 border border-app-border rounded-lg hover:bg-app-surface text-app-secondary">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-app-subtle">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading sites...</p>
        </div>
      ) : (
        <div className="border border-app-border rounded-xl overflow-hidden bg-app-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-app-surface-alt border-b border-app-border text-xs uppercase text-app-secondary font-semibold">
                <tr>
                  <th className="px-4 py-3">Site Details</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Operations Manager</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filtered.map(site => {
                  const client = clients[site.client]
                  return (
                    <tr key={site.id} className="hover:bg-app-surface-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-app-heading">{site.name}</div>
                        <div className="text-xs text-app-secondary font-mono">{site.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-app-text">{client?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center">
                            <User className="w-3 h-3 text-brand-600" />
                          </div>
                          <span className="text-app-text">{client?.contact_name || site.contact_person || 'Not Assigned'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-app-secondary">
                        {site.city}{site.state ? `, ${site.state}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${site.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {site.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setSelectedSite(site)} className="p-2 hover:bg-app-border rounded-full text-brand-600 transition-colors tooltip-trigger" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-app-subtle">
                      No sites found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedSite && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-app-surface w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-app-border">
              <div>
                <h2 className="text-xl font-bold text-app-heading">{selectedSite.name}</h2>
                <p className="text-sm text-app-secondary font-mono">{selectedSite.code}</p>
              </div>
              <button onClick={() => setSelectedSite(null)} className="p-2 hover:bg-app-surface-hover rounded-full transition-colors text-app-subtle">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-app-secondary mb-1">Client</span>
                  <div className="font-medium text-app-heading">{clients[selectedSite.client]?.name || 'Unknown'}</div>
                </div>
                <div>
                  <span className="block text-xs text-app-secondary mb-1">Status</span>
                  <div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedSite.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selectedSite.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <span className="block text-xs text-app-secondary mb-1">Address</span>
                <div className="font-medium text-app-heading">{selectedSite.address}</div>
                <div className="text-app-text mt-0.5">{selectedSite.city}, {selectedSite.state} - {selectedSite.pincode}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-app-secondary mb-1">Contact Person</span>
                  <div className="font-medium text-app-heading">{selectedSite.contact_person || clients[selectedSite.client]?.contact_name || 'N/A'}</div>
                </div>
                <div>
                  <span className="block text-xs text-app-secondary mb-1">Contact Email</span>
                  <div className="font-medium text-app-heading">{selectedSite.contact_email || clients[selectedSite.client]?.contact_email || 'N/A'}</div>
                </div>
                <div>
                  <span className="block text-xs text-app-secondary mb-1">Contact Phone</span>
                  <div className="font-medium text-app-heading">{selectedSite.contact_phone || clients[selectedSite.client]?.contact_phone || 'N/A'}</div>
                </div>
                <div>
                  <span className="block text-xs text-app-secondary mb-1">Geofence Radius</span>
                  <div className="font-medium text-app-heading">{selectedSite.geofence_radius_meters}m</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
