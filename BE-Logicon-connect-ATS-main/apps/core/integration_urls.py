from django.urls import path
from apps.core.integration_views import asset_vault_login_link

app_name = 'integrations'

urlpatterns = [
    path('asset-vault/login-link/', asset_vault_login_link, name='asset_vault_login_link'),
]
