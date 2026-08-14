"""
apps/deployment/views.py

Read ViewSets + lifecycle action endpoints for Employees and SiteDeployments,
plus a read-only ViewSet for the DeploymentHistory audit trail.

Lifecycle actions require one of several capabilities (the "_any" map), so we
use a custom HasAnyCapabilityForAction permission rather than the single-cap
HasCapability.
"""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


from apps.access.permissions import HasCapability
from apps.access.querysets import (
    filter_deployment_history_for_user,
    filter_employees_for_user,
    filter_site_deployments_for_user,
)
from apps.access.scope import user_has_any_capability
from apps.access.viewsets import ScopedReadOnlyModelViewSet

from .lifecycle_services import (
    activate_deployment,
    cancel_deployment,
    complete_deployment,
    exit_employee,
    reactivate_employee,
    suspend_employee,
    transfer_deployment,
)
from .models import DeploymentHistory, Employee, SiteDeployment
from .serializers import (
    DeploymentCompleteSerializer,
    DeploymentHistorySerializer,
    DeploymentNoteSerializer,
    DeploymentTransferSerializer,
    EmployeeExitSerializer,
    EmployeeNoteSerializer,
    EmployeeSerializer,
    SiteDeploymentSerializer,
)


# ─── Permission helper ────────────────────────────────────────────────────────

class HasAnyCapabilityForAction(BasePermission):
    """
    Grants access if the user has ANY of the capabilities mapped to the current
    action via `view.action_required_capabilities` (where each value is a list
    of capability strings).
    """

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        caps_map = getattr(view, 'action_required_capabilities', None) or {}
        caps = caps_map.get(view.action)
        if not caps:
            return False
        if isinstance(caps, str):
            caps = [caps]
        return user_has_any_capability(request.user, caps)


# ─── EmployeeViewSet ──────────────────────────────────────────────────────────

class EmployeeViewSet(ScopedReadOnlyModelViewSet):
    queryset = Employee.objects.select_related(
        'org', 'candidate', 'user', 'job_role',
    ).order_by('last_name', 'first_name')
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated, HasAnyCapabilityForAction]
    scope_filter = filter_employees_for_user
    filterset_fields = ['org', 'job_role', 'status']
    search_fields = ['employee_code', 'first_name', 'last_name', 'phone', 'email']

    action_required_capabilities = {
        'list':            ['employee.read'],
        'retrieve':        ['employee.read'],
        'suspend':         ['employee.update', 'employee.manage', 'deployment.manage'],
        'reactivate':      ['employee.update', 'employee.manage', 'deployment.manage'],
        'exit':            ['employee.update', 'employee.manage', 'deployment.manage'],
        'reset_field_pin': ['employee.update', 'employee.manage', 'deployment.manage'],
    }

    def get_required_capability(self):
        # Compatibility for HasCapability if ever combined; primary check is HasAnyCapabilityForAction.
        caps = self.action_required_capabilities.get(self.action) or []
        return caps[0] if caps else None

    @action(detail=True, methods=['post'], url_path='reset_field_pin')
    def reset_field_pin(self, request, pk=None):
        employee = self.get_object()
        from apps.notifications.sms_service import generate_secure_field_pin, send_field_credentials_notification
        from .models import FieldProvisioningLog
        import hashlib
        import secrets

        raw_pin = generate_secure_field_pin()
        employee.set_field_pin(raw_pin)
        employee.field_is_locked = False
        employee.field_login_failed_attempts = 0
        employee.save(update_fields=['field_pin_hash', 'field_is_locked', 'field_login_failed_attempts', 'updated_at'])

        send_field_credentials_notification(employee, raw_pin)

        idempotency_key = hashlib.sha256(f"{employee.id}:{secrets.token_hex(8)}:pin_reset".encode('utf-8')).hexdigest()
        FieldProvisioningLog.objects.create(
            employee=employee,
            action='pin_reset',
            status='success',
            idempotency_key=idempotency_key[:64],
            error_detail=f'PIN reset by user #{request.user.id}',
        )

        return Response({
            'status': 'success',
            'detail': f'Field PIN reset successfully for employee {employee.employee_code}. Credentials dispatched via SMS.',
            'employee_code': employee.employee_code,
            'pin': raw_pin,
        }, status=status.HTTP_200_OK)



    @action(detail=True, methods=['post'], url_path='suspend')
    def suspend(self, request, pk=None):
        employee = self.get_object()
        ser = EmployeeNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        employee = suspend_employee(employee, request.user, note=ser.validated_data['note'])
        out = EmployeeSerializer(employee, context={'request': request})
        return Response(out.data)

    @action(detail=True, methods=['post'], url_path='reactivate')
    def reactivate(self, request, pk=None):
        employee = self.get_object()
        ser = EmployeeNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        employee = reactivate_employee(employee, request.user, note=ser.validated_data['note'])
        out = EmployeeSerializer(employee, context={'request': request})
        return Response(out.data)

    @action(detail=True, methods=['post'], url_path='exit')
    def exit(self, request, pk=None):
        employee = self.get_object()
        ser = EmployeeExitSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        employee = exit_employee(
            employee,
            request.user,
            exited_on=ser.validated_data.get('exited_on'),
            note=ser.validated_data['note'],
        )
        out = EmployeeSerializer(employee, context={'request': request})
        return Response(out.data)


# ─── SiteDeploymentViewSet ────────────────────────────────────────────────────

