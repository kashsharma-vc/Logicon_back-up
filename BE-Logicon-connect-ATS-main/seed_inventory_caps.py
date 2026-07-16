import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.access.models import Permission, AccessRole, AccessRolePermission
from apps.access.capabilities import ALL_CAPABILITIES, ROLE_CAPABILITIES

print("Syncing all capabilities...")

permissions = {}
for capability in ALL_CAPABILITIES:
    parts = capability.split('.')
    if len(parts) == 2:
        resource, action = parts
    else:
        resource = '_'.join(parts[:-1])
        action = parts[-1]

    permission, _ = Permission.objects.get_or_create(
        code=capability,
        defaults={
            'resource': resource,
            'action': action,
            'description': f'Can {action} {capability}',
        },
    )
    permissions[capability] = permission

for role_code, caps in ROLE_CAPABILITIES.items():
    for role in AccessRole.objects.filter(code=role_code):
        for cap in caps:
            perm = permissions.get(cap)
            if perm:
                AccessRolePermission.objects.get_or_create(role=role, permission=perm)
        print(f"Updated role {role_code} ({role.id})")

print("Done.")
