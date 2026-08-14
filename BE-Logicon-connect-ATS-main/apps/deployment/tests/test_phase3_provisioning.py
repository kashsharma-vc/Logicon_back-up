import hashlib
from unittest.mock import patch
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from django.core.management import call_command

from apps.core.models import Organization, ScopeNode
from apps.sites.models import Client, SiteProfile
from apps.jobs.models import JobRole
from apps.deployment.models import Employee, SiteDeployment
from apps.deployment.lifecycle_services import activate_deployment, exit_employee
from apps.deployment.tasks import compute_idempotency_key

User = get_user_model()


class Phase3ProvisioningTests(APITestCase):

    def setUp(self):
        self.org = Organization.objects.create(name="Phase 3 Org", code="P3ORG")
        self.scope = ScopeNode.objects.create(
            org=self.org,
            name="Scope",
            code="P3SCOPE",
            node_type="organization",
            path="p3org",
        )
        self.client_obj = Client.objects.create(
            org=self.org,
            name="Client P3",
            code="CLI-P3",
            scope_node=self.scope,
        )
        self.site = SiteProfile.objects.create(
            org=self.org,
            client=self.client_obj,
            name="Site P3",
            code="SITE-P3",
            scope_node=self.scope,
        )
        self.job_role = JobRole.objects.create(org=self.org, name="Security Guard", code="GUARD_P3")
        self.actor = User.objects.create_superuser(
            username="admin_p3@test.com",
            email="admin_p3@test.com",
            password="Password123!",
            org=self.org,
        )

    def test_idempotency_key_computation(self):
        """Idempotency key matches SHA256 of employee_id:deployment_id:action."""
        key = compute_idempotency_key(10, 20, "provision")
        expected = hashlib.sha256(b"10:20:provision").hexdigest()
        self.assertEqual(key, expected)

    @patch("apps.deployment.tasks.provision_employee_in_fieldsense.delay")
    @patch("apps.notifications.sms_service.send_field_credentials_notification")
    def test_activate_deployment_pin_and_task_trigger(self, mock_sms, mock_task):
        """Activation generates PIN, sets field_pin_hash, and queues provisioning on commit."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-P3-01",
            first_name="Field",
            last_name="Worker",
            email="fieldworker@test.com",
            status="active",
        )
        deployment = SiteDeployment.objects.create(
            org=self.org,
            employee=employee,
            site=self.site,
            job_role=self.job_role,
            status="planned",
            start_date="2026-01-01",
        )

        self.assertFalse(bool(employee.field_pin_hash))

        with self.captureOnCommitCallbacks(execute=True):
            activate_deployment(deployment, self.actor)

        employee.refresh_from_db()
        self.assertTrue(bool(employee.field_pin_hash))
        mock_sms.assert_called_once()
        mock_task.assert_called_once_with(employee.id, deployment.id)

    @patch("apps.deployment.tasks.deprovision_employee_in_fieldsense.delay")
    def test_exit_employee_deprovision_trigger(self, mock_deprovision_task):
        """Exiting an employee triggers deprovision_employee_in_fieldsense task on commit."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-P3-02",
            first_name="Exit",
            last_name="Worker",
            status="active",
        )

        with self.captureOnCommitCallbacks(execute=True):
            exit_employee(employee, self.actor, note="resigned")

        employee.refresh_from_db()
        self.assertEqual(employee.status, "exited")
        mock_deprovision_task.assert_called_once_with(employee.id, "resigned")

    def test_match_employees_by_email_command(self):
        """Backfill management command executes dry-run without errors."""
        call_command("match_employees_by_email", "--dry-run")
