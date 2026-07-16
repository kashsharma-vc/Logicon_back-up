import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.attendance.models import AttendanceSession

print("Fetching sessions...")
qs = AttendanceSession.objects.all()

for session in qs:
    emp = session.employee
    print("Employee:", emp)
    print("Role:", emp.roleId.roleName if hasattr(emp, 'roleId') and emp.roleId else '-')
    print("Dept:", emp.departmentId.departmentName if hasattr(emp, 'departmentId') and emp.departmentId else '-')
    print("Success for session", session.id)

print("Done")