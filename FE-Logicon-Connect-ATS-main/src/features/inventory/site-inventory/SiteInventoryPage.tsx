import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { SiteInventoryFilters } from './components/SiteInventoryFilters'
import { SiteCard } from './components/SiteCard'
import { SiteInventoryDetailsDrawer } from './components/SiteInventoryDetailsDrawer'
import { listSites, type SiteProfileRow } from '@/api/sites'

export function SiteInventoryPage() {
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selectedSite, setSelectedSite] = useState<SiteProfileRow | null>(null)

  useEffect(() => {
    const fetchSites = async () => {
      setLoading(true)
      try {
        const data = await listSites({
          search,
          ...filters
        })
        setSites(Array.isArray(data) ? data : (data as any).items || [])
      } catch (error) {
        console.error('Failed to fetch sites', error)
      } finally {
        setLoading(false)
      }
    }
    
    const timer = setTimeout(() => {
      fetchSites()
    }, 500)

    return () => clearTimeout(timer)
  }, [search, filters])

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-heading tracking-tight">Site Inventory</h1>
          <p className="text-sm text-app-secondary mt-0.5">Manage and monitor inventory distributed across all construction sites.</p>
        </div>
      </div>

      <div className="bg-app-surface rounded-xl border border-app-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
            <input 
              type="text" 
              placeholder="Search by Site Name, Code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-app-border rounded-lg bg-app-surface focus:ring-2 focus:ring-brand-500/20 text-sm"
            />
          </div>
          <SiteInventoryFilters filters={filters} onFilterChange={setFilters} />
        </div>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-app-subtle">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading site inventory...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-app-subtle bg-app-surface border border-app-border rounded-xl shadow-sm">
            <h3 className="text-lg font-medium text-app-heading mb-2">No sites found</h3>
            <p className="text-sm text-center max-w-md">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sites.map(site => (
              <SiteCard 
                key={site.id} 
                site={site} 
                onSelect={() => setSelectedSite(site)} 
              />
            ))}
          </div>
        )}
      </div>

      {selectedSite && (
        <SiteInventoryDetailsDrawer 
          site={selectedSite} 
          onClose={() => setSelectedSite(null)} 
        />
      )}
    </div>
  )
}
