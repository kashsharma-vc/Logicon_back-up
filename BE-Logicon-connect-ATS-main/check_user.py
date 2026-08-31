import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.access.models import UserRoleAssignment

User = get_user_model()
email = 'kashsharma8591@gmail.com'

try:
    user = User.objects.get(email__iexact=email)
    print(f"User found: {user.username} (ID: {user.id})")
    print(f"Name: {user.first_name} {user.last_name}")
    print(f"User Type: {user.user_type}")
    print(f"Is Active: {user.is_active}")
    print(f"Organization ID: {user.org_id}")
    
    assignments = UserRoleAssignment.objects.filter(user=user).select_related('role', 'scope_node')
    print(f"\nRole Assignments ({assignments.count()} found):")
    for a in assignments:
        print(f" - Role: {a.role.name} ({a.role.code})")
        print(f"   Scope: {a.scope_node.path} (Type: {a.scope_node.node_type})")
        
except User.DoesNotExist:
    print(f"User with email {email} not found in the database.")
