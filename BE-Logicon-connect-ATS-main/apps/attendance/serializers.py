"""
apps/attendance/serializers.py
"""

from rest_framework import serializers
from django.utils import timezone

from apps.attendance.models import (
    AttendanceSession,
    AttendanceBreak,
    AttendanceCorrection,
    SiteGeofence,
    AttendancePolicy,
)
from apps.deployment.models import SiteDeployment


class AttendanceCheckInSerializer(serializers.Serializer):
    """Serializer for check-in request."""

    lat = serializers.DecimalField(max_digits=9, decimal_places=6)
    lng = serializers.DecimalField(max_digits=9, decimal_places=6)
    accuracy = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, default='')
    photo = serializers.ImageField(required=False, allow_null=True)
    device_info = serializers.JSONField(required=False, default=dict)
    ip = serializers.IPAddressField(required=False, allow_null=True)

    def validate(self, attrs):
        # Check if employee already has active session today
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            today = timezone.now().date()
            active = AttendanceSession.objects.filter(
                employee=request.user,
                shift_date=today,
                status='active',
            ).exists()
            if active:
                raise serializers.ValidationError('Already checked in today. Check out first.')
        return attrs


class AttendanceCheckOutSerializer(serializers.Serializer):
    """Serializer for check-out request."""

    lat = serializers.DecimalField(max_digits=9, decimal_places=6)
    lng = serializers.DecimalField(max_digits=9, decimal_places=6)
    accuracy = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, default='')
    photo = serializers.ImageField(required=False, allow_null=True)
    device_info = serializers.JSONField(required=False, default=dict)
    ip = serializers.IPAddressField(required=False, allow_null=True)


class AttendanceSessionSerializer(serializers.ModelSerializer):
    """Serializer for attendance session read."""

    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    breaks = serializers.SerializerMethodField()
    policy_applied = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            'id',
            'employee',
            'employee_name',
            'employee_code',
            'site',
            'site_name',
            'client',
            'client_name',
            'check_in_at',
            'check_in_lat',
            'check_in_lng',
            'check_in_address',
            'check_in_accuracy_m',
            'check_in_photo',
            'check_out_at',
            'check_out_lat',
            'check_out_lng',
            'check_out_address',
            'check_out_accuracy_m',
            'check_out_photo',
            'status',
            'total_hours',
            'overtime_hours',
            'break_minutes',
            'duration_minutes',
            'is_active',
            'expected_shift_start',
            'expected_shift_end',
            'shift_date',
            'breaks',
            'policy_applied',
            'auto_closed',
            'manual_override_by',
            'manual_override_reason',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_breaks(self, obj):
        return AttendanceBreakSerializer(obj.breaks.all(), many=True).data

    def get_policy_applied(self, obj):
        from apps.attendance.models import AttendancePolicy
        policy = AttendancePolicy.objects.filter(
            org=obj.employee.org,
        ).filter(
            models.Q(scope='org') |
            models.Q(scope='client', client=obj.client) |
            models.Q(scope='site', site=obj.site)
        ).filter(
            effective_from__lte=obj.shift_date
        ).filter(
            models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=obj.shift_date)
        ).order_by('-scope', '-effective_from').first()
        if policy:
            return {
                'standard_shift_hours': float(policy.standard_shift_hours),
                'overtime_after_hours': float(policy.overtime_after_hours),
                'late_threshold_minutes': policy.late_threshold_minutes,
            }
        return None


class AttendanceBreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceBreak
        fields = [
            'id',
            'break_type',
            'start_at',
            'end_at',
            'duration_minutes',
            'is_auto',
            'created_at',
        ]
        read_only_fields = fields


class AttendanceBreakStartSerializer(serializers.Serializer):
    break_type = serializers.ChoiceField(choices=AttendanceBreak.BREAK_TYPE_CHOICES, default='personal')


class AttendanceBreakEndSerializer(serializers.Serializer):
    break_id = serializers.IntegerField()


class AttendanceCorrectionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    session_date = serializers.DateField(source='session.shift_date', read_only=True)

    class Meta:
        model = AttendanceCorrection
        fields = [
            'id',
            'session',
            'session_date',
            'employee',
            'employee_name',
            'correction_type',
            'reason',
            'original_data',
            'corrected_data',
            'requested_by',
            'requested_by_name',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'status',
            'review_notes',
            'created_at',
        ]
        read_only_fields = [
            'requested_by', 'reviewed_by', 'reviewed_at', 'status',
            'created_at', 'original_data',
        ]


class AttendanceCorrectionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceCorrection
        fields = [
            'session',
            'correction_type',
            'reason',
            'corrected_data',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        attrs['employee'] = request.user
        attrs['requested_by'] = request.user
        return attrs


class AttendanceCorrectionReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[('approved', 'Approved'), ('rejected', 'Rejected')])
    review_notes = serializers.CharField(required=False, allow_blank=True)


class SiteGeofenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteGeofence
        fields = '__all__'
        read_only_fields = ['site', 'created_at', 'updated_at']


class AttendancePolicySerializer(serializers.ModelSerializer):
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)

    class Meta:
        model = AttendancePolicy
        fields = '__all__'
        read_only_fields = ['org', 'created_at', 'updated_at']


class EmployeeAttendanceSummarySerializer(serializers.Serializer):
    """Serializer for employee attendance summary (admin dashboard)."""

    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    department = serializers.CharField()
    site_name = serializers.CharField(allow_null=True)
    total_days = serializers.IntegerField()
    present_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    late_days = serializers.IntegerField()
    early_departure_days = serializers.IntegerField()
    total_hours = serializers.DecimalField(max_digits=8, decimal_places=2)
    overtime_hours = serializers.DecimalField(max_digits=8, decimal_places=2)
    avg_hours_per_day = serializers.DecimalField(max_digits=5, decimal_places=2)
    attendance_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class SiteAttendanceSummarySerializer(serializers.Serializer):
    """Serializer for site-level attendance summary."""

    site_id = serializers.IntegerField()
    site_name = serializers.CharField()
    total_employees = serializers.IntegerField()
    checked_in_today = serializers.IntegerField()
    checked_out_today = serializers.IntegerField()
    currently_present = serializers.IntegerField()
    attendance_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class DailyAttendanceReportSerializer(serializers.Serializer):
    """Serializer for daily attendance report."""

    date = serializers.DateField()
    site = serializers.CharField(allow_null=True)
    total_scheduled = serializers.IntegerField()
    total_present = serializers.IntegerField()
    total_absent = serializers.IntegerField()
    total_late = serializers.IntegerField()
    total_overtime = serializers.DecimalField(max_digits=8, decimal_places=2)
    sessions = AttendanceSessionSerializer(many=True)


# Add missing import
from django.db import models