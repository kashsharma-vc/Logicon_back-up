import { X, Clock, FileText, User, MapPin, GitCommit } from 'lucide-react'
import { type StockMovement } from '../../inventoryApi'

interface Props {
  movement: StockMovement
  onClose: () => void
}

export function MovementDetailsDrawer({ movement, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-app-surface shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-app-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app-border bg-app-surface-alt/50">
          <div>
            <h2 className="text-lg font-bold text-app-heading">Movement Details</h2>
            <p className="text-sm text-app-secondary font-mono mt-0.5">ID: {movement.id} • Ref: {movement.reference_number || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-app-border rounded-full text-app-subtle transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Status & Type */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-app-surface-alt border border-app-border">
            <div>
              <span className="block text-xs font-medium text-app-secondary mb-1">Type</span>
              <span className="capitalize font-semibold text-app-heading">{movement.movement_type.replace('_', ' ')}</span>
            </div>
            <div className="text-right">
              <span className="block text-xs font-medium text-app-secondary mb-1">Status</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                movement.status === 'completed' ? 'bg-green-100 text-green-700' :
                movement.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {movement.status}
              </span>
            </div>
          </div>

          {/* Quantities */}
          <div>
            <h3 className="text-sm font-semibold text-app-heading mb-3 flex items-center"><FileText className="w-4 h-4 mr-2 text-app-secondary" /> Inventory Change</h3>
            <div className="grid grid-cols-3 gap-2 text-center bg-app-surface-hover rounded-xl p-3 border border-app-border/50">
              <div>
                <div className="text-xs text-app-secondary mb-1">Previous</div>
                <div className="font-mono text-app-heading">{movement.previous_quantity}</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="text-xs text-app-secondary mb-1">Change</div>
                <div className={`font-mono font-bold ${Number(movement.movement_quantity) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(movement.movement_quantity) > 0 ? '+' : ''}{movement.movement_quantity}
                </div>
              </div>
              <div>
                <div className="text-xs text-app-secondary mb-1">Current</div>
                <div className="font-mono text-app-heading">{movement.current_quantity}</div>
              </div>
            </div>
          </div>

          {/* Item Info */}
          <div>
            <h3 className="text-sm font-semibold text-app-heading mb-3 flex items-center"><FileText className="w-4 h-4 mr-2 text-app-secondary" /> Item Information</h3>
            <div className="space-y-3 text-sm border border-app-border rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-app-secondary">Name</span>
                  <span className="font-medium text-app-heading">{movement.item.name}</span>
                </div>
                <div>
                  <span className="block text-xs text-app-secondary">Code</span>
                  <span className="font-mono text-app-heading">{movement.item.code}</span>
                </div>
              </div>
              <div>
                <span className="block text-xs text-app-secondary">Category ID</span>
                <span className="font-medium text-app-heading">{(movement.item.category as any)?.name || movement.item.category}</span>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div>
            <h3 className="text-sm font-semibold text-app-heading mb-3 flex items-center"><MapPin className="w-4 h-4 mr-2 text-app-secondary" /> Location Details</h3>
            <div className="space-y-3 text-sm border border-app-border rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-app-secondary">Scoop</span>
                  <span className="font-medium text-app-heading">{movement.branch || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-app-secondary">Site</span>
                  <span className="font-medium text-app-heading">{movement.site || 'N/A'}</span>
                </div>
              </div>
              <div>
                <span className="block text-xs text-app-secondary">Client</span>
                <span className="font-medium text-app-heading">{movement.client || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Timeline / Audit */}
          <div>
            <h3 className="text-sm font-semibold text-app-heading mb-3 flex items-center"><Clock className="w-4 h-4 mr-2 text-app-secondary" /> Audit Trail</h3>
            <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-2.5 before:w-px before:bg-app-border">
              
              <div className="relative">
                <div className="absolute -left-6 w-5 h-5 bg-app-surface border-2 border-brand-500 rounded-full flex items-center justify-center">
                  <GitCommit className="w-3 h-3 text-brand-600" />
                </div>
                <div className="text-sm font-medium text-app-heading">Movement Created</div>
                <div className="text-xs text-app-secondary mt-1">{new Date(movement.created_at).toLocaleString()}</div>
                <div className="text-xs text-app-subtle mt-1 flex items-center">
                  <User className="w-3 h-3 mr-1" /> System / User ID {movement.created_by || 'Auto'}
                </div>
              </div>

              {movement.remarks && (
                <div className="relative">
                  <div className="absolute -left-6 w-5 h-5 bg-app-surface border-2 border-app-border rounded-full flex items-center justify-center">
                    <FileText className="w-3 h-3 text-app-secondary" />
                  </div>
                  <div className="text-sm font-medium text-app-heading">Remarks</div>
                  <div className="text-sm text-app-text mt-1 p-2 bg-app-surface-hover rounded border border-app-border/50">
                    {movement.remarks}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  )
}
