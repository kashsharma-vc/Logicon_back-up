from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WarehouseViewSet, InventoryCategoryViewSet, InventoryItemViewSet,
    InventorySettingsViewSet, InventoryBillingRuleViewSet, UniformKitViewSet,
    StockMovementViewSet, InventoryRequestTypeViewSet, InventoryPolicyViewSet,
    AssignmentRuleViewSet, InventoryRequestViewSet
)

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'categories', InventoryCategoryViewSet, basename='inventorycategory')
router.register(r'items', InventoryItemViewSet, basename='inventoryitem')
router.register(r'settings', InventorySettingsViewSet, basename='inventorysettings')
router.register(r'billing-rules', InventoryBillingRuleViewSet, basename='inventorybillingrule')
router.register(r'uniform-kits', UniformKitViewSet, basename='uniformkit')
router.register(r'stock-movements', StockMovementViewSet, basename='stockmovement')
router.register(r'request-types', InventoryRequestTypeViewSet, basename='inventoryrequesttype')
router.register(r'policies', InventoryPolicyViewSet, basename='inventorypolicy')
router.register(r'assignment-rules', AssignmentRuleViewSet, basename='assignmentrule')
router.register(r'requests', InventoryRequestViewSet, basename='inventoryrequest')

urlpatterns = [
    path('', include(router.urls)),
]