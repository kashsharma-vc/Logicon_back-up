import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.first()

from rest_framework_simplejwt.tokens import RefreshToken

refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

response = requests.post(
    'http://localhost:8001/api/inventory/request-types/',
    json={
        'code': 'TEST1',
        'name': 'Test Request',
        'is_billable': False,
        'is_active': True,
        'form_schema': [],
        'workflow_template': None
    },
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
)

print("Status:", response.status_code)
print("Response:", response.text)
