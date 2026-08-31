import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.access.models import AccessRole, AccessRolePermission, Permission
from apps.access.capabilities import ROLE_CAPABILITIES

role_code = 'finance_manager'
caps = ROLE_CAPABILITIES.get(role_code, [])

roles = AccessRole.objects.filter(code=role_code)
for role in roles:
    perms = Permission.objects.filter(code__in=caps)
    for p in perms:
        AccessRolePermission.objects.get_or_create(role=role, permission=p)
    AccessRolePermission.objects.filter(role=role).exclude(permission__code__in=caps).delete()

print(f"Synced '{role_code}' capabilities to DB across {roles.count()} AccessRole instances.")
