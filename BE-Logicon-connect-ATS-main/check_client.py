import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.sites.models import Client, SiteProfile
from django.contrib.auth import get_user_model
from apps.access.models import UserRoleAssignment

User = get_user_model()

print("--- Clients containing 'Kash' ---")
clients = Client.objects.filter(name__icontains='Kash')
for c in clients:
    print(f"Client: {c.name} (ID: {c.id})")
    print(f"  Scope: {c.scope_node.path if c.scope_node else 'None'}")
    
print("\n--- Sites containing 'Kash' or 'Lokhadvala' ---")
sites = SiteProfile.objects.filter(name__icontains='Lokhadvala') | SiteProfile.objects.filter(name__icontains='Kash')
for s in sites.distinct():
    print(f"Site: {s.name} (ID: {s.id})")
    print(f"  Client: {s.client.name if s.client else 'None'}")
    print(f"  Scope: {s.scope_node.path if s.scope_node else 'None'}")

print("\n--- Users matching 'kash' ---")
users = User.objects.filter(email__icontains='kash')
for u in users:
    print(f"User: {u.email} (ID: {u.id}) - Type: {u.user_type}")
    assignments = UserRoleAssignment.objects.filter(user=u)
    for a in assignments:
        print(f"   -> Role: {a.role.code}, Scope: {a.scope_node.path}")

