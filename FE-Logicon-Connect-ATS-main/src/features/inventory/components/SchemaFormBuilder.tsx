import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export type FormFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea'

export interface FormFieldSchema {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[]
}

interface SchemaFormBuilderProps {
  value: FormFieldSchema[]
  onChange: (val: FormFieldSchema[]) => void
}

export function SchemaFormBuilder({ value, onChange }: SchemaFormBuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAddField = () => {
    const newField: FormFieldSchema = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
    }
    onChange([...value, newField])
    setEditingId(newField.id)
  }

  const handleUpdateField = (id: string, updates: Partial<FormFieldSchema>) => {
    onChange(value.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const handleRemoveField = (id: string) => {
    onChange(value.filter((f) => f.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= value.length) return
    const newArr = [...value]
    const temp = newArr[index]!
    newArr[index] = newArr[newIndex]!
    newArr[newIndex] = temp
    onChange(newArr)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-app-heading">Form Fields</h4>
        <Button onClick={handleAddField} className="flex items-center gap-1 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 h-8 text-xs">
          <Plus className="w-4 h-4" /> Add Field
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="text-center py-8 bg-app-surface/50 border border-dashed border-app-border rounded-xl">
          <p className="text-sm text-app-secondary">No fields configured yet. Add fields to define the request form.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-start">
              {/* List Item */}
              <div
                className={`flex-1 bg-app-surface border ${editingId === field.id ? 'border-brand-500' : 'border-app-border'} rounded-lg p-3 cursor-pointer hover:border-brand-300 transition-colors flex items-center justify-between`}
                onClick={() => setEditingId(field.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveField(index, 'up') }} disabled={index === 0} className="text-app-subtle hover:text-app-text disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveField(index, 'down') }} disabled={index === value.length - 1} className="text-app-subtle hover:text-app-text disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-app-heading flex items-center gap-2">
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </div>
                    <div className="text-xs text-app-secondary mt-0.5 font-mono">{field.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="p-1.5 text-app-subtle hover:text-app-heading rounded-md hover:bg-app-bg" onClick={(e) => { e.stopPropagation(); setEditingId(field.id) }}>
                    <Settings className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-1.5 text-app-subtle hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleRemoveField(field.id) }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor Pane (if selected) */}
              {editingId === field.id && (
                <div className="flex-1 bg-app-bg border border-app-border rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-app-secondary mb-1">Field Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                      className="w-full px-3 py-1.5 bg-app-surface border border-app-border rounded text-sm text-app-text"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-app-secondary mb-1">Field Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FormFieldType })}
                        className="w-full px-3 py-1.5 bg-app-surface border border-app-border rounded text-sm text-app-text"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Dropdown (Select)</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-6 gap-2">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                        className="rounded border-app-border"
                      />
                      <span className="text-sm text-app-text">Required</span>
                    </div>
                  </div>

                  {field.type === 'select' && (
                    <div>
                      <label className="block text-xs font-medium text-app-secondary mb-1">Options (Comma-separated)</label>
                      <input
                        type="text"
                        value={field.options?.join(', ') || ''}
                        onChange={(e) => {
                          const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          handleUpdateField(field.id, { options: opts })
                        }}
                        placeholder="e.g. Red, Green, Blue"
                        className="w-full px-3 py-1.5 bg-app-surface border border-app-border rounded text-sm text-app-text"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
