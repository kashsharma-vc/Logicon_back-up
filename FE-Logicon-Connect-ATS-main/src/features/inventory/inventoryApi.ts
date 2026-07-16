import { api as apiClient } from '@/api/client'

export interface DashboardStats {
  total_items: number
  total_value: number
  low_stock: number
  out_of_stock: number
  assigned: number
  maintenance: number
  total_categories: number
  total_warehouses: number
  warranty_expiring: number
}

export interface InventoryCategory {
  id: number
  name: string
  category_type: string
}

export interface Warehouse {
  id: number
  code: string
  name: string
  location: string
  is_active: boolean
}

export interface InventoryItem {
  id: number
  code: string
  name: string
  description: string
  brand: string
  unit: string
  category: InventoryCategory
  category_type: string
  sub_type: string
  warehouse: Warehouse | null
  warehouse_code: string | null
  category_name: string
  storage_location: string
  rack_number: string
  stock: number
  reorder_level: number
  min_quantity: number
  max_quantity: number | null
  unit_price: number | string
  asset_tag: string
  serial_number: string
  barcode: string
  qr_code: string
  item_status: string
  condition: string
  assigned_to_name: string
  assigned_to_id: string
  assigned_department: string
  assigned_project: string
  assigned_site: string
  assigned_date: string | null
  return_required: boolean
  expected_return_date: string | null
  purchase_date: string | null
  purchase_cost: number | null
  supplier: string
  invoice_number: string
  batch_number: string
  warranty_start: string | null
  warranty_expiry: string | null
  amc_start: string | null
  amc_end: string | null
  amc_vendor: string
  last_maintenance: string | null
  next_maintenance: string | null
  maintenance_cycle_days: number | null
  dynamic_fields: Record<string, any>
  is_active: boolean
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock'
  warranty_status: 'valid' | 'expiring_soon' | 'expired' | null
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: number
  item: InventoryItem
  movement_type: 'incoming' | 'outgoing' | 'transfer' | 'issue' | 'return' | 'adjustment' | 'damage' | 'disposal' | 'audit' | 'consumption' | 'purchase' | 'vendor_return' | 'site_return' | 'branch_return'
  reference_number: string
  reference_module: string
  previous_quantity: number
  movement_quantity: number
  current_quantity: number
  branch: number | null
  site: number | null
  client: number | null
  assigned_employee: number | null
  department: number | null
  project: number | null
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected' | 'failed'
  remarks: string
  meta_data: any
  created_by: number | null
  approved_by: number | null
  created_at: string
  updated_at: string
}

export interface StockMovementStats {
  total_movements_today: number
  incoming_stock: number
  outgoing_stock: number
  internal_transfers: number
  employee_issues: number
  employee_returns: number
  inventory_adjustments: number
  damaged_items: number
  audit_differences: number
  pending_transfers: number
  completed_transfers: number
}

export interface InventoryWarnings {
  low_stock: Array<{ id: number; code: string; name: string; stock: number; reorder_level: number }>
  out_of_stock: Array<{ id: number; code: string; name: string }>
  warranty_expiring: Array<{ id: number; code: string; name: string; warranty_expiry: string }>
}

