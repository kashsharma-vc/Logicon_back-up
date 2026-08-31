import os
import django
from django.test.client import RequestFactory

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.attendance.views import AdminDashboardAttendanceExportView
from apps.accounts.models import User

# Get the admin user
admin_user = User.objects.filter(is_superuser=True).first()

factory = RequestFactory()
request = factory.get('/api/attendance/export/?date_start=2026-07-01&date_end=2026-07-08')
request.user = admin_user

# Disable authentication checking by mocking it out for this local direct view test, or use force_authenticate if using APIRequestFactory
from rest_framework.test import APIRequestFactory, force_authenticate

api_factory = APIRequestFactory()
request = api_factory.get('/api/attendance/export/?date_start=2026-07-01&date_end=2026-07-08')
force_authenticate(request, user=admin_user)

view = AdminDashboardAttendanceExportView.as_view()
response = view(request)
print("Status Code:", response.status_code)
print("Content-Disposition:", response.get('Content-Disposition'))
print("Content:")
print(response.content.decode('utf-8'))
