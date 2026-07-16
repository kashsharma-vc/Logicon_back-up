from rest_framework import serializers
from .models import (
    Warehouse, InventoryCategory, InventoryItem, InventoryItemHistory,
    InventorySettings, InventoryBillingRule, UniformKit, StockMovement,
    InventoryRequestType, InventoryPolicy, AssignmentRule, InventoryRequest
)
from apps.core.models import ScopeNode


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['id', 'code', 'name', 'location', 'is_active', 'created_at', 'updated_at']


class InventoryCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryCategory
        fields = ['id', 'name', 'category_type', 'created_at', 'updated_at']


class InventoryItemHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItemHistory
        fields = ['id', 'action', 'performed_by', 'notes', 'meta', 'created_at']


class InventoryItemSerializer(serializers.ModelSerializer):
    category = InventoryCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=InventoryCategory.objects.all(), source='category', write_only=True
    )
    warehouse = serializers.SerializerMethodField(read_only=True)
    warehouse_id = serializers.PrimaryKeyRelatedField(
        queryset=ScopeNode.objects.filter(node_type='region'), source='warehouse', write_only=True, required=False, allow_null=True
    )
    stock_status = serializers.ReadOnlyField()
    warranty_status = serializers.ReadOnlyField()

    def get_warehouse(self, obj):
        if obj.warehouse:
            return {'id': obj.warehouse.id, 'name': obj.warehouse.name, 'code': obj.warehouse.code}
        return None

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'code', 'name', 'description', 'brand', 'unit',
            'category', 'category_id', 'category_type', 'sub_type',
            'warehouse', 'warehouse_id', 'storage_location', 'rack_number',
            'stock', 'reorder_level', 'min_quantity', 'max_quantity', 'unit_price',
            'asset_tag', 'serial_number', 'barcode', 'qr_code',
            'item_status', 'condition',
            'assigned_to_name', 'assigned_to_id', 'assigned_department',
            'assigned_project', 'assigned_site', 'assigned_date',
            'return_required', 'expected_return_date',
            'purchase_date', 'purchase_cost', 'supplier', 'invoice_number', 'batch_number',
            'warranty_start', 'warranty_expiry', 'amc_start', 'amc_end', 'amc_vendor',
            'last_maintenance', 'next_maintenance', 'maintenance_cycle_days',
            'dynamic_fields',
            'is_active',
            'stock_status', 'warranty_status',
            'created_at', 'updated_at',
        ]


class InventoryItemListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list view."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_type = serializers.CharField(read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True, default=None)
    stock_status = serializers.ReadOnlyField()
    warranty_status = serializers.ReadOnlyField()

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'code', 'name', 'brand', 'unit',
            'category_name', 'category_type', 'sub_type',
            'warehouse_code',
            'stock', 'reorder_level', 'unit_price',
            'asset_tag', 'serial_number',
            'item_status', 'condition',
            'assigned_to_name', 'assigned_department',
            'purchase_date', 'purchase_cost',
            'warranty_expiry',
            'stock_status', 'warranty_status',
            'is_active',
        ]


class InventorySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventorySettings
        fields = [
            'id', 'low_stock_alert_threshold_percent', 'warranty_alert_days_before',
            'admin_emails_for_alerts', 'smtp_host', 'smtp_port', 
            'smtp_user', 'smtp_use_tls', 'storage_locations'
        ]


class InventoryBillingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryBillingRule
        fields = ['id', 'category_type', 'is_billable', 'markup_percentage', 'notes']


class UniformKitSerializer(serializers.ModelSerializer):
    class Meta:
        model = UniformKit
        fields = ['id', 'name', 'role', 'departments', 'description', 'created_at']


class StockMovementSerializer(serializers.ModelSerializer):
    item = InventoryItemSerializer(read_only=True)
    
    class Meta:
        model = StockMovement
        fields = '__all__'

class InventoryRequestTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryRequestType
        fields = ['id', 'code', 'name', 'workflow_template', 'form_schema', 'is_billable', 'is_active']

class InventoryPolicySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = InventoryPolicy
        fields = ['id', 'category', 'category_name', 'approval_required', 'warranty_tracking', 'return_required', 'replacement_allowed']

class AssignmentRuleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = AssignmentRule
        fields = ['id', 'category', 'category_name', 'can_assign_to_employee', 'can_assign_to_site', 'can_assign_to_client', 'can_assign_to_department', 'can_assign_to_project']

class InventoryRequestSerializer(serializers.ModelSerializer):
    request_type_details = InventoryRequestTypeSerializer(source='request_type', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = InventoryRequest
        fields = [
            'id', 'request_type', 'request_type_details', 'requested_by', 'requested_by_name',
            'item', 'item_code', 'item_name', 'form_data', 'workflow_instance', 'status', 'notes',
            'created_at', 'updated_at'
        ]