import os
import django
import urllib.request
import urllib.error
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.first()

from rest_framework_simplejwt.tokens import RefreshToken

refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

data = json.dumps({
    'code': 'TEST2',
    'name': 'Test Request',
    'is_billable': False,
    'is_active': True,
    'form_schema': [],
    'workflow_template': None
}).encode('utf-8')

req = urllib.request.Request(
    'http://localhost:8001/api/inventory/request-types/',
    data=data,
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
)

try:
    response = urllib.request.urlopen(req)
    print("Status:", response.status)
    print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Status:", e.code)
    print("Response:", e.read().decode('utf-8'))
