import { useEffect, useState, useMemo, useCallback } from 'react'
import { 
  Plus, Search, Download, Upload, RefreshCw,
  AlertTriangle, XCircle, Clock, Package, Edit2,
  Eye, MoreHorizontal, CheckCircle2, ChevronDown, ChevronUp,
  Loader2, TrendingDown, TrendingUp, IndianRupee, Shield, Shirt
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { inventoryApi, InventoryItem, DashboardStats, InventoryWarnings } from './inventoryApi'
import { AddItemWizard } from './components/AddItemWizard'
import { AddUniformWizard } from './components/AddUniformWizard'
import { ItemDetailsDrawer } from './components/ItemDetailsDrawer'
import type { InventoryCategory, Warehouse } from './inventoryApi'
import { CATEGORY_TYPE_OPTIONS } from './categoryFieldConfig'
import { listScopeNodes } from '@/api/access'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-status-success/10 text-status-success border-status-success/20' },
  assigned: { label: 'Assigned', className: 'bg-brand-500/10 text-brand-500 border-brand-500/20' },
  maintenance: { label: 'Maintenance', className: 'bg-status-warning/10 text-status-warning border-status-warning/20' },
  disposed: { label: 'Disposed', className: 'bg-app-muted text-app-secondary border-app-border' },
  lost: { label: 'Lost', className: 'bg-status-danger/10 text-status-danger border-status-danger/20' },
  archived: { label: 'Archived', className: 'bg-app-muted text-app-subtle border-app-border' },
}

const STOCK_STATUS_BADGE: Record<string, { icon: typeof Package; color: string }> = {
  in_stock: { icon: CheckCircle2, color: 'text-status-success' },
  low_stock: { icon: AlertTriangle, color: 'text-status-warning' },
  out_of_stock: { icon: XCircle, color: 'text-status-danger' },
}

import { 
  ShieldCheck, Laptop, Smartphone, Settings, Wrench, Monitor, 
  Armchair, Zap, Droplets, HardHat, Car, PenTool
} from 'lucide-react'

const CATEGORY_COLOR: Record<string, string> = {
  ppe: 'bg-status-danger/10 text-status-danger',
  it_asset: 'bg-brand-500/10 text-brand-500',
  machinery: 'bg-status-warning/10 text-status-warning',
  tools: 'bg-status-info/10 text-status-info',
  office_asset: 'bg-status-success/10 text-status-success',
  furniture: 'bg-status-hired/10 text-status-hired',
  electrical: 'bg-yellow-500/10 text-yellow-600',
  plumbing: 'bg-cyan-500/10 text-cyan-600',
  construction: 'bg-orange-500/10 text-orange-600',
  vehicle: 'bg-indigo-500/10 text-indigo-600',
  uniform: 'bg-status-attention/10 text-status-attention',
  stationery: 'bg-pink-500/10 text-pink-600',
  other: 'bg-app-muted text-app-secondary',
}

const getCategoryIcon = (type: string) => {
  switch (type) {
    case 'ppe': return ShieldCheck
    case 'ppe_shoes': return ShieldCheck
    case 'it_asset': return Laptop
    case 'it_mobile': return Smartphone
    case 'machinery': return Settings
    case 'tools': return Wrench
    case 'office_asset': return Monitor
    case 'furniture': return Armchair
    case 'electrical': return Zap
    case 'plumbing': return Droplets
    case 'construction': return HardHat
    case 'vehicle': return Car
    case 'uniform': return Shirt
    case 'stationery': return PenTool
    default: return Package
  }
}

