import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.access.models import AccessRole, UserRoleAssignment
from apps.core.models import ScopeNode

User = get_user_model()
email = 'kashsharma8591@gmail.com'

try:
    user = User.objects.get(email__iexact=email)

    # 1. Update User Type
    user.user_type = 'client'
    user.save(update_fields=['user_type'])

    # 2. Fetch ScopeNode for "Kash" client (path 'logicon/cls14' determined earlier)
    scope_node = ScopeNode.objects.get(path='logicon/cls14')

    # 3. Find or create client_admin role for user's organization
    role, _ = AccessRole.objects.get_or_create(
        org_id=user.org_id, 
        code='client_admin',
        defaults={'name': 'Client Admin', 'node_type_scope': 'client'}
    )

    # 4. Create the role assignment
    assignment, created = UserRoleAssignment.objects.get_or_create(
        user=user,
        role=role,
        scope_node=scope_node
    )

    print(f"SUCCESS: Updated {user.email} to 'client' user type.")
    print(f"SUCCESS: Assigned Role '{role.name}' ({role.code}) on Scope '{scope_node.path}'.")
    
except Exception as e:
    print(f"Error occurred: {e}")
