"""
apps/audit/models.py

AuditLog — immutable audit trail for all significant actions.
"""

from django.conf import settings
from django.db import models
from apps.core.models import Organization, ScopeNode


class AuditLog(models.Model):
    """Append-only audit record for any action in the system."""
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    org = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    scope_node = models.ForeignKey(
        ScopeNode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=128)
    object_type = models.CharField(max_length=128)
    object_id = models.CharField(max_length=64)
    metadata = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['org', 'created_at']),
            models.Index(fields=['object_type', 'object_id']),
            models.Index(fields=['actor', 'created_at']),
        ]

    def __str__(self):
        return f"{self.actor} — {self.action} on {self.object_type}#{self.object_id}"


class UserActivityLog(models.Model):
    """Tracks login/logout, session status, and attendance for users."""
    SESSION_STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('timed_out', 'Timed Out'),
    ]

    ATTENDANCE_STATUS_CHOICES = [
        ('present', 'Present'),
        ('late', 'Late'),
        ('under_hours', 'Under Hours'),
        ('absent', 'Absent'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    login_time = models.DateTimeField(auto_now_add=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    session_status = models.CharField(
        max_length=32,
        choices=SESSION_STATUS_CHOICES,
        default='active'
    )
    attendance_status = models.CharField(
        max_length=32,
        choices=ATTENDANCE_STATUS_CHOICES,
        default='present'
    )

    class Meta:
        verbose_name = 'User Activity Log'
        verbose_name_plural = 'User Activity Logs'
        ordering = ['-login_time']
        indexes = [
            models.Index(fields=['user', 'login_time']),
            models.Index(fields=['login_time']),
        ]

    def __str__(self):
        return f"{self.user} logged in at {self.login_time}"


class EmailReportSettings(models.Model):
    """Stores email template preferences and send settings for daily log reports."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='report_settings'
    )
    subject = models.CharField(max_length=255, default="Daily Attendance & Session Logs Report")
    body = models.TextField(
        default="Hello Admin,\n\nPlease find attached the daily user attendance and session activity report.\n\nRegards,\nLogicon Team"
    )
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Email Report Settings'
        verbose_name_plural = 'Email Report Settings'

    def __str__(self):
        return f"Email report settings for {self.user.username}"


