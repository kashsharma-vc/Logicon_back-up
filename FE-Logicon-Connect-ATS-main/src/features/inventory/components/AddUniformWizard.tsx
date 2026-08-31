import { useState, useEffect } from 'react'
import { X, Loader2, Save, ArrowRight, ArrowLeft, Shirt, Users, Hash, CheckCircle2, HardHat, Footprints, ShieldAlert, CloudRain, Scissors } from 'lucide-react'
import { cn } from '@/lib/cn'
import { inventoryApi } from '../inventoryApi'
import { CATEGORY_CONFIGS } from '../categoryFieldConfig'
import { listRoles, type AccessRole } from '@/api/access'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { listDepartments, type DepartmentRow } from '@/api/departments'

// Form field wrapper
function FormField({ label, children, required, error, help }: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-app-heading">
        {label} {required && <span className="text-status-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-status-danger">{error}</p>}
      {help && !error && <p className="text-[10px] text-app-subtle">{help}</p>}
    </div>
  )
}

function Input(props: any) {
  return <input {...props} className={cn("w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all", props.className)} />
}



// ── Main Wizard ─────────────────────────────────────────────────────────────
export function AddUniformWizard({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(true)

  // Roles and Departments from backend
  const [internalRoles, setInternalRoles] = useState<AccessRole[]>([])
  const [jobRoles, setJobRoles] = useState<JobRoleRow[]>([])
  const [allDepartments, setAllDepartments] = useState<DepartmentRow[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [intRolesData, jobRolesData, deptsData] = await Promise.all([
          listRoles({ is_active: true }),
          listJobRoles(),
          listDepartments({ is_active: true })
        ])
        
        const parsedIntRoles = Array.isArray(intRolesData) ? intRolesData : (intRolesData as any)?.items || []
        const parsedJobRoles = Array.isArray(jobRolesData) ? jobRolesData : (jobRolesData as any)?.items || []
        const parsedDepts = Array.isArray(deptsData) ? deptsData : (deptsData as any)?.items || []

        setInternalRoles(parsedIntRoles)
        setJobRoles(parsedJobRoles)
        setAllDepartments(parsedDepts)
      } catch (err) {
        console.error("Failed to load roles/departments", err)
      } finally {
        setLoadingRoles(false)
      }
    }
    fetchData()
  }, [])

  // Step 1: Kit Data
  const [kitData, setKitData] = useState({ name: '', role: '', departments: [] as string[], description: '' })
  
  // Step 2: Components
  const [selectedComponents, setSelectedComponents] = useState<string[]>([])
  const componentOptions = CATEGORY_CONFIGS['uniform']?.subTypes || []

  // Step 3: Matrices
  const [matrices, setMatrices] = useState<Record<string, { sizes: string[], quantities: Record<string, number>, unit: string }>>({})

  // Handlers for Step 1
  const toggleDept = (d: string) => {
    setKitData(prev => ({
      ...prev,
      departments: prev.departments.includes(d) ? prev.departments.filter(x => x !== d) : [...prev.departments, d]
    }))
  }

  // Handlers for Step 2
  const toggleComponent = (c: string) => {
    if (selectedComponents.includes(c)) {
      setSelectedComponents(prev => prev.filter(x => x !== c))
      const newM = { ...matrices }
      delete newM[c]
      setMatrices(newM)
    } else {
      setSelectedComponents(prev => [...prev, c])
      setMatrices(prev => ({ ...prev, [c]: { sizes: [], quantities: {}, unit: 'PCS' } }))
    }
  }

  // Handle matrix inputs
  const toggleSize = (comp: string, size: string) => {
    setMatrices(prev => {
      const m = prev[comp] ? { ...prev[comp] } : { sizes: [] as string[], quantities: {} as Record<string, number>, unit: 'PCS' }
      if (m.sizes.includes(size)) {
        m.sizes = m.sizes.filter((s: string) => s !== size)
        delete m.quantities[size]
      } else {
        m.sizes = [...m.sizes, size]
        m.quantities[size] = 0
      }
      return { ...prev, [comp]: m }
    })
  }

  const updateQuantity = (comp: string, size: string, qty: number) => {
    setMatrices(prev => {
      const m = prev[comp] ? { ...prev[comp] } : { sizes: [] as string[], quantities: {} as Record<string, number>, unit: 'PCS' }
      m.quantities[size] = qty
      return { ...prev, [comp]: m }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const items = []
      for (const comp of selectedComponents) {
        const m = matrices[comp]
        if (!m || m.sizes.length === 0) continue // Skip if no sizes selected
        for (const size of m.sizes) {
          const qty = m.quantities[size] || 0
          if (qty > 0) {
            items.push({
              name: `${comp} - Size ${size}`,
              sub_type: comp,
              quantity: qty,
              unit: m.unit,
              dynamic_fields: { size }
            })
          }
        }
      }

      if (items.length === 0) {
        alert("Please specify at least one quantity for one size.")
        setSaving(false)
        return
      }

      const payload = {
        kit: kitData,
        items
      }

      await inventoryApi.createUniformKit(payload)
      onSuccess()
    } catch (e) {
      console.error(e)
      alert('Failed to save Uniform Kit.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render Steps ──────────────────────────────────────────────────────────

  const isClientRole = jobRoles.some(r => r.name === kitData.role)
  const displayDepartments = isClientRole
    ? allDepartments.filter(d => d.name.toLowerCase().includes('operation') || d.code.toLowerCase().includes('operation'))
    : allDepartments

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Uniform Kit Name" required>
          <Input value={kitData.name} onChange={(e: any) => setKitData({...kitData, name: e.target.value})} placeholder="e.g. Safety Officer Summer Kit" />
        </FormField>
        <FormField label="Target Role" required>
          <select value={kitData.role} onChange={(e: any) => setKitData({...kitData, role: e.target.value})} className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm">
            <option value="">Select Role...</option>
            {loadingRoles ? (
              <option disabled>Loading roles...</option>
            ) : (
              <>
                <optgroup label="Internal Roles">
                  {internalRoles.map(r => <option key={`int_${r.id}`} value={r.name}>{r.name}</option>)}
                </optgroup>
                <optgroup label="Client / Job Roles">
                  {jobRoles.map(r => <option key={`job_${r.id}`} value={r.name}>{r.name}</option>)}
                </optgroup>
              </>
            )}
          </select>
        </FormField>
      </div>
      <FormField label="Applicable Departments">
        <div className="flex flex-wrap gap-2">
          {displayDepartments.map(d => (
            <button key={d.id} type="button" onClick={() => toggleDept(d.name)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all", kitData.departments.includes(d.name) ? "bg-brand-500/10 border-brand-500 text-brand-600" : "bg-app-surface border-app-border text-app-secondary hover:border-brand-500/30")}>
              {d.name}
            </button>
          ))}
          {displayDepartments.length === 0 && (
            <span className="text-xs text-app-subtle italic py-1.5">No applicable departments found.</span>
          )}
        </div>
      </FormField>
      <FormField label="Kit Description">
        <textarea value={kitData.description} onChange={(e: any) => setKitData({...kitData, description: e.target.value})} className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm" rows={3}></textarea>
      </FormField>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <p className="text-sm text-app-secondary">Select all the components that should be generated for this Uniform Kit.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {componentOptions.map(c => {
          const selected = selectedComponents.includes(c)
          let Icon = Shirt
          const n = c.toLowerCase()
          if (n.includes('cap') || n.includes('helmet')) Icon = HardHat
          else if (n.includes('shoes') || n.includes('socks')) Icon = Footprints
          else if (n.includes('raincoat')) Icon = CloudRain
          else if (n.includes('vest') || n.includes('jacket')) Icon = ShieldAlert
          else if (n.includes('pant')) Icon = Scissors
          
          return (
            <button key={c} type="button" onClick={() => toggleComponent(c)} className={cn("flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all", selected ? "bg-brand-500/5 border-brand-500" : "bg-app-surface border-app-border hover:border-brand-500/30")}>
              <Icon className={cn("w-6 h-6", selected ? "text-brand-500" : "text-app-subtle")} />
              <span className={cn("text-xs font-medium text-center", selected ? "text-brand-600" : "text-app-secondary")}>{c}</span>
              {selected && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-500"></div>}
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      {selectedComponents.map(comp => {
        const m = matrices[comp]
        if (!m) return null
        
        // Determine available sizes based on component type
        let availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size']
        if (comp.toLowerCase().includes('shoes') || comp.toLowerCase().includes('boots')) {
          availableSizes = ['5', '6', '7', '8', '9', '10', '11', '12']
        } else if (comp.toLowerCase().includes('pant') || comp.toLowerCase().includes('trouser')) {
          availableSizes = ['28', '30', '32', '34', '36', '38', '40', '42']
        }

        const totalQty = m.sizes.reduce((sum, s) => sum + (m.quantities[s] || 0), 0)

        let Icon = Shirt
        const n = comp.toLowerCase()
        if (n.includes('cap') || n.includes('helmet')) Icon = HardHat
        else if (n.includes('shoes') || n.includes('socks')) Icon = Footprints
        else if (n.includes('raincoat')) Icon = CloudRain
        else if (n.includes('vest') || n.includes('jacket')) Icon = ShieldAlert
        else if (n.includes('pant')) Icon = Scissors

        return (
          <div key={comp} className="bg-app-surface border border-app-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-app-border">
              <h3 className="text-base font-semibold text-app-heading flex items-center gap-2"><Icon className="w-4 h-4 text-brand-500" /> {comp}</h3>
              <div className="text-sm font-medium bg-brand-500/10 text-brand-600 px-3 py-1 rounded-full">Total Qty: {totalQty}</div>
            </div>

            <div className="space-y-5">
              <FormField label="Required Sizes">
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(s => {
                    const active = m.sizes.includes(s)
                    return (
                      <button key={s} type="button" onClick={() => toggleSize(comp, s)} className={cn("min-w-10 px-2 py-1 rounded text-xs font-medium border transition-all", active ? "bg-brand-500 text-white border-brand-500" : "bg-app-muted text-app-secondary border-app-border hover:border-brand-500/30")}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </FormField>

              {m.sizes.length > 0 && (
                <div className="bg-app-muted rounded-lg p-4 border border-app-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {m.sizes.map(s => <th key={s} className="px-2 py-1 text-center font-medium text-app-secondary border-b border-app-border">{s}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {m.sizes.map(s => (
                          <td key={s} className="px-2 py-2 text-center">
                            <input type="number" min="0" value={m.quantities[s] || ''} onChange={e => updateQuantity(comp, s, parseInt(e.target.value) || 0)} className="w-20 text-center px-2 py-1.5 bg-white border border-app-border rounded" placeholder="Qty" />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderStep4 = () => {
    let totalItems = 0
    let totalQty = 0
    
    selectedComponents.forEach(c => {
      const m = matrices[c]
      if (m) {
        m.sizes.forEach(s => {
          const q = m.quantities[s] || 0
          if (q > 0) {
            totalItems++
            totalQty += q
          }
        })
      }
    })

    return (
      <div className="py-10 flex flex-col items-center text-center">
        <CheckCircle2 className="w-16 h-16 text-status-success mb-4" />
        <h2 className="text-2xl font-bold text-app-heading mb-2">Ready to generate Kit</h2>
        <p className="text-app-secondary mb-8 max-w-md">The system will generate <strong className="text-app-text">{totalItems} individual inventory records</strong> across <strong className="text-app-text">{selectedComponents.length} components</strong>, resulting in <strong className="text-app-text">{totalQty} total units of stock</strong>.</p>
        
        <div className="bg-app-surface border border-app-border rounded-xl p-6 w-full max-w-lg text-left shadow-sm">
          <h4 className="text-sm font-bold text-app-heading mb-4 uppercase tracking-wider">{kitData.name || 'Unnamed Kit'}</h4>
          <ul className="space-y-3">
            {selectedComponents.map(c => {
              const m = matrices[c]
              if (!m) return null
              const validSizes = m.sizes.filter(s => (m.quantities[s] || 0) > 0)
              if (validSizes.length === 0) return null
              
              return (
                <li key={c} className="flex justify-between text-sm border-b border-app-border border-dashed pb-2">
                  <span className="font-medium text-app-text">{c}</span>
                  <span className="text-app-secondary">
                    {validSizes.map(s => `${s} (${m.quantities[s]})`).join(', ')}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    )
  }

  // ── Wrapper & Navigation ──────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-app-border overflow-hidden">
        
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-app-border bg-app-surface/50">
          <div>
            <h2 className="text-lg font-bold text-app-heading">Enterprise Uniform Builder</h2>
            <p className="text-xs text-app-secondary">Dynamic multi-component kit generator</p>
          </div>
          <button onClick={onCancel} className="p-2 text-app-secondary hover:bg-app-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-app-border bg-app-muted overflow-x-auto hide-scrollbar">
          {[
            { n: 1, l: 'Role Info', i: Users },
            { n: 2, l: 'Components', i: Shirt },
            { n: 3, l: 'Sizes Matrix', i: Hash },
            { n: 4, l: 'Generate', i: Save }
          ].map(s => {
            const Icon = s.i
            return (
              <div key={s.n} className={cn("flex-1 min-w-[120px] flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-all", step === s.n ? "border-brand-500 text-brand-600 bg-app-surface" : step > s.n ? "border-transparent text-app-text" : "border-transparent text-app-subtle")}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs", step === s.n ? "bg-brand-500 text-white" : step > s.n ? "bg-status-success text-white" : "bg-app-border")}>
                  {step > s.n ? <CheckCircle2 className="w-3 h-3" /> : s.n}
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  {s.l}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-app-surface">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        <div className="p-4 sm:p-6 border-t border-app-border bg-app-surface/50 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(s => s - 1)} className="px-5 py-2 border border-app-border rounded-lg text-sm font-medium text-app-text hover:bg-app-muted transition-all flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : <div></div>}
          
          {step < 4 ? (
            <button type="button" onClick={() => setStep(s => s + 1)} className="px-5 py-2 bg-[var(--color-btn-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-btn-primary-hover)] transition-all flex items-center gap-2">
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[var(--color-btn-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-btn-primary-hover)] transition-all flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Generate Records
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
