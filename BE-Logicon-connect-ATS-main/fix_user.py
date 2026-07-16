import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.attendance.models import AttendanceSession

# 1. Revert Deepak Yadav back to client
deepak = User.objects.filter(id=14).first()
if deepak and deepak.first_name == 'Deepak':
    deepak.user_type = 'client'
    deepak.save()
    print("Reverted Deepak Yadav to client")

# 2. Create or get the 'Logicon' user
logicon_user, created = User.objects.get_or_create(
    username='abc@gmail.com',
    defaults={
        'first_name': 'Logicon',
        'email': 'abc@gmail.com',
        'user_type': 'field'
    }
)

if not created:
    logicon_user.first_name = 'Logicon'
    logicon_user.user_type = 'field'
    logicon_user.save()

print(f"Logicon user ID is {logicon_user.id}")

# 3. Update the attendance session to point to the Logicon user
session = AttendanceSession.objects.first()
if session:
    session.employee = logicon_user
    session.save()
    print(f"Updated session {session.id} to use employee_id {logicon_user.id}")
