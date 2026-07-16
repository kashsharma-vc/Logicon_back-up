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

