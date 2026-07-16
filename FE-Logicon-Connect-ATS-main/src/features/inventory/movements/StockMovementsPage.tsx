import { useState, useEffect } from 'react'
import { MovementKPIs } from './components/MovementKPIs'
import { MovementsFilter } from './components/MovementsFilter'
import { MovementsTable } from './components/MovementsTable'
import { MovementDetailsDrawer } from './components/MovementDetailsDrawer'
import { inventoryApi, type StockMovement } from '../inventoryApi'
import { Package, Search, Download, Printer, RefreshCw } from 'lucide-react'

export function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const fetchMovements = async () => {
      setLoading(true)
      try {
        const data = await inventoryApi.getMovements({ ...filters, search })
        setMovements(data)
      } catch (error) {
        console.error('Failed to fetch movements', error)
      } finally {
        setLoading(false)
      }
    }
    
    // Debounce search
    const timer = setTimeout(() => {
      fetchMovements()
    }, 500)

    return () => clearTimeout(timer)
  }, [search, filters, refreshKey])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-heading">Stock Movements</h1>
          <p className="text-sm text-app-secondary mt-1">
            Track every inventory transaction across scoops, construction sites, and employees.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setRefreshKey(prev => prev + 1)} className="btn-secondary px-3" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="btn-secondary px-3" title="Export Excel">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </button>
          <button className="btn-secondary px-3" title="Export CSV">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
          <button className="btn-secondary px-3" title="Export PDF">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </button>
          <button className="btn-secondary px-3" title="Print Report">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      <MovementKPIs refreshKey={refreshKey} />

      <div className="bg-app-surface rounded-xl border border-app-border shadow-sm overflow-hidden flex flex-col">
        {/* Search & Filters */}
        <div className="p-4 border-b border-app-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-app-surface-alt/30">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
            <input 
              type="text" 
              placeholder="Search by Item, Reference, Asset ID, Module..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-app-border rounded-lg bg-app-surface focus:ring-2 focus:ring-brand-500/20 text-sm"
            />
          </div>
          <MovementsFilter filters={filters} onFilterChange={setFilters} />
        </div>

        {/* Table / Empty State */}
        <div className="flex-1 overflow-auto min-h-[400px]">
          {loading ? (
            <div className="p-8 flex justify-center text-app-subtle">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : movements.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-app-surface-hover flex items-center justify-center text-app-secondary mb-4">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-app-heading mb-2">No stock movements found.</h3>
              <p className="text-app-secondary max-w-md">
                Stock movements will automatically appear here whenever inventory transactions occur in the system.
              </p>
            </div>
          ) : (
            <MovementsTable movements={movements} onRowClick={setSelectedMovement} />
          )}
        </div>
      </div>

      {selectedMovement && (
        <MovementDetailsDrawer 
          movement={selectedMovement} 
          onClose={() => setSelectedMovement(null)} 
        />
      )}
    </div>
  )
}
