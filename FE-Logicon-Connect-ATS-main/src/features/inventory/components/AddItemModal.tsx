import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { inventoryApi, InventoryCategory, Warehouse } from "../inventoryApi"

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddItemModal({ isOpen, onClose, onSuccess }: AddItemModalProps) {
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    brand: '',
    unit: 'PCS',
    category_id: '',
    warehouse_id: '',
    stock: 0,
    reorder_level: 0,
    unit_price: 0
  })

  useEffect(() => {
    if (isOpen) {
      inventoryApi.getCategories().then(setCategories)
      inventoryApi.getWarehouses().then(setWarehouses)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await inventoryApi.createItem({
        ...formData,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null,
      })
      onSuccess()
    } catch (err) {
      console.error("Failed to create item", err)
      alert("Failed to create item")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-app-surface rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-app-border">
        <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-muted">
          <h2 className="text-lg font-semibold text-app-heading">Add New Inventory Item</h2>
          <button onClick={onClose} className="p-2 text-app-subtle hover:text-app-text hover:bg-app-surface rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-app-text">Item Code <span className="text-status-danger">*</span></label>
                <input 
                  required
                  type="text" 
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm text-app-text"
                  placeholder="e.g. ITM-1006"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-app-text">Item Name <span className="text-status-danger">*</span></label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm text-app-text"
                  placeholder="e.g. Microfiber Cloth Pack"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-app-text">Category <span className="text-status-danger">*</span></label>
                <select 
                  required
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                  className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm text-app-text"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-app-text">Brand</label>
                <input 
                  type="text" 
                  value={formData.brand}
                  onChange={e => setFormData({...formData, brand: e.target.value})}
                  className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm text-app-text"
                  placeholder="e.g. CleanPro"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-app-text">Unit of Measurement</label>
                <input 
                  type="text" 
                  value={formData.unit}
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                  className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm text-app-text"
                  placeholder="e.g. PACK, PCS, L"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-app-text">Primary Warehouse</label>
                <select 
                  value={formData.warehouse_id}
                  onChange={e => setFormData({...formData, warehouse_id: e.target.value})}
                  className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm text-app-text"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-app-border">
              <div className="space-y-2">
                <label className="text-sm font-medium text-app-text">Initial Stock</label>
                <input 
                  type="number" 
                  value={formData.stock}
                  onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm text-app-text"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-app-text">Reorder Level</label>
                <input 
                  type="number" 
                  value={formData.reorder_level}
                  onChange={e => setFormData({...formData, reorder_level: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm text-app-text"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-app-text">Unit Price (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.unit_price}
                  onChange={e => setFormData({...formData, unit_price: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm text-app-text"
                />
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-app-border flex justify-end gap-3 bg-app-muted">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-app-text bg-app-surface border border-app-border rounded-lg shadow-sm hover:bg-app-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-btn-primary)] border border-transparent rounded-lg shadow-sm hover:bg-[var(--color-btn-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
            >
              Create Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
