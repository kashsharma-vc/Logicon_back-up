from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel, Organization

CATEGORY_TYPE_CHOICES = [
    ('ppe', 'PPE'),
    ('it_asset', 'IT Asset'),
    ('machinery', 'Machinery'),
    ('tools', 'Tools'),
    ('office_asset', 'Office Asset'),
    ('electrical', 'Electrical Materials'),
    ('plumbing', 'Plumbing Materials'),
    ('construction', 'Construction Materials'),
    ('furniture', 'Furniture'),
    ('uniform', 'Uniform'),
    ('vehicle', 'Vehicle'),
    ('stationery', 'Stationery'),
    ('other', 'Other'),
]

PPE_SUB_TYPES = ['Helmet', 'Safety Shoes', 'Gloves', 'Safety Jacket', 'Raincoat', 'Goggles', 'Face Shield', 'Ear Protection', 'Respirator']
IT_SUB_TYPES = ['Laptop', 'Desktop', 'Tablet', 'Mobile', 'Printer', 'Scanner', 'Router', 'Monitor', 'Keyboard', 'Mouse']
MACHINERY_SUB_TYPES = ['Excavator', 'Crane', 'Generator', 'Concrete Mixer', 'Drill Machine', 'Compressor', 'Welding Machine']
TOOLS_SUB_TYPES = ['Hammer', 'Spanner', 'Screwdriver', 'Measuring Tape', 'Cutting Machine', 'Grinder', 'Ladder']
OFFICE_SUB_TYPES = ['Chair', 'Table', 'Cabinet', 'Projector', 'Air Conditioner', 'Whiteboard']
FURNITURE_SUB_TYPES = ['Desk', 'Chair', 'Cabinet', 'Shelving', 'Sofa', 'Conference Table']
CONSTRUCTION_SUB_TYPES = ['Cement', 'Sand', 'Bricks', 'Steel', 'Aggregate', 'Tiles', 'Paint', 'Wood', 'Glass']
ELECTRICAL_SUB_TYPES = ['Cable', 'Wire', 'Switch', 'MCB', 'DB Box', 'Conduit', 'Socket', 'Light Fixture']
PLUMBING_SUB_TYPES = ['PVC Pipe', 'GI Pipe', 'Elbow', 'Valve', 'Tap', 'Tank', 'Fitting']


class Warehouse(TimeStampedModel):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='warehouses')
    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=150)
    location = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('org', 'code')

    def __str__(self):
        return f"{self.code} - {self.name}"


class InventoryCategory(TimeStampedModel):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='inventory_categories')
    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=50, choices=CATEGORY_TYPE_CHOICES, default='other')

    class Meta:
        verbose_name_plural = 'Inventory Categories'

    def __str__(self):
        return self.name


class UniformKit(TimeStampedModel):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='uniform_kits')
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=100)
    departments = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.role})"


