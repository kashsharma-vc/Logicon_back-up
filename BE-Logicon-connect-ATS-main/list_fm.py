import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.access.models import UserRoleAssignment

assignments = UserRoleAssignment.objects.filter(role__code='finance_manager').select_related('user')
print(f"Users with finance_manager role: {assignments.count()}")
for a in assignments:
    print(f"- {a.user.email} (ID: {a.user.id})")
