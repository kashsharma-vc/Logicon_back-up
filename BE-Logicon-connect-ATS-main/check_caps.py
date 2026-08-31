import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.access.capabilities import get_user_capabilities

User = get_user_model()
u = User.objects.get(email='finance.manager@logicon.local')
caps = get_user_capabilities(u)
print(f"Capabilities for {u.email}:")
print(caps)
