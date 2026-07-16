import { useState, useEffect } from 'react'
import { 
  Settings, Server, Bell, Shield, Wallet, Plus, Trash2, Save, 
  Loader2, CheckCircle2, AlertTriangle, Building2, UserCircle, 
  FileSpreadsheet, ShieldAlert, Network 
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { inventoryApi } from './inventoryApi'
import { CATEGORY_TYPE_OPTIONS } from './categoryFieldConfig'
import { RequestTypesTab } from './components/RequestTypesTab'
import { PoliciesTab } from './components/PoliciesTab'
import { AssignmentRulesTab } from './components/AssignmentRulesTab'

// ── Tab 1: Settings / Global Configuration ─────────────────────────
function SettingsTab({ settings, onSave }: { settings: any; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState(() => {
    const init = settings ? { ...settings } : {}
    if (Array.isArray(init.storage_locations)) {
      init._storage_locations_text = init.storage_locations.join(', ')
    }
    return init
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form }
    if (payload._storage_locations_text !== undefined) {
      payload.storage_locations = payload._storage_locations_text.split(',').map((s: string) => s.trim()).filter(Boolean)
      delete payload._storage_locations_text
    }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notifications */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-app-heading border-b border-app-border pb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-500" /> Alerts & Thresholds
          </h3>
          <div>
            <label className="block text-xs font-medium text-app-secondary mb-1">Low Stock Alert Threshold (%)</label>
            <input type="number" name="low_stock_alert_threshold_percent" value={form.low_stock_alert_threshold_percent || ''} onChange={handleChange} className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text" />
            <p className="text-[10px] text-app-subtle mt-1">Alerts triggered when stock falls below this percentage of reorder level.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-app-secondary mb-1">Warranty Alert (Days Before Expiry)</label>
            <input type="number" name="warranty_alert_days_before" value={form.warranty_alert_days_before || ''} onChange={handleChange} className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text" />
          </div>
          <div>
            <label className="block text-xs font-medium text-app-secondary mb-1">Admin Emails for Alerts (Comma-separated)</label>
            <input type="text" name="admin_emails_for_alerts" value={form.admin_emails_for_alerts || ''} onChange={handleChange} className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text" />
          </div>
          <div>
            <label className="block text-xs font-medium text-app-secondary mb-1">Storage Locations (Comma-separated)</label>
            <input 
              type="text" 
              name="_storage_locations_text" 
              value={form._storage_locations_text ?? ''} 
              onChange={handleChange} 
              placeholder="e.g. Bay A, Bay B, Shelf 1"
              className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text" 
            />
          </div>
        </div>

        {/* SMTP */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-app-heading border-b border-app-border pb-2 flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-500" /> SMTP Email Configuration
          </h3>
          <div>
            <label className="block text-xs font-medium text-app-secondary mb-1">SMTP Host</label>
            <input type="text" name="smtp_host" value={form.smtp_host || ''} onChange={handleChange} className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-app-secondary mb-1">SMTP Port</label>
              <input type="number" name="smtp_port" value={form.smtp_port || ''} onChange={handleChange} className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text" />
            </div>
            <div className="flex items-center pt-6 gap-2">
              <input type="checkbox" name="smtp_use_tls" checked={form.smtp_use_tls || false} onChange={handleChange} className="rounded border-app-border" />
              <span className="text-sm text-app-text">Use TLS/SSL</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-app-secondary mb-1">SMTP Username</label>
            <input type="text" name="smtp_user" value={form.smtp_user || ''} onChange={handleChange} className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text" />
          </div>
          <div>
            <label className="block text-xs font-medium text-app-secondary mb-1">SMTP Password</label>
            <input type="password" name="smtp_password" value={form.smtp_password || ''} onChange={handleChange} className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-lg text-sm text-app-text" />
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-btn-primary)] hover:bg-[var(--color-btn-primary-hover)] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
        </button>
      </div>
    </form>
  )
}

// ── Tab 2: Billing Rules ──────────────────────────────────────────
function BillingRulesTab() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    inventoryApi.getBillingRules().then(data => {
      setRules(data)
      setLoading(false)
    })
  }, [])

  const addRule = () => {
    setRules(prev => [{ category_type: '', is_billable: false, markup_percentage: 0, notes: '', isNew: true }, ...prev])
  }

  const saveRule = async (index: number) => {
    const r = rules[index]
    if (!r.category_type) return alert("Select a category type")
    try {
      if (r.isNew) {
        const res = await inventoryApi.createBillingRule(r)
        setRules(prev => { const n = [...prev]; n[index] = res; return n })
      } else {
        const res = await inventoryApi.updateBillingRule(r.id, r)
        setRules(prev => { const n = [...prev]; n[index] = res; return n })
      }
    } catch (e) {
      alert("Failed to save rule. A rule for this category may already exist.")
    }
  }

  const deleteRule = async (index: number) => {
    const r = rules[index]
    if (r.id && confirm("Delete this rule?")) {
      await inventoryApi.deleteBillingRule(r.id)
    }
    setRules(prev => prev.filter((_, i) => i !== index))
  }

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2"><Wallet className="w-4 h-4 text-brand-500" /> Client Billing Requirements</h3>
          <p className="text-xs text-app-secondary">Configure which inventory categories are billable to the client and their standard markup percentages.</p>
        </div>
        <button onClick={addRule} className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border rounded-lg text-sm font-medium text-app-text hover:bg-app-muted transition-all">
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-app-muted text-xs text-app-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Category Type</th>
              <th className="px-4 py-3 text-left">Billable?</th>
              <th className="px-4 py-3 text-left">Markup %</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {rules.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-app-subtle">No billing rules configured</td></tr>}
            {rules.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <select 
                    value={r.category_type} 
                    onChange={e => setRules(prev => { const n = [...prev]; n[i].category_type = e.target.value; return n })}
                    className="w-full px-2 py-1.5 bg-app-surface border border-app-border rounded text-sm"
                  >
                    <option value="">Select category...</option>
                    {CATEGORY_TYPE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input type="checkbox" checked={r.is_billable} onChange={e => setRules(prev => { const n = [...prev]; n[i].is_billable = e.target.checked; return n })} className="rounded border-app-border" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" step="0.01" value={r.markup_percentage} onChange={e => setRules(prev => { const n = [...prev]; n[i].markup_percentage = e.target.value; return n })} className="w-20 px-2 py-1.5 bg-app-surface border border-app-border rounded text-sm" />
                </td>
                <td className="px-4 py-2">
                  <input type="text" value={r.notes} onChange={e => setRules(prev => { const n = [...prev]; n[i].notes = e.target.value; return n })} className="w-full px-2 py-1.5 bg-app-surface border border-app-border rounded text-sm" placeholder="Optional notes" />
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => saveRule(i)} className="p-1.5 text-brand-500 hover:bg-brand-500/10 rounded mr-1" title="Save">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteRule(i)} className="p-1.5 text-status-danger hover:bg-status-danger/10 rounded" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab 3: Data & Dropdowns (Categories) ──────────────────────────
function CategoriesTab() {
  const [categories, setCategories] = useState<any[]>([])
  
  useEffect(() => {
    inventoryApi.getCategories().then(setCategories)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-500" /> Inventory Categories</h3>
          <p className="text-xs text-app-secondary">Manage master categories available for inventory items.</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-btn-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-btn-primary-hover)] transition-all">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-app-muted text-xs text-app-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Category Name</th>
              <th className="px-4 py-3 text-left">System Type</th>
              <th className="px-4 py-3 text-right">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {categories.map(c => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-app-heading">{c.name}</td>
                <td className="px-4 py-3 text-app-secondary capitalize">{(c.category_type || 'other').replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-right text-app-subtle text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-app-subtle">No categories configured</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────
export function InventoryMasterSetupPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'billing' | 'categories' | 'request_types' | 'policies' | 'assignment_rules' | 'access'>('request_types')
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    inventoryApi.getSettings()
      .then(res => {
        // Since it's a list response from the viewset because I didn't override default list structure properly,
        // it might return an array of 1 object
        setSettings(Array.isArray(res) ? res[0] : res)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSaveSettings = async (data: any) => {
    try {
      if (data.id) {
        await inventoryApi.updateSettings(data.id, data)
      }
      alert('Settings saved successfully!')
    } catch (e) {
      alert('Failed to save settings.')
    }
  }

  const TABS = [
    { id: 'settings', label: 'Global Settings', icon: Settings },
    { id: 'billing', label: 'Billing Rules', icon: Wallet },
    { id: 'categories', label: 'Data & Categories', icon: Building2 },
    { id: 'request_types', label: 'Request Types', icon: FileSpreadsheet },
    { id: 'policies', label: 'Business Policies', icon: ShieldAlert },
    { id: 'assignment_rules', label: 'Assignment Rules', icon: Network },
    { id: 'access', label: 'Access Control', icon: Shield },
  ] as const

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-app-heading tracking-tight">Inventory Master Setup</h1>
        <p className="text-sm text-app-secondary mt-0.5">Configure system-wide rules, dropdowns, thresholds, and accesses for the inventory module.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    active ? "bg-brand-500/10 text-brand-500" : "text-app-secondary hover:bg-app-muted hover:text-app-text"
                  )}
                >
                  <Icon className={cn("w-4 h-4", active ? "text-brand-500" : "text-app-subtle")} />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <div className="mt-8 p-4 bg-app-muted rounded-xl border border-app-border">
            <h4 className="text-xs font-bold text-app-heading uppercase tracking-wider mb-2 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-brand-500" /> Admin Only
            </h4>
            <p className="text-[10px] text-app-secondary leading-relaxed">
              These settings affect all users. Only roles with <code className="bg-app-surface px-1 py-0.5 rounded text-app-text">CAP.INVENTORY_MANAGE</code> can access this page.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-app-surface border border-app-border rounded-xl shadow-panel p-6">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" /></div>
          ) : (
            <>
              {activeTab === 'settings' && <SettingsTab settings={settings} onSave={handleSaveSettings} />}
              {activeTab === 'billing' && <BillingRulesTab />}
              {activeTab === 'categories' && <CategoriesTab />}
              {activeTab === 'request_types' && <RequestTypesTab />}
              {activeTab === 'policies' && <PoliciesTab />}
              {activeTab === 'assignment_rules' && <AssignmentRulesTab />}
              {activeTab === 'access' && (
                <div className="py-12 text-center text-app-secondary">
                  <UserCircle className="w-12 h-12 mx-auto text-app-subtle mb-3" />
                  <h3 className="text-lg font-medium text-app-heading mb-1">Role Management</h3>
                  <p className="text-sm">Access control uses the centralized Logicon Connect Capabilities system.<br/>Navigate to <strong>Admin &gt; Access Matrix</strong> to configure roles with <code>INVENTORY_READ</code> or <code>INVENTORY_MANAGE</code> capabilities.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
