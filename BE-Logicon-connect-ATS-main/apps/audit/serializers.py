from rest_framework import serializers
from .models import AuditLog, UserActivityLog, EmailReportSettings



class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'org', 'scope_node',
            'action', 'object_type', 'object_id',
            'metadata', 'ip_address', 'user_agent', 'created_at',
        ]
        read_only_fields = fields


class UserActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    employee_code = serializers.CharField(source='user.employee_code', read_only=True)
    department_name = serializers.CharField(source='user.department.name', read_only=True, default=None)
    department_code = serializers.CharField(source='user.department.code', read_only=True, default=None)
    role_name = serializers.SerializerMethodField()

    class Meta:
        model = UserActivityLog
        fields = [
            'id', 'user', 'username', 'first_name', 'last_name', 'email',
            'employee_code', 'department_name', 'department_code', 'role_name',
            'login_time', 'logout_time', 'ip_address', 'user_agent',
            'session_status', 'attendance_status',
        ]
        read_only_fields = fields

    def get_role_name(self, obj):
        from apps.access.models import UserRoleAssignment
        assignment = UserRoleAssignment.objects.filter(user=obj.user).select_related('role').first()
        if assignment and assignment.role:
            return assignment.role.name
        return None


class EmailReportSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailReportSettings
        fields = ['id', 'subject', 'body', 'is_enabled']
        read_only_fields = ['id']


