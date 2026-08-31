import { type StockMovement } from '../../inventoryApi'
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, FileText, Package } from 'lucide-react'

interface Props {
  movements: StockMovement[]
  onRowClick: (movement: StockMovement) => void
}

export function MovementsTable({ movements, onRowClick }: Props) {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'incoming': case 'purchase': case 'vendor_return':
        return 'bg-green-100 text-green-700'
      case 'outgoing': case 'consumption': case 'damage': case 'disposal':
        return 'bg-red-100 text-red-700'
      case 'transfer': case 'issue': case 'return':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-orange-100 text-orange-700'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'incoming': case 'purchase': case 'vendor_return':
        return <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
      case 'outgoing': case 'consumption': case 'damage': case 'disposal':
        return <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
      case 'transfer': case 'issue': case 'return':
        return <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
      default:
        return <FileText className="w-3.5 h-3.5 mr-1" />
    }
  }

  return (
    <div className="min-w-full inline-block align-middle">
      <table className="min-w-full divide-y divide-app-border">
        <thead className="bg-app-surface-alt/50 sticky top-0 z-10 backdrop-blur-sm">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-app-secondary uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-app-secondary uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-app-secondary uppercase tracking-wider">Item</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-app-secondary uppercase tracking-wider">Reference</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-app-secondary uppercase tracking-wider">Qty Change</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-app-secondary uppercase tracking-wider">Current Stock</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-app-secondary uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border bg-app-surface">
          {movements.map((movement) => (
            <tr 
              key={movement.id} 
              onClick={() => onRowClick(movement)}
              className="hover:bg-app-surface-hover cursor-pointer transition-colors group"
            >
              <td className="px-4 py-4 whitespace-nowrap text-sm text-app-secondary">
                {new Date(movement.created_at).toLocaleDateString()}
                <div className="text-xs text-app-subtle mt-0.5">{new Date(movement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getBadgeColor(movement.movement_type)}`}>
                  {getTypeIcon(movement.movement_type)}
                  {movement.movement_type.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8 bg-app-border/30 rounded flex items-center justify-center text-app-secondary">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-app-heading">{movement.item.name}</div>
                    <div className="text-xs text-app-secondary font-mono">{movement.item.code}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-app-heading">{movement.reference_number || '-'}</div>
                <div className="text-xs text-app-subtle capitalize">{movement.reference_module || 'System'}</div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                <span className={Number(movement.movement_quantity) > 0 ? 'text-green-600' : 'text-red-600'}>
                  {Number(movement.movement_quantity) > 0 ? '+' : ''}{movement.movement_quantity}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-app-heading font-medium">
                {movement.current_quantity}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  movement.status === 'completed' ? 'bg-green-100 text-green-700' :
                  movement.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  movement.status === 'cancelled' || movement.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {movement.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
