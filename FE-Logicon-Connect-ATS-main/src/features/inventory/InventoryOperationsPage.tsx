import React, { useState, useEffect } from 'react'
import { Plus, List, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { inventoryApi, InventoryRequest, InventoryRequestType } from './inventoryApi'
import { FormFieldSchema } from './components/SchemaFormBuilder'

export function InventoryOperationsPage() {
  const [requests, setRequests] = useState<InventoryRequest[]>([])
  const [requestTypes, setRequestTypes] = useState<InventoryRequestType[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<InventoryRequestType | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      inventoryApi.getRequests(),
      inventoryApi.getRequestTypes()
    ]).then(([reqData, typeData]) => {
      setRequests(reqData)
      setRequestTypes(typeData.filter((t: any) => t.is_active))
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType) return
    setSubmitting(true)
    try {
      const newReq = await inventoryApi.createRequest({
        request_type: selectedType.id,
        form_data: formData
      })
      setRequests([newReq, ...requests])
      setIsModalOpen(false)
      setSelectedType(null)
      setFormData({})
    } catch (e) {
      alert("Failed to submit request.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (reqId: number, action: 'approve'|'reject') => {
    try {
      await inventoryApi.submitAction(reqId, { action, notes: '' })
      const updated = await inventoryApi.getRequests()
      setRequests(updated)
    } catch (e) {
      alert("Failed to process action.")
    }
  }

  if (loading) return <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500" /></div>

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-heading tracking-tight">Inventory Operations</h1>
          <p className="text-sm text-app-secondary mt-0.5">Execute and manage workflow-driven inventory requests.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 bg-[var(--color-btn-primary)] hover:bg-[var(--color-btn-primary-hover)] text-white">
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      <div className="bg-app-surface border border-app-border rounded-xl shadow-panel p-6">
        <h3 className="text-lg font-semibold text-app-heading mb-4 flex items-center gap-2"><List className="w-5 h-5 text-brand-500" /> Active Requests</h3>
        
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-10 text-app-secondary">No active requests.</div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="p-4 border border-app-border rounded-lg flex items-center justify-between hover:border-brand-300 transition-all">
                <div>
                  <div className="font-semibold text-app-heading">{req.request_type_details?.name} <span className="text-xs text-app-subtle font-normal ml-2">REQ-{req.id}</span></div>
                  <div className="text-sm text-app-secondary mt-1">Requested by {req.requested_by_name} • {new Date(req.created_at).toLocaleDateString()}</div>
                  <div className="mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 w-max inline-block">
                    Status: {req.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Dynamic actions based on workflow state would go here. For MVP we'll show basic buttons if pending */}
                  {req.status === 'pending' && (
                    <>
                      <Button variant="secondary" className="text-status-danger border-status-danger/30 hover:bg-status-danger/10 h-8 text-xs" onClick={() => handleAction(req.id, 'reject')}>Reject</Button>
                      <Button className="bg-status-success hover:bg-status-success/90 text-white h-8 text-xs" onClick={() => handleAction(req.id, 'approve')}>Approve</Button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <Button className="bg-brand-500 text-white flex items-center gap-1 h-8 text-xs"><Play className="w-4 h-4" /> Assign Asset</Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dynamic Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-app-surface w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-app-border">
              <h2 className="text-xl font-bold text-app-heading">Create New Request</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {!selectedType ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-app-heading mb-2">Select Request Type:</p>
                  {requestTypes.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setSelectedType(t)}
                      className="w-full text-left p-3 rounded-lg border border-app-border hover:border-brand-500 hover:bg-brand-50 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-app-heading">{t.name}</div>
                        <div className="text-xs text-app-secondary">{t.form_schema.length} fields required</div>
                      </div>
                      <Plus className="w-4 h-4 text-brand-500" />
                    </button>
                  ))}
                  {requestTypes.length === 0 && <p className="text-sm text-app-secondary">No active request types configured in Master Setup.</p>}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button type="button" onClick={() => setSelectedType(null)} className="text-sm text-brand-500 hover:underline">&larr; Back</button>
                    <span className="font-semibold text-app-heading">{selectedType.name}</span>
                  </div>
                  
                  {selectedType.form_schema.map((field: FormFieldSchema) => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-app-heading mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          required={field.required}
                          className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-sm"
                          onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          required={field.required}
                          className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-sm"
                          onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                        >
                          <option value="">Select...</option>
                          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          required={field.required}
                          className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-sm"
                          onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                        />
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end gap-3 pt-4 border-t border-app-border mt-6">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting} className="bg-[var(--color-btn-primary)] text-white">
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