class SiteDeploymentViewSet(ScopedReadOnlyModelViewSet):
    queryset = SiteDeployment.objects.select_related(
        'org', 'employee', 'site', 'site__scope_node',
        'site__client__scope_node', 'job_role',
    ).order_by('-start_date')
    serializer_class = SiteDeploymentSerializer
    permission_classes = [IsAuthenticated, HasAnyCapabilityForAction]
    scope_filter = filter_site_deployments_for_user
    filterset_fields = ['org', 'site', 'employee', 'job_role', 'status', 'billing_type']

    action_required_capabilities = {
        'list':     ['site_deployment.read'],
        'retrieve': ['site_deployment.read'],
        'activate': ['site_deployment.update', 'site_deployment.manage', 'deployment.manage'],
        'cancel':   ['site_deployment.update', 'site_deployment.manage', 'deployment.manage'],
        'complete': ['site_deployment.update', 'site_deployment.manage', 'deployment.manage'],
        'transfer': ['site_deployment.update', 'site_deployment.manage', 'deployment.manage'],
        'retry_fieldsense_provisioning': ['site_deployment.update', 'site_deployment.manage', 'deployment.manage'],
    }

    def get_required_capability(self):
        caps = self.action_required_capabilities.get(self.action) or []
        return caps[0] if caps else None


    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        deployment = self.get_object()
        ser = DeploymentNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        deployment = activate_deployment(
            deployment, request.user, note=ser.validated_data['note'],
        )
        out = SiteDeploymentSerializer(deployment, context={'request': request})
        return Response(out.data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        deployment = self.get_object()
        ser = DeploymentNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        deployment = cancel_deployment(
            deployment, request.user, note=ser.validated_data['note'],
        )
        out = SiteDeploymentSerializer(deployment, context={'request': request})
        return Response(out.data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        deployment = self.get_object()
        ser = DeploymentCompleteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        deployment = complete_deployment(
            deployment,
            request.user,
            note=ser.validated_data['note'],
            end_date=ser.validated_data.get('end_date'),
        )
        out = SiteDeploymentSerializer(deployment, context={'request': request})
        return Response(out.data)

    @action(detail=True, methods=['post'], url_path='transfer')
    def transfer(self, request, pk=None):
        from apps.sites.models import SiteProfile
        from apps.jobs.models import JobRole

        deployment = self.get_object()
        ser = DeploymentTransferSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payload = ser.validated_data

        try:
            new_site = SiteProfile.objects.get(pk=payload['site'])
        except SiteProfile.DoesNotExist:
            return Response(
                {'site': 'Site not found.'}, status=status.HTTP_400_BAD_REQUEST,
            )

        new_job_role = None
        if payload.get('job_role'):
            try:
                new_job_role = JobRole.objects.get(pk=payload['job_role'])
            except JobRole.DoesNotExist:
                return Response(
                    {'job_role': 'Job role not found.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        result = transfer_deployment(
            deployment,
            request.user,
            new_site=new_site,
            new_job_role=new_job_role,
            start_date=payload.get('start_date'),
            note=payload['note'],
            activate_new=payload['activate_new'],
        )

        return Response({
            'old': SiteDeploymentSerializer(
                result['old'], context={'request': request},
            ).data,
            'new': SiteDeploymentSerializer(
                result['new'], context={'request': request},
            ).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='retry-fieldsense-provisioning')
    def retry_fieldsense_provisioning(self, request, pk=None):
        deployment = self.get_object()
        from .tasks import provision_employee_in_fieldsense
        provision_employee_in_fieldsense.delay(deployment.employee_id, deployment.id)
        return Response({'detail': 'Provisioning task re-queued successfully.'}, status=status.HTTP_200_OK)



# ─── DeploymentHistoryViewSet (read-only) ─────────────────────────────────────

class DeploymentHistoryViewSet(ScopedReadOnlyModelViewSet):
    queryset = DeploymentHistory.objects.select_related(
        'org', 'employee', 'deployment',
        'from_site', 'to_site',
        'from_job_role', 'to_job_role',
        'actor',
    ).order_by('-created_at')
    serializer_class = DeploymentHistorySerializer
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = 'deployment.read'
    scope_filter = filter_deployment_history_for_user
    filterset_fields = ['org', 'employee', 'deployment', 'action_type']


from .models import FieldProvisioningLog
from .serializers import FieldProvisioningLogSerializer


class FieldProvisioningLogViewSet(ScopedReadOnlyModelViewSet):
    queryset = FieldProvisioningLog.objects.select_related('employee').order_by('-created_at')
    serializer_class = FieldProvisioningLogSerializer
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = 'deployment.read'
    filterset_fields = ['employee', 'action', 'status']
    search_fields = ['idempotency_key', 'error_detail', 'employee__employee_code']


class FieldSenseStatusView(APIView):
    """
    Internal monitoring status endpoint for FieldSense integration health.
    """
    permission_classes = [IsAuthenticated, HasCapability]
    required_capability = 'deployment.read'

    def get(self, request):
        pending_count = FieldProvisioningLog.objects.filter(status='pending').count()
        failed_count = FieldProvisioningLog.objects.filter(status='failed').count()
        last_success = (
            FieldProvisioningLog.objects.filter(status='success')
            .order_by('-updated_at')
            .values_list('updated_at', flat=True)
            .first()
        )

        worker_status = "healthy"
        try:
            from config.celery import app as celery_app
            inspector = celery_app.control.inspect(timeout=1.0)
            ping_res = inspector.ping()
            if not ping_res:
                worker_status = "degraded (no worker ping response)"
        except Exception:
            worker_status = "unknown"

        return Response({
            'pending_provisioning_count': pending_count,
            'failed_provisioning_count': failed_count,
            'last_successful_provisioning_at': last_success.isoformat() if last_success else None,
            'celery_worker_status': worker_status,
        })


    search_fields = ['employee__employee_code', 'employee__first_name', 'employee__last_name']
