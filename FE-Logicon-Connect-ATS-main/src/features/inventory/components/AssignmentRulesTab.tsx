import { useState, useEffect } from 'react'
import { Network, Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inventoryApi, AssignmentRule, InventoryCategory } from '@/features/inventory/inventoryApi'

export function AssignmentRulesTab() {
  const [rules, setRules] = useState<AssignmentRule[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      inventoryApi.getAssignmentRules(),
      inventoryApi.getCategories()
    ]).then(([ruleData, catData]) => {
      setRules(ruleData)
      setCategories(catData)
      setLoading(false)
    })
  }, [])

  const handleAdd = () => {
    setRules([{
      can_assign_to_employee: true,
      can_assign_to_site: true,
      can_assign_to_client: false,
      can_assign_to_department: false,
      can_assign_to_project: false,
      category: null,
      category_name: ''
    } as any, ...rules])
  }

  const handleSave = async (index: number) => {
    const r = rules[index]
    try {
      if ((r as any).id) {
        const res = await inventoryApi.updateAssignmentRule((rules[index] as any).id, rules[index]!)
        setRules(prev => { const n = [...prev]; n[index] = res; return n })
      } else {
        const res = await inventoryApi.createAssignmentRule(rules[index]!)
        setRules(prev => { const n = [...prev]; n[index] = res; return n })
      }
    } catch (e) {
      alert("Failed to save assignment rule.")
    }
  }

  const handleDelete = async (index: number) => {
    const r = rules[index]
    if ((r as any).id) {
      if (!confirm("Delete this rule?")) return
      await inventoryApi.deleteAssignmentRule((r as any).id)
    }
    setRules(prev => prev.filter((_, i) => i !== index))
  }

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2"><Network className="w-4 h-4 text-brand-500" /> Assignment Rules</h3>
          <p className="text-xs text-app-secondary">Configure what entities (Employee, Site, Client) each category can be assigned to.</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border rounded-lg text-sm font-medium text-app-text hover:bg-app-muted">
          <Plus className="w-4 h-4" /> Add Rule
        </Button>
      </div>

      <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-app-muted text-xs text-app-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-center">Employee</th>
              <th className="px-4 py-3 text-center">Site</th>
              <th className="px-4 py-3 text-center">Client</th>
              <th className="px-4 py-3 text-center">Project</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {rules.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-app-subtle">No assignment rules configured</td></tr>}
            {rules.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <select 
                    value={(r as any).category || ''} 
                    onChange={e => setRules(prev => { const n = [...prev]; (n[i]! as any).category = e.target.value ? Number(e.target.value) : null; return n })}
                    className="w-full px-2 py-1.5 bg-app-surface border border-app-border rounded text-sm"
                  >
                    <option value="">Global (All Categories)</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={r.can_assign_to_employee} onChange={e => setRules(prev => { const n = [...prev]; n[i]!.can_assign_to_employee = e.target.checked; return n })} className="rounded border-app-border" />
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={r.can_assign_to_site} onChange={e => setRules(prev => { const n = [...prev]; n[i]!.can_assign_to_site = e.target.checked; return n })} className="rounded border-app-border" />
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={r.can_assign_to_client} onChange={e => setRules(prev => { const n = [...prev]; n[i]!.can_assign_to_client = e.target.checked; return n })} className="rounded border-app-border" />
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={r.can_assign_to_project} onChange={e => setRules(prev => { const n = [...prev]; n[i]!.can_assign_to_project = e.target.checked; return n })} className="rounded border-app-border" />
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
