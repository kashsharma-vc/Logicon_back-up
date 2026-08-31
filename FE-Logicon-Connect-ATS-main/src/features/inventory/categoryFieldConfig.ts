// Enterprise Dynamic Field Configuration
// Maps category_type + sub_type to specific fields shown in the wizard

export type FieldType = 
  | 'text' | 'number' | 'textarea' | 'select' | 'multi-select' 
  | 'date' | 'boolean' | 'email' | 'phone' | 'currency' | 'file'

export interface DynamicField {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: string[]
  required?: boolean
  help?: string
  condition?: { field: string; value: any } // Show only when another field has a value
  group?: string // Visual grouping
}

export interface CategoryConfig {
  label: string
  icon: string
  color: string
  subTypes: string[]
  dynamicFields: DynamicField[]
}



export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  ppe: {
    label: 'PPE',
    icon: 'ShieldCheck',
    color: 'bg-status-danger/10 text-status-danger',
    subTypes: ['Helmet', 'Safety Shoes', 'Gloves', 'Safety Jacket', 'Raincoat', 'Goggles', 'Face Shield', 'Ear Protection', 'Respirator'],
    dynamicFields: [
      { key: 'is_standard', label: 'IS Standard', type: 'text', group: 'Compliance', placeholder: 'e.g. IS 2925:1984' },
      { key: 'manufacturing_date', label: 'Manufacturing Date', type: 'date', group: 'Compliance' },
      { key: 'expiry_date', label: 'Expiry / Life Span Date', type: 'date', group: 'Compliance', required: true },
      { key: 'inspection_frequency', label: 'Inspection Frequency', type: 'select', group: 'Maintenance', options: ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually'] },
      { key: 'replacement_cycle', label: 'Replacement Cycle', type: 'select', group: 'Maintenance', options: ['3 Months', '6 Months', '1 Year', '2 Years', '3 Years'] },
    ],
  },

  uniform: {
    label: 'Uniform',
    icon: 'Shirt',
    color: 'bg-status-attention/10 text-status-attention',
    subTypes: ['T-Shirt', 'Shirt', 'Pant', 'Jacket', 'Cap', 'Shoes', 'Socks', 'Raincoat', 'Safety Vest'],
    dynamicFields: [
      { key: 'gender', label: 'Gender', type: 'select', group: 'Specifications', options: ['Male', 'Female', 'Unisex'], required: true },
      { key: 'size', label: 'Size', type: 'select', group: 'Specifications', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'], required: true },
      { key: 'color', label: 'Color', type: 'text', group: 'Specifications', placeholder: 'e.g. Navy Blue' },
      { key: 'fabric', label: 'Fabric / Material', type: 'text', group: 'Specifications', placeholder: 'e.g. Polyester 65%, Cotton 35%' },
      { key: 'purpose', label: 'Purpose', type: 'select', group: 'Usage', options: ['Office', 'Site', 'Visitor', 'Supervisor', 'Manager', 'Security'] },
      { key: 'laundry_cycle', label: 'Laundry Cycle', type: 'select', group: 'Usage', options: ['Weekly', 'Fortnightly', 'Monthly'] },
      { key: 'replacement_frequency', label: 'Replacement Frequency', type: 'select', group: 'Usage', options: ['6 Months', '1 Year', '2 Years'] },
    ],
  },

  ppe_shoes: {
    label: 'Safety Shoes',
    icon: 'ShieldCheck',
    color: 'bg-status-danger/10 text-status-danger',
    subTypes: ['Safety Shoes'],
    dynamicFields: [
      { key: 'shoe_size', label: 'Size (Indian)', type: 'select', group: 'Specifications', options: ['5', '6', '7', '8', '9', '10', '11', '12'], required: true },
      { key: 'steel_toe', label: 'Steel Toe Cap', type: 'boolean', group: 'Safety Features' },
      { key: 'electrical_protection', label: 'Electrical Protection', type: 'boolean', group: 'Safety Features' },
      { key: 'slip_resistant', label: 'Slip Resistant', type: 'boolean', group: 'Safety Features' },
      { key: 'ankle_protection', label: 'Ankle Protection', type: 'boolean', group: 'Safety Features' },
      { key: 'purpose', label: 'Purpose', type: 'select', group: 'Usage', options: ['Site', 'Warehouse', 'Factory', 'Chemical Plant'] },
      { key: 'warranty_period', label: 'Warranty Period', type: 'select', group: 'Warranty', options: ['3 Months', '6 Months', '1 Year'] },
    ],
  },

  it_asset: {
    label: 'IT Assets',
    icon: 'Laptop',
    color: 'bg-brand-500/10 text-brand-500',
    subTypes: ['Laptop', 'Desktop', 'Tablet', 'Mobile', 'Printer', 'Scanner', 'Router', 'Monitor', 'Keyboard', 'Mouse'],
    dynamicFields: [
      { key: 'model', label: 'Model Number', type: 'text', group: 'Hardware', required: true },
      { key: 'processor', label: 'Processor / CPU', type: 'text', group: 'Hardware', placeholder: 'e.g. Intel i7 12th Gen' },
      { key: 'ram_gb', label: 'RAM (GB)', type: 'select', group: 'Hardware', options: ['4', '8', '16', '32', '64', '128'] },
      { key: 'storage_gb', label: 'Storage (GB)', type: 'select', group: 'Hardware', options: ['128', '256', '512', '1024', '2048'] },
      { key: 'storage_type', label: 'Storage Type', type: 'select', group: 'Hardware', options: ['SSD', 'HDD', 'NVMe SSD', 'eMMC'] },
      { key: 'operating_system', label: 'Operating System', type: 'select', group: 'Software', options: ['Windows 11 Pro', 'Windows 10 Pro', 'macOS', 'Ubuntu', 'Chrome OS', 'iOS', 'Android'] },
      { key: 'ip_address', label: 'IP Address', type: 'text', group: 'Network', placeholder: '192.168.x.x' },
      { key: 'mac_address', label: 'MAC Address', type: 'text', group: 'Network', placeholder: 'XX:XX:XX:XX:XX:XX' },
      { key: 'encryption_enabled', label: 'Encryption Enabled', type: 'boolean', group: 'Security' },
      { key: 'antivirus', label: 'Antivirus Installed', type: 'text', group: 'Security', placeholder: 'e.g. McAfee, Norton' },
      { key: 'office_installed', label: 'Office Suite Installed', type: 'boolean', group: 'Software' },
      { key: 'accessories', label: 'Included Accessories', type: 'multi-select', group: 'Accessories', options: ['Dock', 'Bag', 'Mouse', 'Keyboard', 'Charger', 'Monitor', 'Headset', 'USB Hub'] },
    ],
  },

  it_mobile: {
    label: 'Mobile',
    icon: 'Smartphone',
    color: 'bg-brand-500/10 text-brand-500',
    subTypes: ['Mobile'],
    dynamicFields: [
      { key: 'imei_1', label: 'IMEI 1', type: 'text', group: 'Device Info', required: true },
      { key: 'imei_2', label: 'IMEI 2', type: 'text', group: 'Device Info' },
      { key: 'phone_number', label: 'Phone Number', type: 'phone', group: 'SIM Info' },
      { key: 'sim_number', label: 'SIM Number', type: 'text', group: 'SIM Info' },
      { key: 'carrier', label: 'Network Carrier', type: 'select', group: 'SIM Info', options: ['Jio', 'Airtel', 'Vi', 'BSNL', 'Other'] },
      { key: 'ram_gb', label: 'RAM (GB)', type: 'select', group: 'Hardware', options: ['2', '4', '6', '8', '12', '16'] },
      { key: 'storage_gb', label: 'Storage (GB)', type: 'select', group: 'Hardware', options: ['32', '64', '128', '256', '512'] },
      { key: 'battery_health', label: 'Battery Health (%)', type: 'number', group: 'Hardware' },
      { key: 'operating_system', label: 'Operating System', type: 'select', group: 'Software', options: ['iOS', 'Android', 'KaiOS'] },
    ],
  },

  machinery: {
    label: 'Machinery',
    icon: 'Settings',
    color: 'bg-status-warning/10 text-status-warning',
    subTypes: ['Excavator', 'Crane', 'Generator', 'Concrete Mixer', 'Drill Machine', 'Compressor', 'Welding Machine', 'Bulldozer', 'Forklift', 'Loader'],
    dynamicFields: [
      { key: 'manufacturer', label: 'Manufacturer', type: 'text', group: 'Machine Details', required: true },
      { key: 'model', label: 'Model', type: 'text', group: 'Machine Details' },
      { key: 'engine_number', label: 'Engine Number', type: 'text', group: 'Machine Details' },
      { key: 'registration_number', label: 'Registration Number', type: 'text', group: 'Machine Details' },
      { key: 'fuel_type', label: 'Fuel Type', type: 'select', group: 'Machine Details', options: ['Diesel', 'Petrol', 'Electric', 'LPG', 'CNG', 'Hydraulic'] },
      { key: 'capacity', label: 'Capacity / Power', type: 'text', group: 'Machine Details', placeholder: 'e.g. 25 Ton, 100 KVA' },
      { key: 'hours_used', label: 'Hours Used (Current)', type: 'number', group: 'Usage' },
      { key: 'operator', label: 'Operator Name', type: 'text', group: 'Usage' },
      { key: 'current_site', label: 'Current Site', type: 'text', group: 'Usage' },
      { key: 'insurance_number', label: 'Insurance Policy Number', type: 'text', group: 'Insurance' },
      { key: 'insurance_expiry', label: 'Insurance Expiry', type: 'date', group: 'Insurance' },
      { key: 'inspection_due', label: 'Statutory Inspection Due', type: 'date', group: 'Compliance' },
      { key: 'pollution_cert_expiry', label: 'Pollution Certificate Expiry', type: 'date', group: 'Compliance' },
    ],
  },

  tools: {
    label: 'Tools',
    icon: 'Wrench',
    color: 'bg-status-info/10 text-status-info',
    subTypes: ['Hammer', 'Spanner', 'Screwdriver', 'Measuring Tape', 'Cutting Machine', 'Grinder', 'Ladder', 'Level', 'Chisel', 'Drill'],
    dynamicFields: [
      { key: 'tool_size', label: 'Size / Specification', type: 'text', group: 'Details', placeholder: 'e.g. 8mm, 10 inch' },
      { key: 'power_source', label: 'Power Source', type: 'select', group: 'Details', options: ['Manual', 'Electric', 'Battery', 'Pneumatic', 'Hydraulic'] },
      { key: 'calibration_due', label: 'Calibration Due Date', type: 'date', group: 'Compliance' },
    ],
  },

  office_asset: {
    label: 'Office Assets',
    icon: 'Monitor',
    color: 'bg-status-success/10 text-status-success',
    subTypes: ['Chair', 'Table', 'Cabinet', 'Projector', 'Air Conditioner', 'Whiteboard', 'Printer', 'UPS', 'Phone'],
    dynamicFields: [
      { key: 'model', label: 'Model', type: 'text', group: 'Details' },
      { key: 'color', label: 'Color', type: 'text', group: 'Details' },
      { key: 'room', label: 'Room / Cabin', type: 'text', group: 'Location' },
      { key: 'floor', label: 'Floor', type: 'text', group: 'Location' },
      { key: 'building', label: 'Building', type: 'text', group: 'Location' },
      { key: 'department', label: 'Assigned Department', type: 'text', group: 'Assignment' },
    ],
  },

  furniture: {
    label: 'Furniture',
    icon: 'Armchair',
    color: 'bg-status-hired/10 text-status-hired',
    subTypes: ['Desk', 'Chair', 'Cabinet', 'Shelving', 'Sofa', 'Conference Table', 'Reception Desk'],
    dynamicFields: [
      { key: 'material', label: 'Material', type: 'select', group: 'Specifications', options: ['Wood', 'Metal', 'Plastic', 'Glass', 'Fabric', 'Leather', 'Mixed'] },
      { key: 'dimensions', label: 'Dimensions (L×W×H)', type: 'text', group: 'Specifications', placeholder: 'e.g. 120cm × 60cm × 75cm' },
      { key: 'color', label: 'Color / Finish', type: 'text', group: 'Specifications' },
      { key: 'room', label: 'Room', type: 'text', group: 'Location' },
      { key: 'floor', label: 'Floor', type: 'text', group: 'Location' },
      { key: 'building', label: 'Building', type: 'text', group: 'Location' },
      { key: 'department', label: 'Assigned Department', type: 'text', group: 'Assignment' },
    ],
  },

  electrical: {
    label: 'Electrical Materials',
    icon: 'Zap',
    color: 'bg-yellow-500/10 text-yellow-600',
    subTypes: ['Cable', 'Wire', 'Switch', 'MCB', 'DB Box', 'Conduit', 'Socket', 'Light Fixture', 'Circuit Breaker'],
    dynamicFields: [
      { key: 'voltage_rating', label: 'Voltage Rating', type: 'text', group: 'Specifications', placeholder: 'e.g. 240V, 415V' },
      { key: 'current_rating', label: 'Current Rating (Amps)', type: 'text', group: 'Specifications', placeholder: 'e.g. 16A, 32A' },
      { key: 'cable_gauge', label: 'Cable Gauge / Size', type: 'text', group: 'Specifications', placeholder: 'e.g. 2.5 sq.mm' },
      { key: 'is_standard', label: 'IS Standard', type: 'text', group: 'Compliance', placeholder: 'e.g. IS 694' },
      { key: 'batch_number', label: 'Batch/Lot Number', type: 'text', group: 'Batch Info' },
      { key: 'expiry_date', label: 'Expiry Date', type: 'date', group: 'Batch Info' },
    ],
  },

  plumbing: {
    label: 'Plumbing Materials',
    icon: 'Droplets',
    color: 'bg-cyan-500/10 text-cyan-600',
    subTypes: ['PVC Pipe', 'GI Pipe', 'Elbow', 'Valve', 'Tap', 'Tank', 'Fitting', 'Coupling'],
    dynamicFields: [
      { key: 'pipe_diameter', label: 'Diameter (mm/inches)', type: 'text', group: 'Specifications', placeholder: 'e.g. 20mm, 3/4 inch' },
      { key: 'pipe_length', label: 'Length per unit (m)', type: 'number', group: 'Specifications' },
      { key: 'pressure_rating', label: 'Pressure Rating', type: 'text', group: 'Specifications', placeholder: 'e.g. PN6, PN10' },
      { key: 'material_grade', label: 'Material Grade', type: 'text', group: 'Specifications', placeholder: 'e.g. Class B, Schedule 40' },
      { key: 'is_standard', label: 'IS Standard', type: 'text', group: 'Compliance' },
    ],
  },

  construction: {
    label: 'Construction Materials',
    icon: 'HardHat',
    color: 'bg-orange-500/10 text-orange-600',
    subTypes: ['Cement', 'Sand', 'Bricks', 'Steel', 'Aggregate', 'Tiles', 'Paint', 'Wood', 'Glass', 'TMT Bar'],
    dynamicFields: [
      { key: 'grade', label: 'Grade / Quality', type: 'text', group: 'Specifications', placeholder: 'e.g. M30, Fe500, OPC 53' },
      { key: 'batch_number', label: 'Batch Number', type: 'text', group: 'Batch Info' },
      { key: 'expiry_date', label: 'Expiry / Best Before', type: 'date', group: 'Batch Info' },
      { key: 'is_standard', label: 'IS Standard', type: 'text', group: 'Compliance', placeholder: 'e.g. IS 456, IS 1786' },
      { key: 'lab_test_report', label: 'Lab Test Report No.', type: 'text', group: 'Quality Control' },
      { key: 'test_date', label: 'Last Test Date', type: 'date', group: 'Quality Control' },
    ],
  },

  vehicle: {
    label: 'Vehicles',
    icon: 'Car',
    color: 'bg-indigo-500/10 text-indigo-600',
    subTypes: ['Car', 'SUV', 'Truck', 'Van', 'Bus', 'Motorcycle', 'Tractor'],
    dynamicFields: [
      { key: 'registration_number', label: 'Registration Number', type: 'text', group: 'Vehicle Details', required: true },
      { key: 'chassis_number', label: 'Chassis Number', type: 'text', group: 'Vehicle Details' },
      { key: 'engine_number', label: 'Engine Number', type: 'text', group: 'Vehicle Details' },
      { key: 'fuel_type', label: 'Fuel Type', type: 'select', group: 'Vehicle Details', options: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'] },
      { key: 'seating_capacity', label: 'Seating Capacity', type: 'number', group: 'Vehicle Details' },
      { key: 'odometer', label: 'Current Odometer (km)', type: 'number', group: 'Usage' },
      { key: 'driver', label: 'Assigned Driver', type: 'text', group: 'Usage' },
      { key: 'insurance_number', label: 'Insurance Policy No.', type: 'text', group: 'Insurance' },
      { key: 'insurance_expiry', label: 'Insurance Expiry', type: 'date', group: 'Insurance' },
      { key: 'rc_expiry', label: 'RC / Fitness Expiry', type: 'date', group: 'Compliance' },
      { key: 'pollution_cert_expiry', label: 'PUC Certificate Expiry', type: 'date', group: 'Compliance' },
    ],
  },

  stationery: {
    label: 'Stationery',
    icon: 'PenTool',
    color: 'bg-pink-500/10 text-pink-600',
    subTypes: ['Pen', 'Notebook', 'Stapler', 'Printer Paper', 'Envelope', 'Folder', 'Whiteboard Marker'],
    dynamicFields: [
      { key: 'pack_size', label: 'Pack Size', type: 'text', group: 'Details', placeholder: 'e.g. Box of 12, Pack of 500' },
      { key: 'color_variant', label: 'Color / Variant', type: 'text', group: 'Details' },
    ],
  },
}

// Helper: get config by category_type
export function getCategoryConfig(categoryType: string): CategoryConfig | null {
  return CATEGORY_CONFIGS[categoryType] ?? null
}

// Helper: get all category type options
export const CATEGORY_TYPE_OPTIONS = [
  { value: 'ppe', label: 'PPE (Personal Protective Equipment)' },
  { value: 'uniform', label: 'Uniform & Clothing' },
  { value: 'it_asset', label: 'IT Assets' },
  { value: 'machinery', label: 'Machinery & Heavy Equipment' },
  { value: 'tools', label: 'Tools & Hand Tools' },
  { value: 'office_asset', label: 'Office Assets' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'electrical', label: 'Electrical Materials' },
  { value: 'plumbing', label: 'Plumbing Materials' },
  { value: 'construction', label: 'Construction Materials' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'other', label: 'Other' },
]

export const UNIT_OPTIONS_BY_CATEGORY: Record<string, string[]> = {
  uniform: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'Free Size', 'PCS', 'SET'],
  ppe: ['Piece', 'Set', 'Pair', 'Box'],
  ppe_shoes: ['Size 5', 'Size 6', 'Size 7', 'Size 8', 'Size 9', 'Size 10', 'Size 11', 'Size 12', 'Pair'],
  it_asset: ['Piece', 'Set', 'Kit'],
  machinery: ['Unit', 'Set'],
  tools: ['Piece', 'Set', 'Kit', 'Box'],
  office_asset: ['Piece', 'Set'],
  furniture: ['Piece', 'Set'],
  construction: ['Kg', 'Ton', 'Bag', 'Piece', 'Litre', 'CFT', 'Sqft', 'Meter', 'Nos'],
  electrical: ['Meter', 'Roll', 'Piece', 'Nos', 'Set', 'Box'],
  plumbing: ['Meter', 'Piece', 'Nos', 'Set', 'Box'],
  vehicle: ['Unit'],
  stationery: ['Piece', 'Pack', 'Box', 'Ream', 'Dozen', 'Set'],
  default: ['PCS', 'SET', 'PACK', 'BOX', 'NOS', 'PAIR', 'UNIT', 'LOT'],
}
