"""
apps/accounts/views.py

User CRUD ViewSet.

Capability map:
  list/retrieve    user.read
  create           user.create
  update           user.update
  partial_update   user.update
  destroy          user.delete  (soft — sets is_active=False)

Scope: users are org-scoped. Only roles that carry user.* capabilities
(admin, hr_admin) will ever reach these endpoints.
"""

from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.core.mail import send_mail

from apps.core.models import Organization
from apps.access.permissions import HasCapability
from apps.access.querysets import filter_users_for_user
from apps.access.viewsets import ScopedModelViewSet
from apps.audit.services import log_audit

from .models import User, normalize_phone_number
from .serializers import (
    UserListSerializer, UserCreateSerializer, UserUpdateSerializer,
    EmailTokenObtainPairSerializer, SetPasswordSerializer,
)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class SetPasswordView(APIView):
    """POST /api/accounts/set-password/ — set password via uid+token (no auth required)."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Password set successfully.'})


class LogoutView(APIView):
    """POST /api/accounts/logout/ — logout the current user and update their session activity log."""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from django.utils import timezone
        from apps.audit.models import UserActivityLog

        user = request.user
        now = timezone.now()

        active_logs = UserActivityLog.objects.filter(user=user, session_status='active')
        for log in active_logs:
            log.session_status = 'completed'
            log.logout_time = now
            duration = now - log.login_time
            if duration.total_seconds() < 8 * 3600:  # 8 hours
                if log.attendance_status == 'present':
                    log.attendance_status = 'under_hours'
            log.save()

        return Response({'detail': 'Logged out successfully.'})



def _validate_department_org(department, org, label='department'):
    """Raise ValidationError if department.org != org."""
    if department is not None and org is not None:
        if department.org_id != org.pk:
            raise ValidationError(
                {label: 'Department must belong to the same organization as the user.'}
            )


class UserViewSet(ScopedModelViewSet):
    queryset = User.objects.select_related('org', 'department').order_by('last_name', 'first_name')
    permission_classes = [IsAuthenticated, HasCapability]
    scope_filter = filter_users_for_user
    filterset_fields = ['org', 'user_type', 'is_active', 'is_invited', 'department']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'employee_code', 'phone_number']

    action_required_capabilities = {
        'list':           'user.read',
        'retrieve':       'user.read',
        'create':         'user.create',
        'update':         'user.update',
        'partial_update': 'user.update',
        'destroy':        'user.delete',
    }

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserListSerializer

    def perform_create(self, serializer):
        actor = self.request.user
        org = serializer.validated_data.get('org')
        if not org:
            if actor.org:
                org = actor.org
            elif actor.is_superuser:
                org = Organization.objects.first()
        if not org:
            raise ValidationError({'org': 'Organization is required.'})
        # Pre-validate phone uniqueness (DB constraint fires too late to return 400)
        phone = serializer.validated_data.get('phone_number', '')
        if phone:
            phone_norm = normalize_phone_number(phone)
            if phone_norm and User.objects.filter(org=org, phone_normalized=phone_norm).exists():
                raise ValidationError(
                    {'phone_number': 'This phone number is already registered in this organization.'}
                )
        employee_code = serializer.validated_data.get('employee_code', '')
        if employee_code and User.objects.filter(org=org, employee_code=employee_code).exists():
            raise ValidationError(
                {'employee_code': 'This employee code is already registered in this organization.'}
            )
        department = serializer.validated_data.get('department')
        _validate_department_org(department, org)
        user = serializer.save(org=org)
        
        # Dispatch Invite Email
        if user.email:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = PasswordResetTokenGenerator().make_token(user)
            reset_url = f"{settings.FRONTEND_BASE_URL}/set-password?uid={uid}&token={token}"
            
            subject = "Welcome to Field Senses! Set your password"
            message = (
                f"Hello {user.first_name or user.username},\n\n"
                f"An account has been created for you at Field Senses.\n\n"
                f"Please click the link below to securely set your password:\n"
                f"{reset_url}\n\n"
                f"If you did not request this, please ignore this email.\n\n"
                f"Thank you,\n"
                f"Field Senses Team"
            )
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
            
            user.is_invited = True
            user.save(update_fields=['is_invited'])

        log_audit(actor, 'user.create', user, org=org, request=self.request)

    @action(detail=True, methods=['post'])
    def send_reset_link(self, request, pk=None):
        user = self.get_object()
        if not user.email:
            return Response({'detail': 'User does not have an email address.'}, status=400)
            
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)
        reset_url = f"{settings.FRONTEND_BASE_URL}/set-password?uid={uid}&token={token}"
        
        subject = "Reset your Field Senses password"
        message = (
            f"Hello {user.first_name or user.username},\n\n"
            f"You requested a password reset for your Field Senses account.\n\n"
            f"Please click the link below to securely set your new password:\n"
            f"{reset_url}\n\n"
            f"If you did not request this, please ignore this email.\n\n"
            f"Thank you,\n"
            f"Field Senses Team"
        )
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,
        )
        
        log_audit(request.user, 'user.send_reset', user, org=user.org, request=request)
        return Response({'detail': 'Password reset link sent to user email.'})

    def perform_update(self, serializer):
        user = self.get_object()
        phone = serializer.validated_data.get('phone_number', None)
        if phone is not None:
            phone_norm = normalize_phone_number(phone)
            if phone_norm and User.objects.filter(
                org=user.org,
                phone_normalized=phone_norm,
            ).exclude(pk=user.pk).exists():
                raise ValidationError(
                    {'phone_number': 'This phone number is already registered in this organization.'}
                )
        employee_code = serializer.validated_data.get('employee_code', None)
        if employee_code:
            if User.objects.filter(org=user.org, employee_code=employee_code).exclude(pk=user.pk).exists():
                raise ValidationError(
                    {'employee_code': 'This employee code is already registered in this organization.'}
                )
        department = serializer.validated_data.get('department')
        if 'department' in serializer.validated_data:
            _validate_department_org(department, user.org)
        user = serializer.save()
        log_audit(self.request.user, 'user.update', user, request=self.request)

    def perform_destroy(self, instance):
        log_audit(self.request.user, 'user.delete', instance, request=self.request)
        instance.is_active = False
        instance.save(update_fields=['is_active'])


from datetime import timedelta
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import FieldEmployeeTokenSerializer


def generate_field_employee_tokens(employee, deployment):
    """
    Generates custom SimpleJWT refresh and access tokens for a deployed field employee.
    Access TTL: 8 hours. Refresh TTL: 24 hours.
    """
    email = employee.email.strip() if employee.email and employee.email.strip() else f"{employee.employee_code.lower()}@logicon-employee.internal"
    user_id = employee.user_id if employee.user_id else employee.id

    refresh = RefreshToken()
    refresh.set_exp(lifetime=timedelta(hours=24))

    claims = {
        'user_id': user_id,
        'email': email,
        'first_name': employee.first_name,
        'last_name': employee.last_name,
        'is_staff': False,
        'user_type': 'field',
        'field_access': True,
        'field_role': 'EMPLOYEE',
        'field_site_scope': [str(deployment.site_id)],
        'deployment_site_id': deployment.site_id,
        'logicon_employee_id': employee.id,
        'logicon_deployment_id': deployment.id,
    }

    for key, val in claims.items():
        refresh[key] = val

    access = refresh.access_token
    access.set_exp(lifetime=timedelta(hours=8))
    for key, val in claims.items():
        access[key] = val

    return {
        'access': str(access),
        'refresh': str(refresh),
    }


class FieldEmployeeTokenView(APIView):
    """
    Authentication endpoint for deployed field employees accessing the standalone mobile app.
    Authenticates via (org_id, employee_code, PIN). Returns access/refresh tokens + 60s single-use handoff code.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        import secrets
        from django.core.cache import cache

        serializer = FieldEmployeeTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee = serializer.validated_data['employee']
        deployment = serializer.validated_data['deployment']

        tokens = generate_field_employee_tokens(employee, deployment)

        # Auto-provision employee into FieldSense if not yet provisioned
        from apps.deployment.tasks import provision_employee_in_fieldsense
        try:
            provision_employee_in_fieldsense(employee.id, deployment.id)
        except Exception as e:
            logger.warning("Auto-provisioning during login failed: %s", e)

        # Generate 60-second single-use opaque handoff code
        code = secrets.token_hex(32)

        cache.set(f"handoff:{code}", tokens, timeout=60)

        # Register handoff code with FieldSense Backend so FieldSense BE can exchange it
        fieldsense_internal_url = getattr(settings, 'FIELD_SENSES_INTERNAL_URL', 'http://127.0.0.1:8000').rstrip('/')
        service_key = getattr(settings, 'FIELD_SENSES_SERVICE_ACCOUNT_KEY', 'fieldsense-secret-service-key-2026')

        try:
            import json
            import urllib.request
            req_data = json.dumps({"code": code, "tokens": tokens}).encode('utf-8')
            req = urllib.request.Request(
                f"{fieldsense_internal_url}/api/internal/register-handoff-code/",
                data=req_data,
                headers={"X-Service-Account-Key": service_key, "Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                pass
        except Exception as e:
            logger.warning("Failed to register handoff code with FieldSense BE: %s", e)

        tokens['code'] = code
        return Response(tokens, status=status.HTTP_200_OK)



