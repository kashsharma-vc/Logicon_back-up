from django.test import RequestFactory
from apps.workflow.config_views import ConfigPreviewView
from django.contrib.auth import get_user_model
from apps.sites.models import Client
from rest_framework.test import force_authenticate
import json

User = get_user_model()
client = Client.objects.first()
user = User.objects.filter(is_superuser=True).first()

request_factory = RequestFactory()
request = request_factory.get(f'/api/workflow/config/preview/?request_type=mrf&client={client.id}')
force_authenticate(request, user=user)
request.user = user

response = ConfigPreviewView.as_view()(request)
print("PREVIEW STATUS:", response.status_code)
print("PREVIEW DATA:", json.dumps(response.data, indent=2))