class InventoryItem(TimeStampedModel):
    ITEM_STATUS_CHOICES = [
        ('available', 'Available'),
        ('assigned', 'Assigned'),
        ('maintenance', 'Under Maintenance'),
        ('disposed', 'Disposed'),
        ('lost', 'Lost'),
        ('archived', 'Archived'),
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
    ]

    CONDITION_CHOICES = [
        ('new', 'New'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
        ('damaged', 'Damaged'),
    ]

    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='inventory_items')
    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.ForeignKey(InventoryCategory, on_delete=models.PROTECT, related_name='items')
    category_type = models.CharField(max_length=50, choices=CATEGORY_TYPE_CHOICES, blank=True)
    sub_type = models.CharField(max_length=100, blank=True)
    
    uniform_kit = models.ForeignKey(UniformKit, on_delete=models.SET_NULL, null=True, blank=True, related_name='components')

    brand = models.CharField(max_length=100, blank=True)
    unit = models.CharField(max_length=50, help_text="e.g., L, SET, BOX, PCS")

    # Primary warehouse (Scoop)
    warehouse = models.ForeignKey('core.ScopeNode', on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_items')
    storage_location = models.CharField(max_length=255, blank=True)
    rack_number = models.CharField(max_length=100, blank=True)

    # Stock levels
    stock = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)
    min_quantity = models.IntegerField(default=0)
    max_quantity = models.IntegerField(null=True, blank=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # Identification
    asset_tag = models.CharField(max_length=100, blank=True, unique=False)
    serial_number = models.CharField(max_length=200, blank=True)
    barcode = models.CharField(max_length=200, blank=True)
    qr_code = models.CharField(max_length=500, blank=True)

    # Status & condition
    item_status = models.CharField(max_length=50, choices=ITEM_STATUS_CHOICES, default='available')
    condition = models.CharField(max_length=50, choices=CONDITION_CHOICES, blank=True)

    # Assignment
    assigned_to_name = models.CharField(max_length=255, blank=True)
    assigned_to_id = models.CharField(max_length=100, blank=True)
    assigned_department = models.CharField(max_length=255, blank=True)
    assigned_project = models.CharField(max_length=255, blank=True)
    assigned_site = models.CharField(max_length=255, blank=True)
    assigned_date = models.DateField(null=True, blank=True)
    return_required = models.BooleanField(default=False)
    expected_return_date = models.DateField(null=True, blank=True)

    # Purchase info
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    supplier = models.CharField(max_length=255, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    batch_number = models.CharField(max_length=100, blank=True)

    # Warranty
    warranty_start = models.DateField(null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    amc_start = models.DateField(null=True, blank=True)
    amc_end = models.DateField(null=True, blank=True)
    amc_vendor = models.CharField(max_length=255, blank=True)

    # Maintenance
    last_maintenance = models.DateField(null=True, blank=True)
    next_maintenance = models.DateField(null=True, blank=True)
    maintenance_cycle_days = models.IntegerField(null=True, blank=True)

    # Dynamic category-specific fields (JSONField)
    dynamic_fields = models.JSONField(default=dict, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('org', 'code')

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def stock_status(self):
        if self.stock == 0:
            return 'out_of_stock'
        if self.stock <= self.reorder_level:
            return 'low_stock'
        return 'in_stock'

    @property
    def warranty_status(self):
        if not self.warranty_expiry:
            return None
        from django.utils import timezone
        import datetime
        days_left = (self.warranty_expiry - timezone.now().date()).days
        if days_left < 0:
            return 'expired'
        if days_left <= 30:
            return 'expiring_soon'
        return 'valid'


class InventoryItemHistory(TimeStampedModel):
    """Timeline history of an inventory item."""
    ACTION_CHOICES = [
        ('purchased', 'Purchased'),
        ('assigned', 'Assigned'),
        ('transferred', 'Transferred'),
        ('returned', 'Returned'),
        ('maintenance', 'Sent for Maintenance'),
        ('lost', 'Reported Lost'),
        ('disposed', 'Disposed'),
        ('archived', 'Archived'),
        ('updated', 'Updated'),
    ]

    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    performed_by = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.item.code} — {self.action}"


class InventorySettings(TimeStampedModel):
    """Global settings for the inventory module."""
    org = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='inventory_settings')
    
    # Notifications & SMTP
    low_stock_alert_threshold_percent = models.IntegerField(default=10)
    warranty_alert_days_before = models.IntegerField(default=30)
    admin_emails_for_alerts = models.CharField(max_length=500, blank=True, help_text="Comma-separated emails")
    storage_locations = models.JSONField(default=list, blank=True, help_text="Configurable list of storage locations")
    
    smtp_host = models.CharField(max_length=255, blank=True)
    smtp_port = models.IntegerField(default=587)
    smtp_user = models.CharField(max_length=255, blank=True)
    smtp_password = models.CharField(max_length=255, blank=True)
    smtp_use_tls = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Inventory Settings - {self.org.name}"


class InventoryBillingRule(TimeStampedModel):
    """Rules defining whether items are billable to client/projects."""
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='inventory_billing_rules')
    category_type = models.CharField(max_length=50, choices=CATEGORY_TYPE_CHOICES, blank=True)
    is_billable = models.BooleanField(default=False)
    markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True)
    
    class Meta:
        unique_together = ('org', 'category_type')

    def __str__(self):
        return f"{self.category_type} - Billable: {self.is_billable}"