export const inventoryApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get('/api/inventory/items/dashboard_stats/')
    return res.data
  },

  getItems: async (params?: Record<string, string>): Promise<InventoryItem[]> => {
    const res = await apiClient.get('/api/inventory/items/', { params })
    return Array.isArray(res.data) ? res.data : res.data.results ?? []
  },

  getItem: async (id: number): Promise<InventoryItem> => {
    const res = await apiClient.get(`/api/inventory/items/${id}/`)
    return res.data
  },

  createItem: async (data: Record<string, any>): Promise<InventoryItem> => {
    const res = await apiClient.post('/api/inventory/items/', data)
    return res.data
  },

  createUniformKit: async (data: any) => {
    const res = await apiClient.post('/api/inventory/uniform-kits/', data)
    return res.data
  },


  updateItem: async (id: number, data: Record<string, any>): Promise<InventoryItem> => {
    const res = await apiClient.patch(`/api/inventory/items/${id}/`, data)
    return res.data
  },

  deleteItem: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/inventory/items/${id}/`)
  },

  getItemHistory: async (id: number) => {
    const res = await apiClient.get(`/api/inventory/items/${id}/history/`)
    return res.data
  },

  getWarnings: async (): Promise<InventoryWarnings> => {
    const res = await apiClient.get('/api/inventory/items/warnings/')
    return res.data
  },

  getCategories: async (): Promise<InventoryCategory[]> => {
    const res = await apiClient.get('/api/inventory/categories/')
    return Array.isArray(res.data) ? res.data : res.data.results ?? []
  },

  createCategory: async (data: Record<string, any>): Promise<InventoryCategory> => {
    const res = await apiClient.post('/api/inventory/categories/', data)
    return res.data
  },

  getWarehouses: async (): Promise<Warehouse[]> => {
    const res = await apiClient.get('/api/inventory/warehouses/')
    return Array.isArray(res.data) ? res.data : res.data.results ?? []
  },

  // Settings
  getSettings: async () => {
    const res = await apiClient.get('/api/inventory/settings/')
    return res.data
  },
  
  updateSettings: async (id: number, data: Record<string, any>) => {
    const res = await apiClient.patch(`/api/inventory/settings/${id}/`, data)
    return res.data
  },

  // Billing Rules
  getBillingRules: async () => {
    const res = await apiClient.get('/api/inventory/billing-rules/')
    return Array.isArray(res.data) ? res.data : res.data.results ?? []
  },
  
  createBillingRule: async (data: Record<string, any>) => {
    const res = await apiClient.post('/api/inventory/billing-rules/', data)
    return res.data
  },
  
  updateBillingRule: async (id: number, data: Record<string, any>) => {
    const res = await apiClient.patch(`/api/inventory/billing-rules/${id}/`, data)
    return res.data
  },
  
  deleteBillingRule: async (id: number) => {
    await apiClient.delete(`/api/inventory/billing-rules/${id}/`)
  },

  // Stock Movements
  getMovements: async (params?: Record<string, any>) => {
    const res = await apiClient.get('/api/inventory/stock-movements/', { params })
    return Array.isArray(res.data) ? res.data : res.data.results ?? []
  },

  getMovementStats: async (): Promise<StockMovementStats> => {
    const res = await apiClient.get('/api/inventory/stock-movements/dashboard_stats/')
    return res.data
  },

  getMovement: async (id: number): Promise<StockMovement> => {
    const res = await apiClient.get(`/api/inventory/stock-movements/${id}/`)
    return res.data
  },

  // ── New Workflow Configs
  getRequestTypes: async () => {
    const res = await apiClient.get('/api/inventory/request-types/')
    return Array.isArray(res.data) ? res.data : res.data.results ?? []
  },
  createRequestType: async (payload: Partial<InventoryRequestType>) => {
    const res = await apiClient.post('/api/inventory/request-types/', payload)
    return res.data
  },
  updateRequestType: async (id: number, payload: Partial<InventoryRequestType>) => {
    const res = await apiClient.patch(`/api/inventory/request-types/${id}/`, payload)
    return res.data
  },
  deleteRequestType: async (id: number) => {
    await apiClient.delete(`/api/inventory/request-types/${id}/`)
  },

  getPolicies: async () => {
    const res = await apiClient.get('/api/inventory/policies/')
    return Array.isArray(res.data) ? res.data : res.data.results ?? []
  },
  createPolicy: async (payload: Partial<InventoryPolicy>) => {
    const res = await apiClient.post('/api/inventory/policies/', payload)
    return res.data
  },
  updatePolicy: async (id: number, payload: Partial<InventoryPolicy>) => {
    const res = await apiClient.patch(`/api/inventory/policies/${id}/`, payload)
    return res.data
  },
  deletePolicy: async (id: number) => {
    await apiClient.delete(`/api/inventory/policies/${id}/`)
  },

  getAssignmentRules: async () => {
    const res = await apiClient.get('/api/inventory/assignment-rules/')
    return Array.isArray(res.data) ? res.data : res.data.results ?? []
  },
  createAssignmentRule: async (payload: Partial<AssignmentRule>) => {
    const res = await apiClient.post('/api/inventory/assignment-rules/', payload)
    return res.data
  },
  updateAssignmentRule: async (id: number, payload: Partial<AssignmentRule>) => {
    const res = await apiClient.patch(`/api/inventory/assignment-rules/${id}/`, payload)
    return res.data
  },
  deleteAssignmentRule: async (id: number) => {
    await apiClient.delete(`/api/inventory/assignment-rules/${id}/`)
  },

  // Requests Execution
  getRequests: async () => {
    const res = await apiClient.get('/api/inventory/requests/')
    return Array.isArray(res.data) ? res.data : res.data.results ?? []
  },
  createRequest: async (payload: Partial<InventoryRequest>) => {
    const res = await apiClient.post('/api/inventory/requests/', payload)
    return res.data
  },
  getWorkflowState: async (id: number) => {
    const res = await apiClient.get(`/api/inventory/requests/${id}/workflow_state/`)
    return res.data
  },
  submitAction: async (id: number, payload: { action: 'approve' | 'reject'; notes?: string }) => {
    const res = await apiClient.post(`/api/inventory/requests/${id}/action/`, payload)
    return res.data
  }
}

// ─── Interfaces ────────────────────────────────────────

export interface InventoryRequestType {
  id: number
  code: string
  name: string
  workflow_template: number | null
  form_schema: any[]
  is_billable: boolean
  is_active: boolean
}

export interface InventoryPolicy {
  id: number
  category: number | null
  category_name: string
  approval_required: boolean
  warranty_tracking: boolean
  return_required: boolean
  replacement_allowed: boolean
}

export interface AssignmentRule {
  id: number
  category: number | null
  category_name: string
  can_assign_to_employee: boolean
  can_assign_to_site: boolean
  can_assign_to_client: boolean
  can_assign_to_department: boolean
  can_assign_to_project: boolean
}

export interface InventoryRequest {
  id: number
  request_type: number
  request_type_details: InventoryRequestType
  requested_by: number
  requested_by_name: string
  item: number | null
  item_code: string | null
  item_name: string | null
  form_data: Record<string, any>
  workflow_instance: number | null
  status: string
  notes: string
  created_at: string
  updated_at: string
}

