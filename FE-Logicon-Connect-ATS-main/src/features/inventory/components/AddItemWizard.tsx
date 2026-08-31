import { useState, useCallback } from 'react'
import { 
  X, ChevronRight, ChevronLeft, Save, Check, Info,
  Package, Settings, BarChart2, ClipboardCheck, AlertCircle, Loader2
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { inventoryApi } from '../inventoryApi'
import { CATEGORY_TYPE_OPTIONS, UNIT_OPTIONS_BY_CATEGORY, getCategoryConfig, DynamicField } from '../categoryFieldConfig'
import type { InventoryCategory, Warehouse } from '../inventoryApi'

// ── Step Definitions ──────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Basic Info', icon: Package, description: 'Name, code, category' },
  { id: 2, label: 'Category Details', icon: Settings, description: 'Type-specific fields' },
  { id: 3, label: 'Stock & Location', icon: BarChart2, description: 'Quantities and storage' },
  { id: 4, label: 'Review & Submit', icon: ClipboardCheck, description: 'Final confirmation' },
]

// ── Reusable form components ──────────────────────────────────────
function FormField({ label, required, help, error, children }: {
  label: string; required?: boolean; help?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-app-text">
        {label}{required && <span className="text-status-danger ml-0.5">*</span>}
      </label>
      {children}
      {help && <p className="text-xs text-app-subtle flex items-center gap-1"><Info className="w-3 h-3" />{help}</p>}
      {error && <p className="text-xs text-status-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <input 
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    />
  )
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string } | string>; placeholder?: string
}) {
  const normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  return (
    <select 
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
    >
      <option value="">{placeholder || 'Select...'}</option>
      {normalized.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20", 
          checked ? 'bg-brand-500' : 'bg-app-border'
        )}
      >
        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
      {label && <span className="text-sm text-app-text">{label}</span>}
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 mb-4 border-b border-app-border">
      <h3 className="text-sm font-semibold text-app-heading uppercase tracking-wider">{title}</h3>
    </div>
  )
}

// ── Main Wizard Component ──────────────────────────────────────────────────────
interface AddItemWizardProps {
  itemToEdit?: any
  categories: InventoryCategory[]
  warehouses: Warehouse[]
  storageLocations?: string[]
  onClose: () => void
  onSuccess: () => void
}

const EMPTY_FORM = {
  // Step 1
  name: '', code: '', description: '', category_id: '', category_type: '', sub_type: '', brand: '', unit: '',
  // Step 2 (dynamic)
  dynamic_fields: {} as Record<string, any>,
  // Step 3
  stock: 0, reorder_level: 0, min_quantity: 0, max_quantity: '',
  unit_price: '', warehouse_id: '', storage_location: '', rack_number: '',
  // Step 4
  assigned_to_name: '', assigned_to_id: '', assigned_department: '', assigned_project: '', assigned_site: '', assigned_date: '',
  return_required: false, expected_return_date: '',
  // Step 5
  purchase_date: '', purchase_cost: '', supplier: '', invoice_number: '', batch_number: '', serial_number: '', asset_tag: '',
  // Step 6
  warranty_start: '', warranty_expiry: '', amc_start: '', amc_end: '', amc_vendor: '',
  last_maintenance: '', next_maintenance: '', maintenance_cycle_days: '',
  // Step 7
  condition: 'new', item_status: 'available',
}

