from unittest.mock import patch
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from apps.core.models import Organization, ScopeNode
from apps.deployment.models import Employee, SiteDeployment, FieldProvisioningLog
from apps.monitoring.alerts import capture_provisioning_failure_alert

User = get_user_model()


class AlertingIntegrationTests(APITestCase):

    def setUp(self):
        self.org = Organization.objects.create(name="Alert Test Org", code="ALERTORG")
        self.scope = ScopeNode.objects.create(
            org=self.org,
            name="Alert Scope",
            code="ALERTSCOPE",
            node_type="organization",
            path="alertorg",
        )
        self.user = User.objects.create_superuser(
            username="alert_admin@test.com", email="alert_admin@test.com", password="Password123!", org=self.org
        )
        self.employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-ALERT-01",
            first_name="Alert",
            last_name="Worker",
            status="active",
        )

    @patch("apps.monitoring.alerts.logger.critical")
    def test_capture_provisioning_failure_alert_payload(self, mock_logger):
        """Alert capturer produces critical dead-letter log and alert payload on task failure."""
        payload = capture_provisioning_failure_alert(
            employee_id=self.employee.id,
            action="provision",
            error_detail="HTTP 500 Internal Server Error",
            attempts=5,
        )

        self.assertEqual(payload["event_type"], "fieldsense_provisioning_failed")
        self.assertEqual(payload["employee_id"], self.employee.id)
        self.assertEqual(payload["attempts"], 5)
        mock_logger.assert_called_once()

    def test_fieldsense_status_endpoint(self):
        """GET /api/deployment/fieldsense-status/ returns status counters and worker health."""
        FieldProvisioningLog.objects.create(
            employee=self.employee,
            idempotency_key="key-status-test",
            action="provision",
            status="failed",
            error_detail="Connection timeout",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/deployment/fieldsense-status/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["failed_provisioning_count"], 1)
        self.assertIn("celery_worker_status", response.data)