function SmartWarningBanner({ warnings }: { warnings: InventoryWarnings | null }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!warnings) return null
  const lowStock = warnings.low_stock ?? []
  const outOfStock = warnings.out_of_stock ?? []
  const warrantyExpiring = warnings.warranty_expiring ?? []

  const total = lowStock.length + outOfStock.length + warrantyExpiring.length
  if (total === 0) return null

  return (
    <div className="border border-status-warning/30 bg-status-warning/5 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-status-warning" />
          <span className="text-sm font-semibold text-status-warning">
            {[
              outOfStock.length > 0 && `${outOfStock.length} out-of-stock`,
              lowStock.length > 0 && `${lowStock.length} low-stock`,
              warrantyExpiring.length > 0 && `${warrantyExpiring.length} warranty expiring soon`,
            ].filter(Boolean).join(', ')} — action required
          </span>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-app-subtle" /> : <ChevronUp className="w-4 h-4 text-app-subtle" />}
      </div>
      {!collapsed && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {outOfStock.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-status-danger flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Out of Stock</p>
              {outOfStock.map(i => <p key={i.id} className="text-xs text-app-text bg-status-danger/10 rounded px-2 py-1">{i.code} — {i.name}</p>)}
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-status-warning flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Low Stock</p>
              {lowStock.map(i => <p key={i.id} className="text-xs text-app-text bg-status-warning/10 rounded px-2 py-1">{i.code} — {i.name} ({i.stock}/{i.reorder_level})</p>)}
            </div>
          )}
          {warrantyExpiring.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-status-info flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Warranty Expiring</p>
              {warrantyExpiring.map(i => <p key={i.id} className="text-xs text-app-text bg-status-info/10 rounded px-2 py-1">{i.code} — expires {new Date(i.warranty_expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KPIBar({ stats }: { stats: DashboardStats | null }) {
  const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
  const kpis = [
    { label: 'Total Items', value: stats?.total_items ?? 0, icon: Package, color: 'text-brand-500' },
    { label: 'Total Value', value: stats ? fmt(stats.total_value) : '₹0', icon: IndianRupee, color: 'text-status-success' },
    { label: 'Assigned', value: stats?.assigned ?? 0, icon: CheckCircle2, color: 'text-brand-500' },
    { label: 'Low Stock', value: stats?.low_stock ?? 0, icon: TrendingDown, color: 'text-status-warning' },
    { label: 'Out of Stock', value: stats?.out_of_stock ?? 0, icon: XCircle, color: 'text-status-danger' },
    { label: 'Maintenance', value: stats?.maintenance ?? 0, icon: Shield, color: 'text-status-info' },
    { label: 'Warranty Soon', value: stats?.warranty_expiring ?? 0, icon: AlertTriangle, color: 'text-status-warning' },
    { label: 'Categories', value: stats?.total_categories ?? 0, icon: TrendingUp, color: 'text-status-attention' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpis.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-app-surface border border-app-border rounded-xl p-3 shadow-panel hover:shadow-md transition-all cursor-default">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Icon className={cn("w-3.5 h-3.5", color)} />
            <span className="text-[10px] font-medium text-app-secondary uppercase tracking-wider">{label}</span>
          </div>
          <p className={cn("text-lg font-bold tracking-tight", color)}>{value}</p>
        </div>
      ))}
    </div>
  )
}

export function InventoryItemsPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [warnings, setWarnings] = useState<InventoryWarnings | null>(null)
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [showUniformWizard, setShowUniformWizard] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategoryType, setFilterCategoryType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterCategoryType) params.category_type = filterCategoryType
      if (filterStatus) params.item_status = filterStatus
      if (search) params.search = search
      const [itemsData, statsData, warningsData, catsData, warehousesData, settingsData] = await Promise.all([
        inventoryApi.getItems(params),
        inventoryApi.getDashboardStats(),
        inventoryApi.getWarnings(),
        inventoryApi.getCategories(),
        listScopeNodes(),
        inventoryApi.getSettings(),
      ])
      setItems(itemsData)
      setStats(statsData)
      setWarnings(warningsData)
      setCategories(catsData)
      const scoops = Array.isArray(warehousesData) ? warehousesData : (warehousesData as any).items || []
      setWarehouses(scoops.filter((n: any) => n.node_type === 'region') as unknown as Warehouse[])
      setSettings(Array.isArray(settingsData) ? settingsData[0] : settingsData)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [search, filterCategoryType, filterStatus])

  useEffect(() => { loadData() }, [loadData])

  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    const va = (a as any)[sortKey] ?? ''
    const vb = (b as any)[sortKey] ?? ''
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  }), [items, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item permanently?')) return
    try { await inventoryApi.deleteItem(id); loadData() } catch { alert('Delete failed') }
  }

  const SortIcon = ({ col }: { col: string }) =>
    sortKey === col
      ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-brand-500 inline ml-1" /> : <ChevronDown className="w-3 h-3 text-brand-500 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-app-subtle inline ml-1 opacity-0 group-hover:opacity-60 transition-opacity" />

  const fmtCurrency = (v: number | string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-heading tracking-tight">Inventory Items</h1>
          <p className="text-sm text-app-secondary mt-0.5">Enterprise inventory — {stats?.total_items ?? 0} items tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 border border-app-border bg-app-surface rounded-lg text-app-secondary hover:bg-app-muted shadow-panel transition-all" title="Refresh">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-app-border bg-app-surface text-sm font-medium rounded-lg hover:bg-app-muted shadow-panel transition-all text-app-text">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button className="flex items-center gap-2 px-3 py-2 border border-app-border bg-app-surface text-sm font-medium rounded-lg hover:bg-app-muted shadow-panel transition-all text-app-text">
            <Download className="w-4 h-4" /> Export
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowUniformWizard(true)} className="flex items-center gap-1.5 px-3 py-2 bg-app-surface border border-app-border text-brand-500 text-sm font-medium rounded-lg shadow-panel hover:bg-brand-500/10 transition-all">
              <Shirt className="w-4 h-4" /> Uniform Kit
            </button>
            <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-btn-primary)] hover:bg-[var(--color-btn-primary-hover)] text-white text-sm font-medium rounded-lg shadow-panel transition-all">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>
      </div>

      <KPIBar stats={stats} />
      <SmartWarningBanner warnings={warnings} />

      <div className="bg-app-surface border border-app-border rounded-xl shadow-panel overflow-hidden">
        <div className="p-4 border-b border-app-border flex flex-col md:flex-row md:items-center gap-3 bg-app-muted/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtle" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code, serial, asset tag..."
              className="w-full pl-9 pr-4 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterCategoryType} onChange={e => setFilterCategoryType(e.target.value)}
              className="px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">All Categories</option>
              {CATEGORY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">All Status</option>
              {Object.entries(STATUS_BADGE).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </select>
            {(filterCategoryType || filterStatus || search) && (
              <button onClick={() => { setSearch(''); setFilterCategoryType(''); setFilterStatus('') }} className="p-2 text-app-subtle hover:text-status-danger transition-colors" title="Clear filters">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-brand-500 font-medium">{selected.size} selected</span>
              <button className="px-3 py-1.5 text-xs text-status-danger border border-status-danger/30 rounded-lg hover:bg-status-danger/10 transition-all">Delete</button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-app-border bg-app-muted/50 text-xs text-app-secondary uppercase tracking-wider">
              <tr>
                <th className="pl-4 py-3 w-10">
                  <input type="checkbox" className="rounded border-app-border" onChange={e => setSelected(e.target.checked ? new Set(items.map(i => i.id)) : new Set())} />
                </th>
                {[
                  { key: 'code', label: 'Code' },
                  { key: 'name', label: 'Item' },
                  { key: 'category_type', label: 'Category' },
                  { key: 'item_status', label: 'Status' },
                  { key: 'stock', label: 'Stock' },
                  { key: 'unit_price', label: 'Price' },
                  { key: 'assigned_to_name', label: 'Assigned To' },
                  { key: 'warranty_expiry', label: 'Warranty' },
                ].map(col => (
                  <th key={col.key} className="px-3 py-3 text-left font-medium cursor-pointer group" onClick={() => handleSort(col.key)}>
                    {col.label}<SortIcon col={col.key} />
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                <tr><td colSpan={10} className="py-20 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto mb-2" />
                  <p className="text-sm text-app-secondary">Loading inventory items...</p>
                </td></tr>
              ) : sortedItems.length === 0 ? (
                <tr><td colSpan={10} className="py-20 text-center">
                  <Package className="w-10 h-10 text-app-subtle mx-auto mb-3" />
                  <p className="text-base font-semibold text-app-heading">No items found</p>
                  <p className="text-sm text-app-secondary mt-1">Add your first inventory item to get started.</p>
                  <button onClick={() => setShowWizard(true)} className="mt-4 px-4 py-2 bg-[var(--color-btn-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-btn-primary-hover)] transition-all inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add First Item
                  </button>
                </td></tr>
              ) : sortedItems.map(item => {
                const statusBadge = STATUS_BADGE[item.item_status]
                const stockCfg = STOCK_STATUS_BADGE[item.stock_status] || STOCK_STATUS_BADGE.in_stock!
                const StockIcon = stockCfg.icon
                const catColor = CATEGORY_COLOR[item.category_type] || CATEGORY_COLOR.other
                const ItemIcon = getCategoryIcon(item.category_type)

                return (
                  <tr key={item.id} className={cn("group border-b border-app-border hover:bg-app-accent/50 transition-colors", selected.has(item.id) && "bg-brand-500/5")}>
                    <td className="pl-4 py-3.5">
                      <input type="checkbox" className="rounded border-app-border" checked={selected.has(item.id)} onChange={() => setSelected(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n })} />
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="text-xs font-mono font-semibold text-app-secondary">{item.code}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-app-muted flex items-center justify-center shrink-0">
                          <ItemIcon className="w-4 h-4 text-app-subtle" />
                        </div>
                        <div>
                          <p className="font-semibold text-app-heading whitespace-nowrap">{item.name}</p>
                          <p className="text-xs text-app-secondary">{item.brand || item.sub_type || '—'} · {item.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize", catColor)}>
                        {item.category?.name || item.category_name || 'Uncategorized'}
                      </span>
                      {item.sub_type && <p className="text-[10px] text-app-subtle mt-0.5">{item.sub_type}</p>}
                    </td>
                    <td className="px-3 py-3.5">
                      {statusBadge && <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium border", statusBadge.className)}>{statusBadge.label}</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <StockIcon className={cn("w-3.5 h-3.5 shrink-0", stockCfg.color)} />
                        <span className={cn("font-semibold", stockCfg.color)}>{item.stock}</span>
                        <span className="text-app-subtle text-xs">/ {item.reorder_level}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-app-heading font-medium whitespace-nowrap">
                      {item.unit_price ? fmtCurrency(item.unit_price) : '—'}
                    </td>
                    <td className="px-3 py-3.5">
                      {item.assigned_to_name ? (
                        <div><p className="text-sm text-app-text whitespace-nowrap">{item.assigned_to_name}</p><p className="text-xs text-app-subtle">{item.assigned_department}</p></div>
                      ) : <span className="text-app-subtle text-xs">Unassigned</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      {item.warranty_expiry ? (
                        <div>
                          <p className={cn("text-xs font-medium", item.warranty_status === 'expired' ? 'text-status-danger' : item.warranty_status === 'expiring_soon' ? 'text-status-warning' : 'text-app-text')}>
                            {new Date(item.warranty_expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </p>
                          {item.warranty_status === 'expiring_soon' && <p className="text-[10px] text-status-warning">Expiring soon!</p>}
                          {item.warranty_status === 'expired' && <p className="text-[10px] text-status-danger">Expired</p>}
                        </div>
                      ) : <span className="text-app-subtle text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewItem(item)} className="p-1.5 text-app-subtle hover:text-brand-500 hover:bg-app-accent rounded-md transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setEditItem(item); setShowWizard(true); }} className="p-1.5 text-app-subtle hover:text-brand-500 hover:bg-app-accent rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <div className="relative">
                          <button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)} className="p-1.5 text-app-subtle hover:text-app-text hover:bg-app-muted rounded-md transition-colors">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {openMenu === item.id && (
                            <div className="absolute right-0 top-7 z-30 w-36 bg-app-surface border border-app-border rounded-lg shadow-lg py-1">
                              {['View Details', 'Edit Item', 'View History', 'Assign To', 'Transfer', 'Archive'].map(opt => (
                                <button key={opt} onClick={() => setOpenMenu(null)} className="w-full px-3 py-1.5 text-left text-xs text-app-text hover:bg-app-muted transition-colors">{opt}</button>
                              ))}
                              <hr className="border-app-border my-1" />
                              <button onClick={() => { setOpenMenu(null); handleDelete(item.id) }} className="w-full px-3 py-1.5 text-left text-xs text-status-danger hover:bg-status-danger/10 transition-colors">Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {sortedItems.length > 0 && (
          <div className="px-4 py-3 border-t border-app-border flex items-center justify-between text-xs text-app-secondary bg-app-muted/30">
            <span>Showing {sortedItems.length} of {stats?.total_items ?? sortedItems.length} items</span>
            <span>Total Value: <strong className="text-app-heading">{stats ? fmtCurrency(stats.total_value) : '—'}</strong></span>
          </div>
        )}
      </div>

      {showWizard && (
        <AddItemWizard 
          itemToEdit={editItem}
          categories={categories} 
          warehouses={warehouses}
          storageLocations={settings?.storage_locations || []}
          onClose={() => { setShowWizard(false); setEditItem(null); }}
          onSuccess={() => { setShowWizard(false); setEditItem(null); loadData(); }}
        />
      )}

      {showUniformWizard && (
        <AddUniformWizard
          onCancel={() => setShowUniformWizard(false)}
          onSuccess={() => { setShowUniformWizard(false); loadData() }}
        />
      )}

      {viewItem && (
        <ItemDetailsDrawer item={viewItem} onClose={() => setViewItem(null)} />
      )}
    </div>
  )
}
