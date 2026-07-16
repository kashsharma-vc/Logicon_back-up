import { useState, useEffect } from 'react'
import { ShieldAlert, Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inventoryApi, InventoryPolicy, InventoryCategory } from '@/features/inventory/inventoryApi'

export function PoliciesTab() {
  const [policies, setPolicies] = useState<InventoryPolicy[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      inventoryApi.getPolicies(),
      inventoryApi.getCategories()
    ]).then(([polData, catData]) => {
      setPolicies(polData)
      setCategories(catData)
      setLoading(false)
    })
  }, [])

  const handleAdd = () => {
    setPolicies([{
      approval_required: true,
      warranty_tracking: false,
      return_required: false,
      replacement_allowed: true,
      category: null,
      category_name: ''
    } as any, ...policies])
  }

  const handleSave = async (index: number) => {
    const p = policies[index]!
    try {
      if ((p as any).id) {
        const res = await inventoryApi.updatePolicy((p as any).id, p)
        setPolicies(prev => { const n = [...prev]; n[index] = res; return n })
      } else {
        const res = await inventoryApi.createPolicy(p)
        setPolicies(prev => { const n = [...prev]; n[index] = res; return n })
      }
    } catch (e) {
      alert("Failed to save policy.")
    }
  }

  const handleDelete = async (index: number) => {
    const p = policies[index]
    if ((p as any).id) {
      if (!confirm("Delete this policy?")) return
      await inventoryApi.deletePolicy((p as any).id)
    }
    setPolicies(prev => prev.filter((_, i) => i !== index))
  }

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-brand-500" /> Business Policies</h3>
          <p className="text-xs text-app-secondary">Configure rules like approval requirements or warranty tracking for inventory categories.</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border rounded-lg text-sm font-medium text-app-text hover:bg-app-muted">
          <Plus className="w-4 h-4" /> Add Policy
        </Button>
      </div>

      <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-app-muted text-xs text-app-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-center">Approval Reqd</th>
              <th className="px-4 py-3 text-center">Track Warranty</th>
              <th className="px-4 py-3 text-center">Return Reqd</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {policies.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-app-subtle">No policies configured</td></tr>}
            {policies.map((p, i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <select 
                    value={(p as any).category || ''} 
                    onChange={e => setPolicies(prev => { const n = [...prev]; (n[i]! as any).category = e.target.value ? Number(e.target.value) : null; return n })}
                    className="w-full px-2 py-1.5 bg-app-surface border border-app-border rounded text-sm"
                  >
                    <option value="">Global (All Categories)</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={p.approval_required} onChange={e => setPolicies(prev => { const n = [...prev]; n[i]!.approval_required = e.target.checked; return n })} className="rounded border-app-border" />
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={p.warranty_tracking} onChange={e => setPolicies(prev => { const n = [...prev]; n[i]!.warranty_tracking = e.target.checked; return n })} className="rounded border-app-border" />
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={p.return_required} onChange={e => setPolicies(prev => { const n = [...prev]; n[i]!.return_required = e.target.checked; return n })} className="rounded border-app-border" />
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleSave(i)} className="p-1.5 text-brand-500 hover:bg-brand-500/10 rounded mr-1" title="Save">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(i)} className="p-1.5 text-status-danger hover:bg-status-danger/10 rounded" title="Delete">
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
