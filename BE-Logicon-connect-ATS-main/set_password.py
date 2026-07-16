import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
email = 'kashsharma8591@gmail.com'

try:
    user = User.objects.get(email__iexact=email)
    user.set_password('Password@123')
    user.save()
    print(f"Password successfully reset for {email}")
except User.DoesNotExist:
    print("User not found.")
