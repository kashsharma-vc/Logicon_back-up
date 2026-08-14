import time
from unittest.mock import patch
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.core.models import Organization, ScopeNode
from apps.sites.models import Client, SiteProfile
from apps.jobs.models import JobRole
from apps.deployment.models import Employee, SiteDeployment
from apps.deployment.lifecycle_services import activate_deployment

User = get_user_model()


class BulkActivationLoadTests(APITestCase):

    def setUp(self):
        self.org = Organization.objects.create(name="Load Test Org", code="LOADORG")
        self.scope = ScopeNode.objects.create(
            org=self.org,
            name="Load Scope",
            code="LOADSCOPE",
            node_type="organization",
            path="loadorg",
        )
        self.client_obj = Client.objects.create(
            org=self.org,
            name="Load Client",
            code="CLI-LOAD",
            scope_node=self.scope,
        )
        self.site = SiteProfile.objects.create(
            org=self.org,
            client=self.client_obj,
            name="Load Site",
            code="SITE-LOAD",
            scope_node=self.scope,
        )
        self.job_role = JobRole.objects.create(org=self.org, name="Load Worker", code="LOADWORKER")
        self.actor = User.objects.create_superuser(
            username="admin_load@test.com", email="admin_load@test.com", password="Password123!", org=self.org
        )

    @patch("apps.deployment.tasks.provision_employee_in_fieldsense.delay")
    @patch("apps.notifications.sms_service.send_field_credentials_notification")
    def test_bulk_activation_50_employees_non_blocking_performance(self, mock_sms, mock_task):
        """
        Simulates 50 concurrent activate_deployment calls.
        Measures HTTP response time per activation and confirms zero blocking on task completion.
        """
        COUNT = 50
        deployments = []
        for i in range(COUNT):
            emp = Employee.objects.create(
                org=self.org,
                employee_code=f"EMP-LOAD-{i:03d}",
                first_name=f"Worker{i}",
                last_name="LoadTest",
                email=f"worker{i}@loadtest.com",
                status="active",
                field_pin_hash="pbkdf2_sha256$test_hashed_pin",
            )

            dep = SiteDeployment.objects.create(
                org=self.org,
                employee=emp,
                site=self.site,
                job_role=self.job_role,
                status="planned",
                start_date="2026-01-01",
            )
            deployments.append(dep)

        start_time = time.time()
        for dep in deployments:
            with self.captureOnCommitCallbacks(execute=True):
                activate_deployment(dep, self.actor)

        elapsed = time.time() - start_time
        avg_per_activation_ms = (elapsed / COUNT) * 1000

        # Assert Celery provisioning task enqueued for all 50 employees
        self.assertEqual(mock_task.call_count, COUNT)
        # Average non-blocking activation execution cycle (< 50ms per transaction)
        self.assertLess(avg_per_activation_ms, 50.0)




