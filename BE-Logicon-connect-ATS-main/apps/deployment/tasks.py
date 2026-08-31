import hashlib
import json
import logging
import urllib.request
import urllib.error
from datetime import timedelta
from celery import shared_task
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken

from apps.deployment.models import Employee, SiteDeployment, FieldProvisioningLog

logger = logging.getLogger(__name__)


def get_service_account_token() -> str:
    """Generates a short-lived (1h) service account JWT for FieldSense internal calls."""
    token = AccessToken()
    token.set_exp(lifetime=timedelta(hours=1))
    token['user_type'] = 'service'
    token['user_id'] = 'service_account_logicon'
    return str(token)


def compute_idempotency_key(employee_id: int, deployment_id: int, action: str) -> str:
    raw = f"{employee_id}:{deployment_id}:{action}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


@shared_task(
    bind=True,
    queue='fieldsense_provisioning',
    max_retries=5,
    default_retry_delay=2,
    retry_backoff=True,
    retry_backoff_max=32,
)
def provision_employee_in_fieldsense(self, employee_id: int, deployment_id: int):
    """
    Celery task to push-provision an employee into FieldSense upon deployment activation.
    Idempotent, retries up to 5 times with exponential backoff.
    """
    try:
        employee = Employee.objects.get(pk=employee_id)
        deployment = SiteDeployment.objects.get(pk=deployment_id)
    except (Employee.DoesNotExist, SiteDeployment.DoesNotExist) as exc:
        logger.error("Provisioning task failed: employee %s or deployment %s not found", employee_id, deployment_id)
        return False

    action = "provision"
    idempotency_key = compute_idempotency_key(employee.id, deployment.id, action)

    log_entry, _ = FieldProvisioningLog.objects.get_or_create(
        idempotency_key=idempotency_key,
        defaults={
            'employee': employee,
            'action': action,
            'status': 'pending',
            'attempts': 0,
        },
    )

    if log_entry.status == 'success':
        logger.info("FieldSense provisioning already succeeded for key %s", idempotency_key)
        return True

    log_entry.attempts += 1
    log_entry.save(update_fields=['attempts'])

    fieldsense_base_url = getattr(settings, 'FIELDSENSE_BASE_URL', 'http://127.0.0.1:8000').rstrip('/')
    url = f"{fieldsense_base_url}/api/internal/provision-employee/"

    service_token = get_service_account_token()
    headers = {
        'Authorization': f"Bearer {service_token}",
        'Content-Type': 'application/json',
    }

    payload = {
        'idempotency_key': idempotency_key,
        'logicon_employee_id': employee.id,
        'logicon_deployment_id': deployment.id,
        'email': employee.email,
        'first_name': employee.first_name,
        'last_name': employee.last_name,
        'field_role': 'EMPLOYEE',
        'field_site_scope': [str(deployment.site_id)],
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status_code = resp.getcode()
            if status_code in (200, 201):
                log_entry.status = 'success'
                log_entry.error_detail = ''
                log_entry.save(update_fields=['status', 'error_detail'])

                from django.utils import timezone
                employee.field_provisioned_at = timezone.now()
                employee.field_provisioning_status = 'provisioned'
                employee.save(update_fields=['field_provisioned_at', 'field_provisioning_status'])
                return True
            else:
                log_entry.status = 'failed'
                log_entry.error_detail = f"HTTP {status_code}"
                log_entry.save(update_fields=['status', 'error_detail'])
                raise Exception(f"FieldSense provision failed HTTP {status_code}")
    except Exception as exc:
        log_entry.status = 'failed'
        log_entry.error_detail = str(exc)
        log_entry.save(update_fields=['status', 'error_detail'])
        if self.request.retries >= self.max_retries:
            from apps.monitoring.alerts import capture_provisioning_failure_alert
            capture_provisioning_failure_alert(employee.id, action, str(exc), log_entry.attempts)
        raise self.retry(exc=exc)



@shared_task(
    bind=True,
    queue='fieldsense_provisioning',
    max_retries=5,
    default_retry_delay=2,
    retry_backoff=True,
    retry_backoff_max=32,
)
def deprovision_employee_in_fieldsense(self, employee_id: int, reason: str = ''):
    """
    Celery task to push-deprovision an employee from FieldSense upon exit or suspension.
    """
    try:
        employee = Employee.objects.get(pk=employee_id)
    except Employee.DoesNotExist:
        return False

    action = "deprovision"
    idempotency_key = compute_idempotency_key(employee.id, 0, action)

    fieldsense_base_url = getattr(settings, 'FIELDSENSE_BASE_URL', 'http://127.0.0.1:8000').rstrip('/')
    url = f"{fieldsense_base_url}/api/internal/deprovision-employee/"

    service_token = get_service_account_token()
    headers = {
        'Authorization': f"Bearer {service_token}",
        'Content-Type': 'application/json',
    }

    payload = {
        'idempotency_key': idempotency_key,
        'logicon_employee_id': employee.id,
        'reason': reason,
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status_code = resp.getcode()
            if status_code in (200, 201):
                employee.field_provisioning_status = 'deprovisioned'
                employee.save(update_fields=['field_provisioning_status'])
                return True
            else:
                raise Exception(f"FieldSense deprovision failed HTTP {status_code}")
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            logger.critical("DEAD-LETTER ALERT: FieldSense deprovision failed permanently for employee #%s: %s", employee.id, exc)
        raise self.retry(exc=exc)
