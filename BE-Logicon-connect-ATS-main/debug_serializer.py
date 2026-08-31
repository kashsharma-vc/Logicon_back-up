import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.hiring.models import HiringApplication
from apps.hiring.serializers import HiringApplicationReadSerializer

try:
    apps = HiringApplication.objects.all()[:1]
    if apps:
        serializer = HiringApplicationReadSerializer(apps[0])
        print(serializer.data)
    else:
        print("No apps found")
except Exception as e:
    import traceback
    traceback.print_exc()
