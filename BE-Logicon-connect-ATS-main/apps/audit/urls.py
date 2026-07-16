from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet, UserActivityLogViewSet, EmailReportSettingsViewSet

router = DefaultRouter()
router.register('logs', AuditLogViewSet, basename='audit-log')
router.register('user-activity', UserActivityLogViewSet, basename='user-activity')
router.register('email-settings', EmailReportSettingsViewSet, basename='email-report-settings')

urlpatterns = [
    path('', include(router.urls)),
]

