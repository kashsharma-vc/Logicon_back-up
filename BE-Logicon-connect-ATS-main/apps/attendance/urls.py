from django.urls import path
from .views import AdminDashboardAttendanceView, AdminDashboardAttendanceExportView, AdminDashboardAttendanceEmailView, AdminDashboardAttendanceEmailView

app_name = 'attendance'

urlpatterns = [
    path('dashboard/', AdminDashboardAttendanceView.as_view(), name='attendance-dashboard'),
    path('export/', AdminDashboardAttendanceExportView.as_view(), name='attendance-export'),
    path('send-email/', AdminDashboardAttendanceEmailView.as_view(), name='attendance-send-email'),
]
