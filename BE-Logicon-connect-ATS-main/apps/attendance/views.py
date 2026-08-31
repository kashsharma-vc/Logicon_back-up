from rest_framework import views, permissions
from rest_framework.response import Response
from django.utils import timezone
from django.http import HttpResponse
from django.core.mail import EmailMessage
from .models import AttendanceSession
from apps.accounts.models import User
from .export_excel import generate_attendance_excel

class AdminDashboardAttendanceView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        date_start = request.query_params.get('date_start', str(today))
        date_end = request.query_params.get('date_end', str(today))
        employee_id = request.query_params.get('employee_id')

        qs = AttendanceSession.objects.filter(
            shift_date__gte=date_start,
            shift_date__lte=date_end,
            employee__user_type='field'
        ).select_related('employee__department')

        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        # Build dashboard data grouped by (employee_id, shift_date)
        from collections import defaultdict
        grouped = defaultdict(lambda: {
            'check_in_time': None,
            'check_out_time': None,
            'total_hours': 0.00,
            'employee_name': '',
            'role': '',
            'department': '',
            'session_status': '-'
        })

        for session in qs:
            key = (session.employee_id, session.shift_date)
            emp = session.employee
            
            grouped[key]['employee_name'] = emp.get_full_name() or emp.email
            grouped[key]['role'] = emp.user_type.capitalize() if emp.user_type else '-'
            grouped[key]['department'] = emp.department.name if emp.department else '-'
            
            # Since multiple sessions can exist per day, just take earliest in and latest out for summary
            if not grouped[key]['check_in_time'] or (session.check_in_at and session.check_in_at < grouped[key]['check_in_time']):
                grouped[key]['check_in_time'] = session.check_in_at
                
            if session.check_out_at:
                if not grouped[key]['check_out_time'] or session.check_out_at > grouped[key]['check_out_time']:
                    grouped[key]['check_out_time'] = session.check_out_at
                    
            grouped[key]['total_hours'] += float(session.total_hours or 0)
            
            if session.status == 'active':
                grouped[key]['session_status'] = 'Active Now'
            else:
                grouped[key]['session_status'] = 'Closed'

        dashboard_data = []
        for (emp_id, s_date), data in grouped.items():
            hours = int(data['total_hours'])
            minutes = int((data['total_hours'] - hours) * 60)
            duration_formatted = f"{hours}h {minutes}m" if data['total_hours'] > 0 else "-"
            
            ip_address = "127.0.0.1" if data['check_in_time'] else "-"

            dashboard_data.append({
                'employee_id': emp_id,
                'employee_name': data['employee_name'],
                'date': str(s_date),
                'check_in_time': data['check_in_time'],
                'check_out_time': data['check_out_time'],
                'total_hours': data['total_hours'],
                'meetings_total': 0,
                'meetings_completed': 0,
                'meetings_pending': 0,
                'role': data['role'],
                'department': data['department'],
                'session_status': data['session_status'],
                'duration_formatted': duration_formatted,
                'ip_address': ip_address
            })
            
        dashboard_data.sort(key=lambda x: x['date'], reverse=True)
        return Response(dashboard_data)

class AdminDashboardAttendanceExportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        date_start = request.query_params.get('date_start', str(today))
        date_end = request.query_params.get('date_end', str(today))
        employee_id = request.query_params.get('employee_id')

        qs = AttendanceSession.objects.filter(
            shift_date__gte=date_start,
            shift_date__lte=date_end,
            employee__user_type='field'
        ).select_related('employee__department')

        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        excel_data = generate_attendance_excel(qs)

        response = HttpResponse(excel_data, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="attendance_report_{date_start}_to_{date_end}.xlsx"'
        return response

class AdminDashboardAttendanceEmailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        today = timezone.localdate()
        date_start = request.data.get('date_start', str(today))
        date_end = request.data.get('date_end', str(today))
        subject = request.data.get('subject', f"Field Attendance Report - {today}")
        body = request.data.get('body', "Please find attached the field attendance report.")
        cc_list_raw = request.data.get('cc', '')
        cc_list = [email.strip() for email in cc_list_raw.split(',') if email.strip()]
        to_email = request.data.get('to')

        qs = AttendanceSession.objects.filter(
            shift_date__gte=date_start,
            shift_date__lte=date_end,
            employee__user_type='field'
        ).select_related('employee__department')

        if not to_email:
            admin_user = User.objects.filter(is_superuser=True).first()
            if admin_user and admin_user.email:
                to_email = admin_user.email
            else:
                return Response({'error': 'No admin email found and no TO address provided.'}, status=400)

        excel_data = generate_attendance_excel(qs)

        email = EmailMessage(
            subject=subject,
            body=body,
            to=[to_email],
            cc=cc_list
        )
        email.attach(f"attendance_report_{date_start}_to_{date_end}.xlsx", excel_data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        email.send()

        return Response({'message': f'Email successfully sent to {to_email}'})


class AdminDashboardAttendanceEmailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        today = timezone.localdate()
        date_start = request.data.get('date_start', str(today))
        date_end = request.data.get('date_end', str(today))
        subject = request.data.get('subject', f"Field Attendance Report - {today}")
        body = request.data.get('body', "Please find attached the field attendance report.")
        cc_list_raw = request.data.get('cc', '')
        cc_list = [email.strip() for email in cc_list_raw.split(',') if email.strip()]
        to_email = request.data.get('to')

        qs = AttendanceSession.objects.filter(
            shift_date__gte=date_start,
            shift_date__lte=date_end,
            employee__user_type='field'
        ).select_related('employee__department')

        if not to_email:
            admin_user = User.objects.filter(is_superuser=True).first()
            if admin_user and admin_user.email:
                to_email = admin_user.email
            else:
                return Response({'error': 'No admin email found and no TO address provided.'}, status=400)

        excel_data = generate_attendance_excel(qs)

        email = EmailMessage(
            subject=subject,
            body=body,
            to=[to_email],
            cc=cc_list
        )
        email.attach(f"attendance_report_{date_start}_to_{date_end}.xlsx", excel_data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        email.send()

        return Response({'message': f'Email successfully sent to {to_email}'})

