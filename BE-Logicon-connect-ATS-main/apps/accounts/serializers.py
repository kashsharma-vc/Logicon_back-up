"""
apps/accounts/serializers.py

User serializers for list, create, and update operations.
Also: EmailTokenObtainPairSerializer — email-based JWT login.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth.models import update_last_login

from apps.core.models import Department
from .models import User


class UserListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    department_code = serializers.CharField(source='department.code', read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'phone_normalized', 'employee_code',
            'user_type', 'org', 'department', 'department_name', 'department_code',
            'is_active', 'is_invited',
            'last_invited_at', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        style={'input_type': 'password'},
    )
    employee_code = serializers.CharField(required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'phone_number', 'employee_code', 'user_type',
            'org', 'department', 'is_active', 'is_invited', 'password',
        ]
        validators = []

    def validate_email(self, value):
        if not value:
            return value
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_user_type(self, value):
        allowed = {'internal', 'client', 'field'}
        if value not in allowed:
            raise serializers.ValidationError(
                f"user_type must be one of: {', '.join(sorted(allowed))}."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name',
            'phone_number', 'employee_code', 'user_type',
            'department', 'is_active', 'is_invited',
        ]
        validators = []

    def validate_email(self, value):
        if not value:
            return value
        value = value.strip().lower()
        qs = User.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_user_type(self, value):
        allowed = {'internal', 'client', 'field'}
        if value not in allowed:
            raise serializers.ValidationError(
                f"user_type must be one of: {', '.join(sorted(allowed))}."
            )
        return value


class SetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        try:
            pk = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({'uid': 'Invalid or expired link.'})

        if not user.is_active:
            raise serializers.ValidationError({'uid': 'This user account is inactive.'})

        if not PasswordResetTokenGenerator().check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': 'Invalid or expired link.'})

        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})

        try:
            validate_password(attrs['password'], user=user)
        except Exception as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})

        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['password'])
        user.save(update_fields=['password'])
        return user


import logging

logger = logging.getLogger(__name__)


def resolve_user_field_claims(user):
    """
    Computes field_access, field_role, field_site_scope, and deployment_site_id for user.
    Uses capability system and UserRoleAssignment scope resolution:
    - field_access: "field_tracking.read" in get_user_capabilities(user)
    - field_role: derived from UserRoleAssignment role codes (ADMIN, MANAGER, SALES, EMPLOYEE)
    - field_site_scope: ["*"] if ADMIN or assigned to root scope node; else resolved scope subtree IDs
    """
    from apps.access.capabilities import get_user_capabilities, FIELD_TRACKING_READ
    from apps.access.models import UserRoleAssignment
    from apps.access.scope import get_user_scope_nodes
    from apps.sites.models import SiteProfile
    from django.db.models import Q

    is_superuser = getattr(user, 'is_superuser', False)
    caps = set(get_user_capabilities(user))

    # 1. field_access computed EXACTLY via capability system
    field_access = is_superuser or FIELD_TRACKING_READ in caps

    if not field_access:
        return {
            'field_access': False,
            'field_role': None,
            'field_site_scope': [],
            'deployment_site_id': None,
        }

    # 2. field_role computed from actual assigned AccessRole
    role_codes = set(
        UserRoleAssignment.objects.filter(user=user, role__is_active=True)
        .values_list('role__code', flat=True)
    )

    if is_superuser or 'admin' in role_codes:
        field_role = "ADMIN"
    elif role_codes & {'sales_manager', 'sales_executive'}:
        field_role = "SALES"
    elif role_codes & {'operations_manager', 'operations_executive', 'site_manager', 'field_supervisor'}:
        field_role = "MANAGER"
    elif getattr(user, 'user_type', '') == 'field':
        field_role = "EMPLOYEE"
    elif field_access:
        field_role = "MANAGER"
    else:
        field_role = None

    # 3. field_site_scope: wildcard ["*"] only for ADMIN or root scope node; else real subtree site IDs
    if is_superuser or field_role == "ADMIN":
        field_site_scope = ["*"]
    else:
        nodes = get_user_scope_nodes(user)
        has_root_scope = any(node and (node.parent is None or node.path == 'logicon') for node in nodes)
        if has_root_scope:
            field_site_scope = ["*"]
        elif not nodes:
            field_site_scope = []
        else:
            q_objects = Q()
            for node in nodes:
                if getattr(node, 'path', ''):
                    q_objects |= Q(scope_node__path=node.path) | Q(scope_node__path__startswith=node.path + '/')
            if q_objects:
                site_ids = list(
                    SiteProfile.objects.filter(q_objects)
                    .values_list('id', flat=True)
                    .distinct()
                )
                field_site_scope = [str(sid) for sid in site_ids]
            else:
                field_site_scope = []

    return {
        'field_access': field_access,
        'field_role': field_role,
        'field_site_scope': field_site_scope,
        'deployment_site_id': None,
    }





class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims for SSO integration with Field Senses
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['user_type'] = getattr(user, 'user_type', '')
        token['is_staff'] = getattr(user, 'is_staff', False)
        
        # FieldSense extended identity claims
        field_claims = resolve_user_field_claims(user)
        for key, val in field_claims.items():
            token[key] = val

        return token

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise AuthenticationFailed(
                'No active account found with the given credentials',
                'no_active_account',
            )
        if not user.is_active:
            raise AuthenticationFailed(
                'No active account found with the given credentials',
                'no_active_account',
            )
        authenticated = authenticate(
            request=self.context.get('request'),
            username=user.get_username(),
            password=password,
        )
        if not api_settings.USER_AUTHENTICATION_RULE(authenticated):
            raise AuthenticationFailed(
                'No active account found with the given credentials',
                'no_active_account',
            )
        self.user = authenticated
        refresh = self.get_token(self.user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, self.user)

        # Log User Login Activity
        try:
            from django.utils import timezone

            from apps.audit.models import UserActivityLog

            request = self.context.get('request')
            ip_address = None
            user_agent = ''
            if request:
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip_address = x_forwarded_for.split(',')[0].strip()
                else:
                    ip_address = request.META.get('REMOTE_ADDR')

            now = timezone.now()
            local_time = timezone.localtime(now)
            
            # Close/Timeout previous active sessions for this user
            UserActivityLog.objects.filter(
                user=self.user,
                session_status='active'
            ).update(
                session_status='timed_out',
                logout_time=now
            )

            # Determine attendance status: Late if first login of the day is after 09:30 AM local time
            is_late = local_time.hour > 9 or (local_time.hour == 9 and local_time.minute > 30)
            today_start = local_time.replace(hour=0, minute=0, second=0, microsecond=0)
            has_logged_in_today = UserActivityLog.objects.filter(
                user=self.user,
                login_time__gte=today_start
            ).exists()

            attendance_status = 'present'
            if not has_logged_in_today and is_late:
                attendance_status = 'late'

            UserActivityLog.objects.create(
                user=self.user,
                login_time=now,
                ip_address=ip_address,
                user_agent=user_agent,
                session_status='active',
                attendance_status=attendance_status
            )
        except Exception:
            # Prevent login failure if logging encounters an issue
            pass

        return data


class FieldEmployeeTokenSerializer(serializers.Serializer):
    org_id = serializers.IntegerField(required=True)
    employee_code = serializers.CharField(required=True, max_length=50)
    pin = serializers.CharField(required=True, max_length=32, write_only=True)

    def validate(self, attrs):
        org_id = attrs.get('org_id')
        employee_code = attrs.get('employee_code', '').strip()
        pin = attrs.get('pin', '').strip()

        if not pin.isdigit() or len(pin) < 6:
            raise serializers.ValidationError({'pin': 'PIN must be at least 6 numeric digits.'})

        from apps.deployment.models import Employee, SiteDeployment
        from django.contrib.auth.hashers import check_password

        employee = Employee.objects.filter(org_id=org_id, employee_code__iexact=employee_code).first()

        if not employee:
            raise serializers.ValidationError({'non_field_errors': ['Invalid organization, employee code, or PIN.']})

        if employee.field_is_locked:
            raise serializers.ValidationError({
                'non_field_errors': ['Account is locked due to multiple failed PIN attempts. Please contact HR to reset your PIN.']
            })

        if employee.status != 'active':
            raise serializers.ValidationError({'non_field_errors': ['Employee account is not active.']})

        if not employee.field_pin_hash:
            raise serializers.ValidationError({'non_field_errors': ['PIN has not been set for this employee. Please contact HR.']})

        if not check_password(pin, employee.field_pin_hash):
            employee.field_login_failed_attempts += 1
            if employee.field_login_failed_attempts >= 10:
                employee.field_is_locked = True
                employee.save(update_fields=['field_login_failed_attempts', 'field_is_locked'])
                raise serializers.ValidationError({
                    'non_field_errors': ['Account has been locked due to 10 consecutive failed PIN attempts. Please contact HR to reset your PIN.']
                })
            else:
                employee.save(update_fields=['field_login_failed_attempts'])
                remaining = 10 - employee.field_login_failed_attempts
                raise serializers.ValidationError({
                    'non_field_errors': [f'Invalid organization, employee code, or PIN. {remaining} attempts remaining before account lockout.']
                })

        # Success - reset failure count
        if employee.field_login_failed_attempts > 0:
            employee.field_login_failed_attempts = 0
            employee.save(update_fields=['field_login_failed_attempts'])

        # Validate active deployment
        deployment = SiteDeployment.objects.filter(employee=employee, status='active').first()
        if not deployment:
            raise serializers.ValidationError({
                'non_field_errors': ['No active deployment found for this employee. Access to FieldSense requires an active deployment.']
            })

        attrs['employee'] = employee
        attrs['deployment'] = deployment
        return attrs

