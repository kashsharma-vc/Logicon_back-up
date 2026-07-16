import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
u = User.objects.get(email='kashsharma8591@gmail.com')
print(f"Superuser: {u.is_superuser}")
print(f"Staff: {u.is_staff}")