class StockMovement(TimeStampedModel):
    """Immutable ledger of inventory transactions."""
    MOVEMENT_TYPE_CHOICES = [
        ('incoming', 'Incoming'),
        ('outgoing', 'Outgoing'),
        ('transfer', 'Transfer'),
        ('issue', 'Issue'),
        ('return', 'Return'),
        ('adjustment', 'Adjustment'),
        ('damage', 'Damage'),
        ('disposal', 'Disposal'),
        ('audit', 'Audit'),
        ('consumption', 'Consumption'),
        ('purchase', 'Purchase'),
        ('vendor_return', 'Vendor Return'),
        ('site_return', 'Site Return'),
        ('branch_return', 'Branch Return'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
        ('failed', 'Failed'),
    ]

    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=50, choices=MOVEMENT_TYPE_CHOICES)
    reference_number = models.CharField(max_length=100, blank=True)
    reference_module = models.CharField(max_length=100, blank=True)

    previous_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    movement_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    current_quantity = models.DecimalField(max_digits=10, decimal_places=2)

    branch = models.ForeignKey('core.ScopeNode', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements_branch')
    site = models.ForeignKey('sites.SiteProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements_site')
    client = models.ForeignKey('sites.Client', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements_client')
    assigned_employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_stock_movements')
    department = models.ForeignKey('core.Department', on_delete=models.SET_NULL, null=True, blank=True)
    project = models.ForeignKey('core.ScopeNode', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements_project')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    remarks = models.TextField(blank=True)
    meta_data = models.JSONField(default=dict, blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_stock_movements')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_stock_movements')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.item.code} - {self.movement_type} ({self.movement_quantity})"

# ─── New Workflow-Driven Architecture Models ───────────────────────────────────

class InventoryRequestType(TimeStampedModel):
    """Configuration: Defines a dynamic request type and its required form fields."""
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='inventory_request_types')
    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=150)
    workflow_template = models.ForeignKey(
        'workflow.WorkflowTemplate', on_delete=models.SET_NULL, null=True, blank=True,
        help_text="The dynamic approval chain for this request type."
    )
    form_schema = models.JSONField(
        default=list, blank=True,
        help_text="Array of field objects defining the dynamic form (e.g. label, type, required)"
    )
    is_billable = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('org', 'code')

    def __str__(self):
        return f"{self.name} ({self.code})"


class InventoryPolicy(TimeStampedModel):
    """Configuration: Business rules for specific categories or items."""
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='inventory_policies')
    category = models.ForeignKey(InventoryCategory, on_delete=models.CASCADE, related_name='policies', null=True, blank=True)
    approval_required = models.BooleanField(default=True)
    warranty_tracking = models.BooleanField(default=False)
    return_required = models.BooleanField(default=False)
    replacement_allowed = models.BooleanField(default=True)

    def __str__(self):
        return f"Policy for {self.category.name if self.category else 'Global'}"


class AssignmentRule(TimeStampedModel):
    """Configuration: Defines allowable assignment targets."""
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='assignment_rules')
    category = models.ForeignKey(InventoryCategory, on_delete=models.CASCADE, related_name='assignment_rules', null=True, blank=True)
    can_assign_to_employee = models.BooleanField(default=True)
    can_assign_to_site = models.BooleanField(default=True)
    can_assign_to_client = models.BooleanField(default=False)
    can_assign_to_department = models.BooleanField(default=False)
    can_assign_to_project = models.BooleanField(default=False)

    def __str__(self):
        return f"Assignment Rule for {self.category.name if self.category else 'Global'}"


class InventoryRequest(TimeStampedModel):
    """Execution: An instance of an inventory request processed via workflow engine."""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved / Waiting Assignment'),
        ('assigned', 'Assigned / Completed'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='inventory_requests')
    request_type = models.ForeignKey(InventoryRequestType, on_delete=models.PROTECT, related_name='requests')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inventory_requests')
    
    # Optional direct link to an item if known during request
    item = models.ForeignKey(InventoryItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    
    form_data = models.JSONField(default=dict, blank=True, help_text="User input matching the request type schema")
    
    workflow_instance = models.OneToOneField(
        'workflow.WorkflowInstance', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inventory_request_instance'
    )
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"REQ-{self.id} - {self.request_type.name} by {self.requested_by}"