export function AddItemWizard({ itemToEdit, categories, warehouses, storageLocations = [], onClose, onSuccess }: AddItemWizardProps) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => {
    if (itemToEdit) {
      return {
        ...EMPTY_FORM,
        ...itemToEdit,
        category_id: String(itemToEdit.category?.id || itemToEdit.category_id || ''),
        warehouse_id: String(itemToEdit.warehouse?.id || itemToEdit.warehouse_id || ''),
        condition: itemToEdit.condition || 'new',
        item_status: itemToEdit.item_status || 'available',
        dynamic_fields: itemToEdit.dynamic_fields || {}
      }
    }
    return { ...EMPTY_FORM }
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }))
    setErrors((prev: any) => ({ ...prev, [field]: '' }))
  }

  const setDynamic = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, dynamic_fields: { ...prev.dynamic_fields, [key]: value } }))
  }

  // Auto-generate code
  const generateCode = useCallback(() => {
    const prefix = form.category_type.toUpperCase().slice(0, 3) || 'ITM'
    const rand = Math.floor(Math.random() * 9000 + 1000)
    set('code', `${prefix}-${rand}`)
  }, [form.category_type])

  const categoryConfig = getCategoryConfig(form.category_type)

  // Get unit options
  const unitOptions = UNIT_OPTIONS_BY_CATEGORY[form.category_type] ?? UNIT_OPTIONS_BY_CATEGORY.default

  // Group dynamic fields by group
  const dynamicFieldGroups = categoryConfig
    ? Object.entries(
        categoryConfig.dynamicFields.reduce((acc, f) => {
          const g = f.group || 'General'
          if (!acc[g]) acc[g] = []
          acc[g].push(f)
          return acc
        }, {} as Record<string, DynamicField[]>)
      )
    : []

  // Step validation
  const validateStep = () => {
    const errs: Record<string, string> = {}
    if (step === 1) {
      if (!form.name) errs.name = 'Item name is required'
      if (!form.code) errs.code = 'Item code is required'
      if (!form.category_id) errs.category_id = 'Category is required'
      if (!form.category_type) errs.category_type = 'Category type is required'
      if (!form.unit) errs.unit = 'Unit is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => {
    if (!validateStep()) return
    setStep(s => Math.min(s + 1, STEPS.length))
  }

  const prev = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        name: form.name, code: form.code, description: form.description,
        category_id: Number(form.category_id), category_type: form.category_type,
        sub_type: form.sub_type, brand: form.brand, unit: form.unit,
        stock: Number(form.stock), reorder_level: Number(form.reorder_level),
        min_quantity: Number(form.min_quantity),
        max_quantity: form.max_quantity ? Number(form.max_quantity) : null,
        unit_price: form.unit_price || 0,
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        storage_location: form.storage_location, rack_number: form.rack_number,
        serial_number: form.serial_number, asset_tag: form.asset_tag,
        assigned_to_name: form.assigned_to_name, assigned_to_id: form.assigned_to_id,
        assigned_department: form.assigned_department, assigned_project: form.assigned_project,
        assigned_site: form.assigned_site, assigned_date: form.assigned_date || null,
        return_required: form.return_required,
        expected_return_date: form.expected_return_date || null,
        purchase_date: form.purchase_date || null,
        purchase_cost: form.purchase_cost || null,
        supplier: form.supplier, invoice_number: form.invoice_number, batch_number: form.batch_number,
        warranty_start: form.warranty_start || null, warranty_expiry: form.warranty_expiry || null,
        amc_start: form.amc_start || null, amc_end: form.amc_end || null, amc_vendor: form.amc_vendor,
        last_maintenance: form.last_maintenance || null, next_maintenance: form.next_maintenance || null,
        maintenance_cycle_days: form.maintenance_cycle_days ? Number(form.maintenance_cycle_days) : null,
        condition: form.condition, item_status: form.item_status,
        dynamic_fields: form.dynamic_fields,
      }
      if (itemToEdit) {
        await inventoryApi.updateItem(itemToEdit.id, payload)
      } else {
        await inventoryApi.createItem(payload)
      }
      onSuccess()
    } catch (err) {
      console.error(err)
      alert('Failed to save item. Please check all fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render Steps ──────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Item Name" required error={errors.name}>
          <Input value={form.name} onChange={v => set('name', v)} placeholder="e.g. Safety Helmet Class A" />
        </FormField>
        <FormField label="Item Code / SKU" required error={errors.code} help="Auto-generated based on category, or type your own">
          <div className="flex gap-2">
            <Input value={form.code} onChange={v => set('code', v)} placeholder="e.g. PPE-1042" />
            <button type="button" onClick={generateCode} className="px-3 py-2 bg-app-muted border border-app-border rounded-lg text-xs font-medium text-app-secondary hover:bg-app-accent hover:text-brand-500 transition-all whitespace-nowrap">
              Auto
            </button>
          </div>
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Item Classification" required error={errors.category_type} help="Used to load specific tracking fields">
          <Select 
            value={form.category_type} 
            onChange={v => { set('category_type', v); set('sub_type', ''); set('dynamic_fields', {}) }}
            options={CATEGORY_TYPE_OPTIONS}
            placeholder="Select category type..."
          />
        </FormField>
        <FormField label="Inventory Category" required error={errors.category_id}>
          <Select 
            value={form.category_id} 
            onChange={v => set('category_id', v)}
            options={categories
              .filter(c => c.name.toLowerCase().includes('billable'))
              .map(c => ({ value: String(c.id), label: c.name }))}
            placeholder="Select category..."
          />
        </FormField>
      </div>

      {categoryConfig && (
        <FormField label="Sub-Type / Item Type">
          <Select 
            value={form.sub_type} onChange={v => set('sub_type', v)}
            options={categoryConfig.subTypes}
            placeholder={`Select ${categoryConfig.label} type...`}
          />
        </FormField>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Brand / Make">
          <Input value={form.brand} onChange={v => set('brand', v)} placeholder="e.g. Karam, Dell, JCB" />
        </FormField>
        <FormField 
          label={form.category_type === 'uniform' ? 'Size / Unit' : form.category_type === 'ppe_shoes' ? 'Shoe Size / Unit' : 'Unit of Measurement'} 
          required 
          error={errors.unit}
        >
          <Select 
            value={form.unit} 
            onChange={v => set('unit', v)} 
            options={unitOptions || []} 
            placeholder={form.category_type === 'uniform' ? 'Select size/unit...' : 'Select unit...'} 
          />
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} placeholder="Brief description of the item, specifications, usage, etc."
          className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-5">
        <FormField label="Condition">
          <Select value={form.condition} onChange={v => set('condition', v)} options={['new', 'good', 'fair', 'poor', 'damaged']} />
        </FormField>
        <FormField label="Initial Status">
          <Select value={form.item_status} onChange={v => set('item_status', v)} options={['available', 'assigned', 'maintenance', 'archived']} />
        </FormField>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      {!categoryConfig ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-10 h-10 text-app-subtle mb-3" />
          <p className="text-sm text-app-secondary">Please go back to Step 1 and select a Category Type to see category-specific fields.</p>
          <button onClick={prev} className="mt-4 px-4 py-2 bg-app-muted rounded-lg text-sm text-brand-500 hover:bg-app-accent transition-all">
            ← Go Back
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 p-3 bg-brand-500/5 border border-brand-500/20 rounded-lg">
            <Info className="w-4 h-4 text-brand-500 shrink-0" />
            <p className="text-xs text-brand-600">Fields below are specific to <strong>{categoryConfig.label}</strong> {form.sub_type ? `(${form.sub_type})` : ''}. Only fill what applies.</p>
          </div>

          {dynamicFieldGroups.map(([groupName, fields]) => (
            <div key={groupName}>
              <SectionTitle title={groupName} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {fields.map(field => (
                  <FormField key={field.key} label={field.label} required={field.required} help={field.help}>
                    {field.type === 'boolean' ? (
                      <Toggle 
                        checked={!!form.dynamic_fields[field.key]} 
                        onChange={v => setDynamic(field.key, v)}
                        label={form.dynamic_fields[field.key] ? 'Yes' : 'No'}
                      />
                    ) : field.type === 'select' ? (
                      <Select value={form.dynamic_fields[field.key] || ''} onChange={v => setDynamic(field.key, v)} options={field.options!} placeholder={field.placeholder} />
                    ) : field.type === 'multi-select' ? (
                      <div className="flex flex-wrap gap-2">
                        {field.options!.map(opt => (
                          <button
                            key={opt} type="button"
                            onClick={() => {
                              const current = form.dynamic_fields[field.key] as string[] || []
                              const updated = current.includes(opt) ? current.filter(x => x !== opt) : [...current, opt]
                              setDynamic(field.key, updated)
                            }}
                            className={cn("px-2.5 py-1 text-xs rounded-full border transition-all",
                              (form.dynamic_fields[field.key] as string[] || []).includes(opt)
                                ? 'bg-brand-500 border-brand-500 text-white'
                                : 'bg-app-surface border-app-border text-app-secondary hover:border-brand-500 hover:text-brand-500'
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={form.dynamic_fields[field.key] || ''} rows={2}
                        onChange={e => setDynamic(field.key, e.target.value)} placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                      />
                    ) : (
                      <Input 
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        value={form.dynamic_fields[field.key] || ''} 
                        onChange={v => setDynamic(field.key, v)} placeholder={field.placeholder}
                      />
                    )}
                  </FormField>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <SectionTitle title="Stock Levels" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <FormField label="Current Stock" required>
          <Input type="number" value={form.stock} onChange={v => set('stock', v)} />
        </FormField>
        <FormField label="Reorder Level" help="Alert when stock falls to this level">
          <Input type="number" value={form.reorder_level} onChange={v => set('reorder_level', v)} />
        </FormField>
        <FormField label="Min Quantity">
          <Input type="number" value={form.min_quantity} onChange={v => set('min_quantity', v)} />
        </FormField>
        <FormField label="Max Quantity">
          <Input type="number" value={form.max_quantity} onChange={v => set('max_quantity', v)} placeholder="Optional" />
        </FormField>
      </div>
      <FormField label="Unit Price (₹)">
        <Input type="number" value={form.unit_price} onChange={v => set('unit_price', v)} placeholder="0.00" />
      </FormField>

      <SectionTitle title="Storage Location" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <FormField label="Primary Warehouse">
          <Select value={form.warehouse_id} onChange={v => set('warehouse_id', v)} 
            options={warehouses.map(w => ({ value: String(w.id), label: `${w.code} — ${w.name}` }))} 
            placeholder="Select warehouse..."
          />
        </FormField>
        <FormField label="Storage Location" help="Select configured storage location">
          <Select 
            value={form.storage_location} 
            onChange={v => set('storage_location', v)} 
            options={storageLocations.map(l => ({ value: l, label: l }))} 
            placeholder="Select location..." 
          />
        </FormField>
        <FormField label="Rack / Bin Number">
          <Input value={form.rack_number} onChange={v => set('rack_number', v)} placeholder="e.g. R-12-B4" />
        </FormField>
      </div>
    </div>
  )



  const renderStep8 = () => {
    const summaryFields = [
      { label: 'Item Name', value: form.name },
      { label: 'Code / SKU', value: form.code },
      { label: 'Category Type', value: CATEGORY_TYPE_OPTIONS.find(o => o.value === form.category_type)?.label || form.category_type },
      { label: 'Sub-Type', value: form.sub_type || '—' },
      { label: 'Brand', value: form.brand || '—' },
      { label: 'Unit', value: form.unit },
      { label: 'Stock', value: String(form.stock) },
      { label: 'Unit Price', value: form.unit_price ? `₹${form.unit_price}` : '—' },
    ]
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 p-4 bg-status-success/10 border border-status-success/20 rounded-xl">
          <Check className="w-4 h-4 text-status-success shrink-0" />
          <p className="text-sm text-status-success font-medium">All steps complete! Review the summary below and click Save.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {summaryFields.map(f => (
            <div key={f.label} className="flex items-center gap-3 px-4 py-3 bg-app-muted rounded-lg">
              <span className="text-xs font-medium text-app-secondary w-32 shrink-0">{f.label}</span>
              <span className="text-sm text-app-heading font-medium truncate">{f.value}</span>
            </div>
          ))}
        </div>
        {Object.keys(form.dynamic_fields).length > 0 && (
          <>
            <SectionTitle title="Category-Specific Fields" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(form.dynamic_fields).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3 px-4 py-3 bg-brand-500/5 rounded-lg border border-brand-500/10">
                  <span className="text-xs font-medium text-app-secondary w-32 shrink-0 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-app-heading font-medium truncate">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  const STEP_RENDERERS = [renderStep1, renderStep2, renderStep3, renderStep8]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-app-surface border border-app-border rounded-2xl shadow-2xl w-full max-w-4xl my-8 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-muted">
          <div>
            <h2 className="text-lg font-bold text-app-heading">{itemToEdit ? 'Edit Inventory Item' : 'Add Inventory Item'}</h2>
            <p className="text-xs text-app-secondary mt-0.5">Step {step} of {STEPS.length} — {STEPS[step - 1]?.description}</p>
          </div>
          <button onClick={onClose} className="p-2 text-app-subtle hover:text-app-text hover:bg-app-surface rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress */}
        <div className="px-6 py-3 border-b border-app-border overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = step === s.id
              const isComplete = step > s.id
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all text-xs font-bold border-2",
                      isComplete ? 'bg-status-success border-status-success text-white' :
                      isActive ? 'bg-brand-500 border-brand-500 text-white' :
                      'bg-app-surface border-app-border text-app-subtle'
                    )}>
                      {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={cn("text-[10px] font-medium whitespace-nowrap", isActive ? 'text-brand-500' : 'text-app-subtle')}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn("h-px w-8 mx-1 mb-4 transition-all", isComplete ? 'bg-status-success' : 'bg-app-border')} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {STEP_RENDERERS[step - 1]?.()}
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-app-border bg-app-muted flex items-center justify-between gap-4 sticky bottom-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-app-secondary hover:text-app-text border border-app-border rounded-lg hover:bg-app-surface transition-all">
              Cancel
            </button>
            {step > 1 && (
              <button onClick={prev} className="flex items-center gap-1.5 px-4 py-2 text-sm text-app-secondary border border-app-border rounded-lg hover:bg-app-surface transition-all">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-app-subtle hidden sm:block">Step {step}/{STEPS.length}</span>
            {step < STEPS.length ? (
              <button onClick={next} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[var(--color-btn-primary)] hover:bg-[var(--color-btn-primary-hover)] rounded-lg transition-all shadow-sm">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-status-success hover:bg-status-success/90 rounded-lg transition-all shadow-sm disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Item'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
