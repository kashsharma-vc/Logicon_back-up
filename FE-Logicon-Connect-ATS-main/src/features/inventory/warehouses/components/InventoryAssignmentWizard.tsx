import { useState, useEffect } from 'react'
import { X, Loader2, Check, ArrowRight } from 'lucide-react'
import { listScopeNodes, type ScopeNode } from '@/api/access'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { listClients, type ClientRow } from '@/api/clients'
import { listDepartments } from '@/api/departments'
import { listJobRoles } from '@/api/jobs'
import { listUsers } from '@/api/users'

interface InventoryAssignmentWizardProps {
  onClose: () => void
}

export function InventoryAssignmentWizard({ onClose }: InventoryAssignmentWizardProps) {
  const [step, setStep] = useState(1)
  
  // Master Data
  const [scoops, setScoops] = useState<ScopeNode[]>([])
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [clients, setClients] = useState<Record<number, ClientRow>>({})
  const [departments, setDepartments] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])

  // Selections
  const [selectedScoop, setSelectedScoop] = useState<number | ''>('')
  const [selectedSite, setSelectedSite] = useState<number | ''>('')
  const [selectedDepartment, setSelectedDepartment] = useState<number | ''>('')
  const [selectedRole, setSelectedRole] = useState<number | ''>('')
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('')

  // Loading states
  const [loadingScoops, setLoadingScoops] = useState(true)
  const [loadingSites, setLoadingSites] = useState(false)
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // 1. Initial Load: Scoops and Clients
  useEffect(() => {
    Promise.all([
      listScopeNodes(),
      listClients({})
    ]).then(([scoopsRes, clientsRes]) => {
      const allNodes = Array.isArray(scoopsRes) ? scoopsRes : (scoopsRes as any).items || []
      setScoops(allNodes.filter((n: any) => n.node_type === 'region'))
      const clientMap: Record<number, ClientRow> = {}
      const clientsList = Array.isArray(clientsRes) ? clientsRes : (clientsRes as any).items || []
      clientsList.forEach((c: ClientRow) => {
        clientMap[c.id] = c
      })
      setClients(clientMap)
    }).finally(() => setLoadingScoops(false))
  }, [])

  // 2. Scoop selected -> Load Sites
  useEffect(() => {
    if (!selectedScoop) return
    setLoadingSites(true)
    // In an ideal backend, listSites would accept scoop={selectedScoop}
    listSites({}).then(res => {
      setSites(Array.isArray(res) ? res : (res as any).items || [])
    }).finally(() => setLoadingSites(false))
  }, [selectedScoop])

  // 3. Site selected -> Auto-fill logic (simulated by derived state below) & Load Departments
  useEffect(() => {
    if (!selectedSite) return
    setLoadingDepts(true)
    listDepartments().then(res => {
      setDepartments(Array.isArray(res) ? res : (res as any).items || [])
    }).finally(() => setLoadingDepts(false))
  }, [selectedSite])

  // 4. Department selected -> Load Roles
  useEffect(() => {
    if (!selectedDepartment) return
    setLoadingRoles(true)
    listJobRoles().then(res => {
      setRoles(Array.isArray(res) ? res : (res as any).items || [])
    }).finally(() => setLoadingRoles(false))
  }, [selectedDepartment])

  // 5. Role selected -> Load Employees
  useEffect(() => {
    if (!selectedRole) return
    setLoadingEmployees(true)
    listUsers({}).then(res => {
      setEmployees(Array.isArray(res) ? res : (res as any).items || [])
    }).finally(() => setLoadingEmployees(false))
  }, [selectedRole])

  // Derived state for Site Auto-fills
  const activeSite = sites.find(s => s.id === selectedSite)
  const activeClient = activeSite ? clients[activeSite.client] : null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-app-surface w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-app-border">
          <div>
            <h2 className="text-xl font-bold text-app-heading">Assign Inventory</h2>
            <p className="text-sm text-app-secondary">Select hierarchy to assign items</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-app-surface-hover rounded-full transition-colors text-app-subtle">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8 text-sm font-medium">
            <span className={`px-2 py-1 rounded ${step >= 1 ? 'bg-brand-500 text-white' : 'bg-app-surface-alt text-app-subtle'}`}>1. Location</span>
            <ArrowRight className="w-4 h-4 text-app-border" />
            <span className={`px-2 py-1 rounded ${step >= 2 ? 'bg-brand-500 text-white' : 'bg-app-surface-alt text-app-subtle'}`}>2. Personnel</span>
            <ArrowRight className="w-4 h-4 text-app-border" />
            <span className={`px-2 py-1 rounded ${step >= 3 ? 'bg-brand-500 text-white' : 'bg-app-surface-alt text-app-subtle'}`}>3. Items</span>
          </div>

          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-app-heading">Scoop <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface focus:ring-2 focus:ring-brand-500/20"
                  value={selectedScoop}
                  onChange={e => setSelectedScoop(Number(e.target.value))}
                >
                  <option value="">Select a scoop...</option>
                  {scoops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {loadingScoops && <p className="text-xs text-brand-600 flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</p>}
              </div>

              {selectedScoop !== '' && (
                <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-sm font-medium text-app-heading">Construction Site <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface focus:ring-2 focus:ring-brand-500/20"
                    value={selectedSite}
                    onChange={e => setSelectedSite(Number(e.target.value))}
                    disabled={loadingSites}
                  >
                    <option value="">Select a site...</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                  {loadingSites && <p className="text-xs text-brand-600 flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Fetching sites for scoop...</p>}
                </div>
              )}

              {/* Auto-filled details */}
              {activeSite && (
                <div className="mt-4 p-4 rounded-xl bg-app-surface-alt border border-app-border space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <h4 className="text-xs font-semibold text-app-subtle uppercase tracking-wider">Auto-filled from Site</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-app-secondary mb-1">Client</span>
                      <div className="font-medium text-sm text-app-heading">{activeClient?.name || 'Loading...'}</div>
                    </div>
                    <div>
                      <span className="block text-xs text-app-secondary mb-1">Operations Manager</span>
                      <div className="font-medium text-sm text-app-heading">{activeClient?.contact_name || activeSite.contact_person || 'Not Assigned'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-app-heading">Department <span className="text-red-500">*</span></label>
                <select 
                  className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface focus:ring-2 focus:ring-brand-500/20"
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(Number(e.target.value))}
                  disabled={loadingDepts}
                >
                  <option value="">Select department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {loadingDepts && <p className="text-xs text-brand-600 flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Fetching departments...</p>}
              </div>

              {selectedDepartment !== '' && (
                <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-sm font-medium text-app-heading">Role <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface focus:ring-2 focus:ring-brand-500/20"
                    value={selectedRole}
                    onChange={e => setSelectedRole(Number(e.target.value))}
                    disabled={loadingRoles}
                  >
                    <option value="">Select role...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                  {loadingRoles && <p className="text-xs text-brand-600 flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Fetching roles...</p>}
                </div>
              )}

              {selectedRole !== '' && (
                <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-sm font-medium text-app-heading">Employee <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface focus:ring-2 focus:ring-brand-500/20"
                    value={selectedEmployee}
                    onChange={e => setSelectedEmployee(Number(e.target.value))}
                    disabled={loadingEmployees}
                  >
                    <option value="">Select employee to assign...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                    ))}
                  </select>
                  {loadingEmployees && <p className="text-xs text-brand-600 flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Finding eligible employees...</p>}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-8">
              <Check className="w-16 h-16 text-green-500 mx-auto mb-4 bg-green-50 p-4 rounded-full" />
              <h3 className="text-xl font-bold text-app-heading">Hierarchy Confirmed</h3>
              <p className="text-app-secondary max-w-sm mx-auto">
                You are about to assign inventory to the selected employee at this site. 
                (The actual inventory selection interface would be implemented here).
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-app-border flex justify-between bg-app-surface-alt rounded-b-2xl">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()} 
            className="px-4 py-2 font-medium text-sm text-app-secondary hover:text-app-heading hover:bg-app-surface rounded-lg transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step < 3 ? (
            <button 
               onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !selectedSite) ||
                (step === 2 && !selectedEmployee)
              }
              className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              Complete Assignment <Check className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
