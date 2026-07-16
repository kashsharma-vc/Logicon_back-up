import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import sys
from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.conf import settings

from apps.core.models import Organization, ScopeNode
from apps.sites.models import Client
from apps.access.models import AccessRole, UserRoleAssignment

User = get_user_model()

org, _ = Organization.objects.get_or_create(name='Test Org')
scope_node, _ = ScopeNode.objects.get_or_create(path='test-org/client-1', defaults={'node_type': 'client', 'org': org})
client, _ = Client.objects.get_or_create(name='Test Client', defaults={'org': org, 'scope_node': scope_node})
role, _ = AccessRole.objects.get_or_create(org=org, code='client_admin', defaults={'name': 'Client Admin', 'node_type_scope': 'client'})

email = 'testclient@example.com'
user, created = User.objects.get_or_create(
    username='testclient',
    defaults={
        'email': email,
        'first_name': 'Test',
        'last_name': 'Client',
        'user_type': 'client',
        'org': org,
        'is_active': True,
    }
)
if created:
    user.set_unusable_password()
    user.save()

UserRoleAssignment.objects.get_or_create(user=user, role=role, scope_node=scope_node)

uid = urlsafe_base64_encode(force_bytes(user.pk))
token = PasswordResetTokenGenerator().make_token(user)
frontend_url = 'http://localhost:5173'
invite_url = f"{frontend_url}/set-password?uid={uid}&token={token}"

print(f"\n=====================================")
print(f"Test User Created: {email}")
print(f"Role: {role.name}")
print(f"Scope: {scope_node.path}")
print(f"Invite URL: {invite_url}")
print(f"=====================================\n")
