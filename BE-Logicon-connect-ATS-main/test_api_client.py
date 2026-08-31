import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.inventory.serializers import InventoryRequestTypeSerializer

# Let's inspect what fields are actually in the serializer
s = InventoryRequestTypeSerializer()
print(s.get_fields())
