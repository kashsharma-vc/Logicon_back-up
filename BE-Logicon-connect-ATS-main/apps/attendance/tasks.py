import csv
from io import StringIO
from django.utils import timezone
from django.core.mail import EmailMessage
from celery import shared_task
from apps.attendance.models import AttendanceSession
from apps.attendance.export_excel import generate_attendance_excel
from apps.accounts.models import User

@shared_task
def send_daily_attendance_report():
    today = timezone.localdate()
    
    # Get all field user attendance for today
    qs = AttendanceSession.objects.filter(
        shift_date=today,
        employee__user_type='field'
    ).select_related('employee__department')

    if not qs.exists():
        return "No attendance records found for today."

    excel_data = generate_attendance_excel(qs)

    # Get Admin Email
    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user or not admin_user.email:
        return "No admin user with an email found to send the report."

    admin_email = admin_user.email

    # Send Email
    subject = f"Daily Field Attendance Report - {today}"
    body = f"Hello Admin,\n\nPlease find attached the daily field staff attendance report for {today}.\n\nBest,\nLogicon System"
    
    email = EmailMessage(
        subject=subject,
        body=body,
        to=[admin_email],
    )
    email.attach(f"attendance_report_{today}.xlsx", excel_data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    email.send()

    return f"Successfully sent daily report to {admin_email}"
