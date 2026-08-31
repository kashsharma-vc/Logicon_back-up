import { X, Package, ShieldCheck, Laptop, Smartphone, Settings, Wrench, Monitor, Armchair, Zap, Droplets, HardHat, Car, Shirt, PenTool, CheckCircle2, AlertTriangle, XCircle, MapPin } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { InventoryItem } from '../inventoryApi'
import { CATEGORY_CONFIGS } from '../categoryFieldConfig'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-status-success/10 text-status-success border-status-success/20' },
  assigned: { label: 'Assigned', className: 'bg-brand-500/10 text-brand-500 border-brand-500/20' },
  maintenance: { label: 'Maintenance', className: 'bg-status-warning/10 text-status-warning border-status-warning/20' },
  disposed: { label: 'Disposed', className: 'bg-app-muted text-app-secondary border-app-border' },
  lost: { label: 'Lost', className: 'bg-status-danger/10 text-status-danger border-status-danger/20' },
  archived: { label: 'Archived', className: 'bg-app-muted text-app-subtle border-app-border' },
}

const STOCK_STATUS_BADGE: Record<string, { icon: typeof Package; color: string; label: string }> = {
  in_stock: { icon: CheckCircle2, color: 'text-status-success', label: 'In Stock' },
  low_stock: { icon: AlertTriangle, color: 'text-status-warning', label: 'Low Stock' },
  out_of_stock: { icon: XCircle, color: 'text-status-danger', label: 'Out of Stock' },
}

const getCategoryIcon = (type: string) => {
  switch (type) {
    case 'ppe': return ShieldCheck
    case 'ppe_shoes': return ShieldCheck
    case 'it_asset': return Laptop
    case 'it_mobile': return Smartphone
    case 'machinery': return Settings
    case 'tools': return Wrench
    case 'office_asset': return Monitor
    case 'furniture': return Armchair
    case 'electrical': return Zap
    case 'plumbing': return Droplets
    case 'construction': return HardHat
    case 'vehicle': return Car
    case 'uniform': return Shirt
    case 'stationery': return PenTool
    default: return Package
  }
}

interface ItemDetailsDrawerProps {
  item: InventoryItem | null
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-5 border-b border-app-border last:border-0">
      <h3 className="text-xs font-semibold text-app-secondary uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, icon: Icon, valueClassName }: { label: string; value?: React.ReactNode; icon?: any; valueClassName?: string }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1.5">
      <span className="text-sm font-medium text-app-secondary w-40 shrink-0 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-app-subtle" />}
        {label}
      </span>
      <span className={cn("text-sm text-app-heading font-medium", valueClassName)}>{value}</span>
    </div>
  )
}

export function ItemDetailsDrawer({ item, onClose }: ItemDetailsDrawerProps) {
  if (!item) return null

  const Icon = getCategoryIcon(item.category_type)
  const statusBadge = STATUS_BADGE[item.item_status] || STATUS_BADGE.available!
  const stockCfg = STOCK_STATUS_BADGE[item.stock_status] || STOCK_STATUS_BADGE.in_stock!

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-app-surface shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-app-border flex items-start justify-between bg-app-muted shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-app-surface border border-app-border shadow-sm flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-brand-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-app-heading">{item.name}</h2>
                <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium border", statusBadge.className)}>
                  {statusBadge.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-app-secondary font-mono font-medium">
                <span>{item.code}</span>
                <span className="text-app-subtle">•</span>
                <span className="capitalize">{item.category_type.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-app-subtle hover:text-app-text hover:bg-app-surface rounded-full transition-colors border border-transparent hover:border-app-border">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          
          <Section title="Overview">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-app-muted border border-app-border flex flex-col items-center justify-center text-center">
                <span className="text-xs font-medium text-app-secondary mb-1">Stock Level</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-app-heading">{item.stock}</span>
                  <span className="text-sm font-medium text-app-subtle">/ {item.reorder_level}</span>
                </div>
                <span className={cn("text-xs font-medium mt-1", stockCfg.color)}>{stockCfg.label}</span>
              </div>
              <div className="p-4 rounded-xl bg-app-muted border border-app-border flex flex-col items-center justify-center text-center">
                <span className="text-xs font-medium text-app-secondary mb-1">Unit Price</span>
                <span className="text-2xl font-bold text-status-success">{item.unit_price ? `₹${item.unit_price}` : '—'}</span>
                <span className="text-xs font-medium text-app-subtle mt-1">{item.unit}</span>
              </div>
            </div>
            
            <Field label="Description" value={item.description} />
            <Field label="Brand / Mfg" value={item.brand} />
            <Field label="Sub-Type" value={item.sub_type} />
            <Field label="Condition" value={item.condition ? <span className="capitalize">{item.condition}</span> : undefined} />
          </Section>

          {(item.warehouse?.name || item.warehouse_code || item.storage_location || item.rack_number) ? (
            <Section title="Storage Location">
              <Field label="Warehouse" value={item.warehouse?.name || item.warehouse_code} icon={MapPin} />
              <Field label="Storage Location" value={item.storage_location} />
              <Field label="Rack / Bin" value={item.rack_number} />
            </Section>
          ) : null}

          {(() => {
            let dynFields = item.dynamic_fields;
            if (typeof dynFields === 'string') {
              try { dynFields = JSON.parse(dynFields); } catch(e) { dynFields = {}; }
            }
            dynFields = dynFields || {};
            
            const config = CATEGORY_CONFIGS[item.category_type];
            
            if (config && config.dynamicFields.length > 0) {
              const hasAnyValue = config.dynamicFields.some(f => {
                let val = dynFields[f.key];
                if (!val && f.key === 'size' && item.name.includes('- Size ')) val = true;
                return val;
              });
              
              if (!hasAnyValue) return null;

              return (
                <Section title={`${config.label} Info`}>
                  {config.dynamicFields.map(f => {
                    let val = dynFields[f.key];
                    if (!val && f.key === 'size' && item.name.includes('- Size ')) {
                      val = item.name.split('- Size ')[1];
                    }
                    return (
                      <Field 
                        key={f.key} 
                        label={f.label} 
                        value={Array.isArray(val) ? val.join(', ') : (val ? String(val) : '')} 
                      />
                    )
                  })}
                </Section>
              )
            }
            
            if (Object.keys(dynFields).length === 0) return null;
            return (
              <Section title="Custom Details">
                {Object.entries(dynFields).map(([k, v]) => (
                  <Field 
                    key={k} 
                    label={k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                    value={Array.isArray(v) ? v.join(', ') : String(v as string)} 
                  />
                ))}
              </Section>
            );
          })()}

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-app-border bg-app-surface flex items-center justify-between shrink-0">
           <span className="text-xs text-app-subtle">
             Added {item.created_at && !isNaN(new Date(item.created_at).getTime()) ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
           </span>
           <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-app-text bg-app-muted hover:bg-app-accent border border-app-border rounded-lg transition-colors">
             Close
           </button>
        </div>
      </div>
    </div>
  )
}
