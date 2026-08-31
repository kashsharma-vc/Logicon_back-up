import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.inventory.serializers import InventoryRequestTypeSerializer

s = InventoryRequestTypeSerializer(data={
    'code': 'test',
    'name': 'test',
    'is_billable': False,
    'is_active': True,
    'form_schema': [],
    'workflow_template': ''
})
print("Empty string:", s.is_valid(), s.errors)

s2 = InventoryRequestTypeSerializer(data={
    'code': 'test',
    'name': 'test',
    'is_billable': False,
    'is_active': True,
    'form_schema': [],
    'workflow_template': None
})
print("Null:", s2.is_valid(), s2.errors)
