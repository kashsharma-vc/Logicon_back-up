from celery import shared_task
from .models import EmailReportSettings
from .views import send_daily_log_report_email

@shared_task
def send_scheduled_email_reports():
    """Daily Celery Beat task that runs at 8:30 PM (20:30) to email reports to admins."""
    settings_list = EmailReportSettings.objects.filter(is_enabled=True).select_related('user')
    for settings in settings_list:
        if settings.user and settings.user.email:
            try:
                send_daily_log_report_email(settings.user, settings.subject, settings.body)
            except Exception as e:
                print(f"Failed to send daily logs email to {settings.user.email}: {e}")
