import React, { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Edit2, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inventoryApi, InventoryRequestType } from '@/features/inventory/inventoryApi'
import { SchemaFormBuilder, FormFieldSchema } from './SchemaFormBuilder'

export function RequestTypesTab() {
  const [requestTypes, setRequestTypes] = useState<InventoryRequestType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingType, setEditingType] = useState<Partial<InventoryRequestType> | null>(null)

  useEffect(() => {
    loadRequestTypes()
  }, [])

  const loadRequestTypes = async () => {
    setLoading(true)
    try {
      const data = await inventoryApi.getRequestTypes()
      setRequestTypes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editingType?.name || !editingType?.code) return alert("Code and Name are required.")
    try {
      if (editingType.id) {
        await inventoryApi.updateRequestType(editingType.id, editingType)
      } else {
        await inventoryApi.createRequestType(editingType)
      }
      setEditingType(null)
      loadRequestTypes()
    } catch (e: any) {
      console.error(e)
      const errorMsg = e.response?.data ? JSON.stringify(e.response.data) : "Failed to save request type."
      alert("Error: " + errorMsg)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this request type?")) return
    try {
      await inventoryApi.deleteRequestType(id)
      loadRequestTypes()
    } catch (e) {
      alert("Failed to delete.")
    }
  }

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></div>

  if (editingType) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-app-heading">{editingType.id ? 'Edit' : 'Create'} Request Type</h3>
            <p className="text-sm text-app-secondary">Configure the properties and dynamic form schema.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingType(null)}>Cancel</Button>
            <Button onClick={handleSave} className="flex items-center gap-2 bg-[var(--color-btn-primary)] hover:bg-[var(--color-btn-primary-hover)] text-white">
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-app-surface border border-app-border rounded-xl p-4">
          <div>
            <label className="block text-sm font-medium text-app-heading mb-1">Code</label>
            <input 
              type="text" 
              value={editingType.code || ''} 
              onChange={e => setEditingType({...editingType, code: e.target.value})}
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-sm"
              placeholder="e.g. IT_ASSET"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-heading mb-1">Name</label>
            <input 
              type="text" 
              value={editingType.name || ''} 
              onChange={e => setEditingType({...editingType, name: e.target.value})}
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-sm"
              placeholder="e.g. IT Asset Request"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-heading mb-1">Workflow Template ID</label>
            <input 
              type="number" 
              value={editingType.workflow_template || ''} 
              onChange={e => setEditingType({...editingType, workflow_template: e.target.value ? Number(e.target.value) : null})}
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-sm"
              placeholder="Enter Template ID from Workflow Engine"
            />
          </div>
          <div className="flex items-center pt-6 gap-2">
            <input 
              type="checkbox" 
              checked={editingType.is_billable || false} 
              onChange={e => setEditingType({...editingType, is_billable: e.target.checked})}
              className="rounded border-app-border w-4 h-4"
            />
            <span className="text-sm font-medium text-app-heading">Is Billable Request</span>
          </div>
        </div>

        <div className="bg-app-surface border border-app-border rounded-xl p-4">
          <SchemaFormBuilder 
            value={editingType.form_schema || []} 
            onChange={(val: FormFieldSchema[]) => setEditingType({...editingType, form_schema: val})}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-app-heading flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-brand-500" /> Request Types</h3>
          <p className="text-xs text-app-secondary">Configure dynamic request types and their form schemas.</p>
        </div>
        <Button onClick={() => setEditingType({ form_schema: [], is_active: true })} className="flex items-center gap-1.5 px-3 py-1.5 bg-app-surface border border-app-border rounded-lg text-sm font-medium text-app-text hover:bg-app-muted">
          <Plus className="w-4 h-4" /> Add Request Type
        </Button>
      </div>

      <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-app-muted text-xs text-app-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Workflow ID</th>
              <th className="px-4 py-3 text-left">Fields</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {requestTypes.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-app-subtle">No request types configured</td></tr>}
            {requestTypes.map(rt => (
              <tr key={rt.id}>
                <td className="px-4 py-3 font-medium text-app-heading">{rt.code}</td>
                <td className="px-4 py-3">{rt.name}</td>
                <td className="px-4 py-3">{rt.workflow_template || <span className="text-app-subtle">None</span>}</td>
                <td className="px-4 py-3">{rt.form_schema?.length || 0} fields</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditingType(rt)} className="p-1.5 text-brand-500 hover:bg-brand-500/10 rounded mr-1">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(rt.id)} className="p-1.5 text-status-danger hover:bg-status-danger/10 rounded">
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
