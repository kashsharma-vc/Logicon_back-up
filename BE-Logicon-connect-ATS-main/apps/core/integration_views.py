from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import timedelta
from django.utils import timezone

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def asset_vault_login_link(request):
    """
    Mock endpoint to generate a signed SSO link for Asset Vault.
    In a real scenario, this would sign a JWT payload with the user's role
    and capabilities, then return an Asset Vault URL with the token.
    """
    # Verify capability
    from apps.access.capabilities import get_user_capabilities, ASSET_VAULT_ACCESS
    user_caps = get_user_capabilities(request.user)
    if ASSET_VAULT_ACCESS not in user_caps:
        return Response({'error': 'You do not have permission to access Asset Vault.'}, status=403)

    # For demo purposes, we return a mock URL.
    expires_at = timezone.now() + timedelta(minutes=15)
    return Response({
        'url': 'https://example.com/?token=mock-signed-token',
        'expires_in': 900,
        'expires_at': expires_at.isoformat()
    })
