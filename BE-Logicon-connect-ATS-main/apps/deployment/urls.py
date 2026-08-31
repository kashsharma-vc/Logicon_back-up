from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DeploymentHistoryViewSet,
    EmployeeViewSet,
    SiteDeploymentViewSet,
    FieldProvisioningLogViewSet,
    FieldSenseStatusView,
)

router = DefaultRouter()
router.register('employees', EmployeeViewSet, basename='employee')
router.register('site-deployments', SiteDeploymentViewSet, basename='site-deployment')
router.register('history', DeploymentHistoryViewSet, basename='deployment-history')
router.register('fieldsense-logs', FieldProvisioningLogViewSet, basename='fieldsense-logs')

urlpatterns = [
    path('fieldsense-status/', FieldSenseStatusView.as_view(), name='fieldsense-status'),
    path('', include(router.urls)),
]


