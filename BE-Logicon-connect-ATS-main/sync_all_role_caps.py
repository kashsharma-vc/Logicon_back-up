import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.access.models import AccessRole, AccessRolePermission, Permission
from apps.access.capabilities import ALL_CAPABILITIES, ROLE_CAPABILITIES

# Ensure all permissions exist
for cap in ALL_CAPABILITIES:
    parts = cap.split('.')
    module_name = parts[0] if parts else 'general'
    action_name = '.'.join(parts[1:]) if len(parts) > 1 else parts[0]
    Permission.objects.get_or_create(
        code=cap,
        defaults={
            'name': f"{module_name.title()} {action_name.title()}",
            'module': module_name,
            'action': action_name,
            'description': f"Permission to {action_name} on {module_name}",
        }
    )

print(f"Ensured {len(ALL_CAPABILITIES)} permissions exist in Permission table.")

# Sync all roles in ROLE_CAPABILITIES
for role_code, caps in ROLE_CAPABILITIES.items():
    roles = AccessRole.objects.filter(code=role_code)
    perms = Permission.objects.filter(code__in=caps)
    for role in roles:
        for p in perms:
            AccessRolePermission.objects.get_or_create(role=role, permission=p)
        print(f"Synced {role.code} ({role.name}) with {perms.count()} permissions.")

print("Role capabilities sync completed successfully.")
