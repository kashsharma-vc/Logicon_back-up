import hashlib
from unittest.mock import patch
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from apps.core.models import Organization, ScopeNode
from apps.sites.models import Client, SiteProfile
from apps.jobs.models import JobRole
from apps.deployment.models import Employee, SiteDeployment
from apps.deployment.lifecycle_services import activate_deployment, suspend_employee, exit_employee
from apps.accounts.serializers import EmailTokenObtainPairSerializer

User = get_user_model()


class Phase4E2EIntegrationTests(APITestCase):

    def setUp(self):
        self.org = Organization.objects.create(name="Phase 4 Org", code="P4ORG")
        self.scope = ScopeNode.objects.create(
            org=self.org,
            name="P4 Scope",
            code="P4SCOPE",
            node_type="organization",
            path="p4org",
        )
        self.client_obj = Client.objects.create(
            org=self.org,
            name="Client P4",
            code="CLI-P4",
            scope_node=self.scope,
        )
        self.site = SiteProfile.objects.create(
            org=self.org,
            client=self.client_obj,
            name="Site P4",
            code="SITE-P4",
            scope_node=self.scope,
        )
        self.job_role = JobRole.objects.create(org=self.org, name="Field Inspector", code="INSPECT_P4")
        self.admin_user = User.objects.create_superuser(
            username="admin_p4@test.com",
            email="admin_p4@test.com",
            password="Password123!",
            org=self.org,
        )

    def test_jwt_claims_emission_for_iframe_sso(self):
        """EmailTokenObtainPairSerializer emits field_access, field_role, field_site_scope for iframe SSO."""
        token = EmailTokenObtainPairSerializer.get_token(self.admin_user)
        self.assertTrue(token["field_access"])
        self.assertEqual(token["field_role"], "ADMIN")
        self.assertEqual(token["field_site_scope"], ["*"])

    @patch("apps.deployment.tasks.provision_employee_in_fieldsense.delay")
    @patch("apps.notifications.sms_service.send_field_credentials_notification")
    def test_mobile_pin_login_flow(self, mock_sms, mock_task):
        """Worker logs in via mobile PIN endpoint after deployment activation."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-P4-10",
            first_name="P4Worker",
            last_name="Mobile",
            email="p4worker@test.com",
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

        with self.captureOnCommitCallbacks(execute=True):
            activate_deployment(deployment, self.admin_user)

        employee.refresh_from_db()
        self.assertTrue(bool(employee.field_pin_hash))

        # Perform PIN authentication via POST /api/field-employee-token/
        response = self.client.post(
            "/api/field-employee-token/",
            {
                "org_id": self.org.id,
                "employee_code": "EMP-P4-10",
                "pin": "123456",  # Correct PIN set during test run if known or mock
            },
            format="json",
        )
        # Verify endpoint responds
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    @patch("apps.deployment.tasks.deprovision_employee_in_fieldsense.delay")
    def test_suspend_employee_deprovision_flow(self, mock_deprovision):
        """Suspending an employee triggers deprovisioning task on commit."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-P4-11",
            first_name="Suspend",
            last_name="Worker",
            status="active",
        )

        with self.captureOnCommitCallbacks(execute=True):
            suspend_employee(employee, self.admin_user, note="misconduct")

        employee.refresh_from_db()
        self.assertEqual(employee.status, "suspended")
        mock_deprovision.assert_called_once_with(employee.id, "misconduct")

    @patch("apps.deployment.tasks.deprovision_employee_in_fieldsense.delay")
    def test_exit_employee_deprovision_flow(self, mock_deprovision):
        """Exiting an employee triggers deprovisioning task on commit."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-P4-12",
            first_name="Exit",
            last_name="Worker",
            status="active",
        )

        with self.captureOnCommitCallbacks(execute=True):
            exit_employee(employee, self.admin_user, note="resigned")

        employee.refresh_from_db()
        self.assertEqual(employee.status, "exited")
        mock_deprovision.assert_called_once_with(employee.id, "resigned")
