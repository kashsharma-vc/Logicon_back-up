"""
apps/attendance/models.py

Attendance check-in/check-out with geolocation tracking.
Employee taps photo -> check-in with lat/lng/address/timestamp.
Check-out calculates hours worked.
Admin dashboard for analytics.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


class AttendanceSession(TimeStampedModel):
    """
    Single check-in/check-out session for an employee.
    Created on check-in, closed on check-out.
    """

    STATUS_CHOICES = [
        ('active', 'Active (Checked In)'),
        ('completed', 'Completed (Checked Out)'),
        ('missed_checkout', 'Missed Check-out (Auto-closed)'),
        ('manual_adjustment', 'Manually Adjusted'),
    ]

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_sessions',
        limit_choices_to={'user_type': 'internal'},
    )
    site = models.ForeignKey(
        'sites.SiteProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_sessions',
        help_text='Site where attendance was marked (from employee assignment or GPS)',
    )
    client = models.ForeignKey(
        'sites.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_sessions',
    )

    # Check-in data
    check_in_at = models.DateTimeField()
    check_in_lat = models.DecimalField(max_digits=9, decimal_places=6)
    check_in_lng = models.DecimalField(max_digits=9, decimal_places=6)
    check_in_address = models.TextField(blank=True)
    check_in_accuracy_m = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text='GPS accuracy in meters',
    )
    check_in_photo = models.ImageField(
        upload_to='attendance/checkin/%Y/%m/%d/',
        null=True, blank=True,
        help_text='Optional selfie/photo at check-in',
    )
    check_in_device_info = models.JSONField(default=dict, blank=True)
    check_in_ip = models.GenericIPAddressField(null=True, blank=True)

    # Check-out data
    check_out_at = models.DateTimeField(null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_address = models.TextField(blank=True)
    check_out_accuracy_m = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    check_out_photo = models.ImageField(
        upload_to='attendance/checkout/%Y/%m/%d/',
        null=True, blank=True,
    )
    check_out_device_info = models.JSONField(default=dict, blank=True)
    check_out_ip = models.GenericIPAddressField(null=True, blank=True)

    # Calculated
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    break_minutes = models.PositiveIntegerField(default=0)

    # Shift reference
    expected_shift_start = models.TimeField(null=True, blank=True)
    expected_shift_end = models.TimeField(null=True, blank=True)
    shift_date = models.DateField(help_text='Date of the shift (for night shifts crossing midnight)')

    # Auto-close tracking
    auto_closed = models.BooleanField(default=False)
    auto_closed_at = models.DateTimeField(null=True, blank=True)
    manual_override_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='attendance_manual_overrides',
    )
    manual_override_reason = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Attendance Session'
        verbose_name_plural = 'Attendance Sessions'
        ordering = ['-check_in_at']
        indexes = [
            models.Index(fields=['employee', 'check_in_at']),
            models.Index(fields=['site', 'check_in_at']),
            models.Index(fields=['status', 'check_in_at']),
            models.Index(fields=['shift_date', 'employee']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'shift_date'],
                condition=models.Q(status='active'),
                name='unique_active_session_per_employee_per_day',
            ),
        ]

    def __str__(self):
        return f"{self.employee} - {self.shift_date} ({self.get_status_display()})"

    @property
    def is_active(self):
        return self.status == 'active'

    @property
    def duration_minutes(self):
        if self.check_out_at and self.check_in_at:
            delta = self.check_out_at - self.check_in_at
            return int(delta.total_seconds() / 60)
        if self.check_in_at:
            delta = timezone.now() - self.check_in_at
            return int(delta.total_seconds() / 60)
        return 0

    def calculate_hours(self):
        """Calculate total hours, overtime, etc."""
        if not self.check_out_at:
            return

        total_minutes = self.duration_minutes
        if total_minutes <= 0:
            return

        # Subtract break time
        worked_minutes = total_minutes - self.break_minutes
        if worked_minutes < 0:
            worked_minutes = 0

        self.total_hours = round(worked_minutes / 60, 2)

        # Overtime: beyond 8 hours (configurable per site/client later)
        standard_hours = 8
        if self.total_hours > standard_hours:
            self.overtime_hours = round(self.total_hours - standard_hours, 2)
        else:
            self.overtime_hours = 0

    def close_session(self, check_out_data: dict, user=None):
        """Close the session with check-out data."""
        self.check_out_at = check_out_data.get('timestamp', timezone.now())
        self.check_out_lat = check_out_data.get('lat')
        self.check_out_lng = check_out_data.get('lng')
        self.check_out_address = check_out_data.get('address', '')
        self.check_out_accuracy_m = check_out_data.get('accuracy')
        self.check_out_photo = check_out_data.get('photo')
        self.check_out_device_info = check_out_data.get('device_info', {})
        self.check_out_ip = check_out_data.get('ip')
        self.status = 'completed'
        self.calculate_hours()
        self.save(update_fields=[
            'check_out_at', 'check_out_lat', 'check_out_lng', 'check_out_address',
            'check_out_accuracy_m', 'check_out_photo', 'check_out_device_info',
            'check_out_ip', 'status', 'total_hours', 'overtime_hours', 'updated_at',
        ])


class AttendanceBreak(TimeStampedModel):
    """Break periods within an attendance session."""

    BREAK_TYPE_CHOICES = [
        ('lunch', 'Lunch'),
        ('tea', 'Tea/Coffee'),
        ('personal', 'Personal'),
        ('other', 'Other'),
    ]

    session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name='breaks',
    )
    break_type = models.CharField(max_length=16, choices=BREAK_TYPE_CHOICES, default='lunch')
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(default=0)
    is_auto = models.BooleanField(default=False, help_text='Auto-detected break (e.g., geofence exit)')

    class Meta:
        ordering = ['session', 'start_at']

    def __str__(self):
        return f"Break ({self.break_type}) for {self.session}"

    def close_break(self):
        self.end_at = timezone.now()
        if self.start_at:
            delta = self.end_at - self.start_at
            self.duration_minutes = int(delta.total_seconds() / 60)
        self.save(update_fields=['end_at', 'duration_minutes', 'updated_at'])
        # Update parent session break_minutes
        total_breaks = self.session.breaks.aggregate(
            total=models.Sum('duration_minutes')
        )['total'] or 0
        self.session.break_minutes = total_breaks
        self.session.save(update_fields=['break_minutes', 'updated_at'])


class AttendanceCorrection(TimeStampedModel):
    """Admin/HR corrections to attendance records."""

    CORRECTION_TYPE_CHOICES = [
        ('check_in_time', 'Check-in Time'),
        ('check_out_time', 'Check-out Time'),
        ('add_session', 'Add Missing Session'),
        ('remove_session', 'Remove Invalid Session'),
        ('shift_change', 'Shift Assignment Change'),
        ('break_adjustment', 'Break Time Adjustment'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name='corrections',
        null=True, blank=True,
    )
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_corrections',
    )
    correction_type = models.CharField(max_length=20, choices=CORRECTION_TYPE_CHOICES)
    reason = models.TextField()
    original_data = models.JSONField(default=dict, blank=True)
    corrected_data = models.JSONField(default=dict, blank=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='requested_attendance_corrections',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_attendance_corrections',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='pending')
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.correction_type} for {self.employee} ({self.get_status_display()})"


class SiteGeofence(TimeStampedModel):
    """Geofence configuration for a site - validates check-in location."""

    site = models.OneToOneField(
        'sites.SiteProfile',
        on_delete=models.CASCADE,
        related_name='geofence',
    )
    center_lat = models.DecimalField(max_digits=9, decimal_places=6)
    center_lng = models.DecimalField(max_digits=9, decimal_places=6)
    radius_meters = models.PositiveIntegerField(default=100, help_text='Allowed radius in meters')
    is_active = models.BooleanField(default=True)
    require_within_geofence = models.BooleanField(
        default=True,
        help_text='Reject check-in if outside geofence',
    )
    allowed_wifi_ssids = models.JSONField(
        default=list, blank=True,
        help_text='List of allowed WiFi SSIDs for additional verification',
    )

    class Meta:
        verbose_name = 'Site Geofence'
        verbose_name_plural = 'Site Geofences'

    def __str__(self):
        return f"Geofence for {self.site} ({self.radius_meters}m)"

    def is_within_geofence(self, lat: float, lng: float) -> tuple[bool, float]:
        """Check if coordinates are within geofence. Returns (is_within, distance_meters)."""
        import math
        R = 6371000  # Earth radius in meters
        lat1, lng1 = math.radians(float(self.center_lat)), math.radians(float(self.center_lng))
        lat2, lng2 = math.radians(lat), math.radians(lng)
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        return distance <= self.radius_meters, distance


class AttendancePolicy(TimeStampedModel):
    """Attendance rules per site/client/org."""

    SCOPE_CHOICES = [
        ('org', 'Organization'),
        ('client', 'Client'),
        ('site', 'Site'),
    ]

    org = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='attendance_policies',
    )
    scope = models.CharField(max_length=16, choices=SCOPE_CHOICES, default='org')
    client = models.ForeignKey(
        'sites.Client',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='attendance_policies',
    )
    site = models.ForeignKey(
        'sites.SiteProfile',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='attendance_policies',
    )

    # Shift rules
    standard_shift_hours = models.DecimalField(max_digits=4, decimal_places=1, default=8.0)
    max_shift_hours = models.DecimalField(max_digits=4, decimal_places=1, default=12.0)
    min_break_minutes = models.PositiveIntegerField(default=30, help_text='Min break after 6 hours')

    # Grace periods
    check_in_grace_minutes = models.PositiveIntegerField(default=15)
    check_out_grace_minutes = models.PositiveIntegerField(default=15)

    # Auto-close
    auto_close_after_hours = models.PositiveIntegerField(default=14, help_text='Auto close session after hours')
    auto_close_enabled = models.BooleanField(default=True)

    # Overtime
    overtime_after_hours = models.DecimalField(max_digits=4, decimal_places=1, default=8.0)
    overtime_multiplier = models.DecimalField(max_digits=3, decimal_places=2, default=1.5)
    max_overtime_hours_per_day = models.DecimalField(max_digits=4, decimal_places=1, default=4.0)

    # Late/Early
    late_threshold_minutes = models.PositiveIntegerField(default=15)
    early_departure_threshold_minutes = models.PositiveIntegerField(default=15)

    # Location
    require_photo = models.BooleanField(default=False)
    require_within_geofence = models.BooleanField(default=True)
    max_gps_accuracy_meters = models.PositiveIntegerField(default=50)

    is_active = models.BooleanField(default=True)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-effective_from']
        constraints = [
            models.UniqueConstraint(
                fields=['org', 'scope', 'client', 'site', 'effective_from'],
                name='unique_attendance_policy_per_scope_date',
            ),
        ]

    def __str__(self):
        scope_str = self.client or self.site or self.org
        return f"Policy for {scope_str} ({self.effective_from})"