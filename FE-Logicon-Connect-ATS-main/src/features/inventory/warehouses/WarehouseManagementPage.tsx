import { useState } from 'react'
import { Building2, MapPin, Plus, Truck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BranchList } from './components/BranchList'
import { SiteList } from './components/SiteList'
import { InventoryAssignmentWizard } from './components/InventoryAssignmentWizard'

export function WarehouseManagementPage() {
  const [activeTab, setActiveTab] = useState<'scoops' | 'sites' | 'assignments'>('scoops')
  const [showWizard, setShowWizard] = useState(false)

  const tabs = [
    { id: 'scoops', label: 'Scoops', icon: Building2 },
    { id: 'sites', label: 'Construction Sites', icon: MapPin },
    { id: 'assignments', label: 'Inventory Assignments', icon: Truck },
  ] as const

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-heading tracking-tight">Warehouse & Storage Management</h1>
          <p className="text-sm text-app-secondary mt-0.5">Manage scoops, sites, and inventory assignments dynamically.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-btn-primary)] hover:bg-[var(--color-btn-primary-hover)] text-white text-sm font-medium rounded-lg shadow-panel transition-all">
            <Plus className="w-4 h-4" /> Assign Inventory
          </button>
        </div>
      </div>

      <div className="border-b border-app-border flex gap-6">
        {tabs.map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 py-3 px-1 border-b-2 transition-colors font-medium text-sm",
                isActive 
                  ? "border-brand-500 text-brand-600" 
                  : "border-transparent text-app-secondary hover:text-app-text hover:border-app-border"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-brand-500" : "text-app-subtle")} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="bg-app-surface border border-app-border rounded-xl shadow-panel p-5 min-h-[500px]">
        {activeTab === 'scoops' && <BranchList />}
        {activeTab === 'sites' && <SiteList />}
        {activeTab === 'assignments' && (
          <div className="text-center py-20 text-app-secondary">
            <Truck className="w-12 h-12 text-app-muted mx-auto mb-4" />
            <p className="text-lg font-medium text-app-heading">Recent Assignments</p>
            <p className="text-sm mt-1">Assignment history and active deployments will appear here.</p>
            <button onClick={() => setShowWizard(true)} className="mt-4 px-4 py-2 bg-brand-500/10 text-brand-600 text-sm font-medium rounded-lg hover:bg-brand-500/20 transition-colors inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Start New Assignment
            </button>
          </div>
        )}
      </div>

      {showWizard && <InventoryAssignmentWizard onClose={() => setShowWizard(false)} />}
    </div>
  )
}
