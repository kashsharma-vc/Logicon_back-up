import jwt
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import Organization, ScopeNode
from apps.access.models import AccessRole, Permission, AccessRolePermission, UserRoleAssignment
from apps.sites.models import Client, SiteProfile
from apps.jobs.models import JobRole
from apps.deployment.models import Employee, SiteDeployment
from apps.accounts.serializers import EmailTokenObtainPairSerializer

User = get_user_model()


class FieldSenseAccessExpansionTests(APITestCase):

    def setUp(self):
        self.org = Organization.objects.create(name="Test Org", code="TORG")
        
        # Scope Nodes
        self.root_scope = ScopeNode.objects.create(
            org=self.org,
            name="Root Scope",
            code="ROOT",
            node_type="organization",
            path="torg",
        )
        self.client_scope = ScopeNode.objects.create(
            org=self.org,
            name="Client Scope",
            code="CLIENT1",
            node_type="client",
            path="torg/client1",
        )
        self.site_scope = ScopeNode.objects.create(
            org=self.org,
            name="Site Scope",
            code="SITE1",
            node_type="site",
            path="torg/client1/site1",
        )

        # Client and Site
        self.client_profile = Client.objects.create(
            org=self.org,
            name="Client Alpha",
            code="CLI-A",
            scope_node=self.client_scope,
        )
        self.site = SiteProfile.objects.create(
            org=self.org,
            client=self.client_profile,
            name="Site Alpha",
            code="SITE-A",
            scope_node=self.site_scope,
        )

        # Permission: field_tracking.read
        self.perm_field_read, _ = Permission.objects.get_or_create(
            action='read',
            resource='field_tracking',
            code='field_tracking.read',
        )

        # Roles
        self.role_ops_mgr = AccessRole.objects.create(org=self.org, name="Ops Manager", code="operations_manager")
        AccessRolePermission.objects.create(role=self.role_ops_mgr, permission=self.perm_field_read)

        self.role_sales_mgr = AccessRole.objects.create(org=self.org, name="Sales Manager", code="sales_manager")
        AccessRolePermission.objects.create(role=self.role_sales_mgr, permission=self.perm_field_read)

        self.role_hr_admin = AccessRole.objects.create(org=self.org, name="HR Admin", code="hr_admin")

        # Job Role for Employee
        self.job_role = JobRole.objects.create(org=self.org, name="Guard", code="GUARD")

    def test_superuser_jwt_claims(self):
        """Superuser gets field_access=True, field_role='ADMIN', field_site_scope=['*']."""
        superuser = User.objects.create_superuser(
            username="super@test.com",
            email="super@test.com",
            password="Password123!",
            first_name="Super",
            last_name="Admin",
            org=self.org,
        )
        token = EmailTokenObtainPairSerializer.get_token(superuser)
        self.assertTrue(token['field_access'])
        self.assertEqual(token['field_role'], 'ADMIN')
        self.assertEqual(token['field_site_scope'], ['*'])
        self.assertIsNone(token['deployment_site_id'])

    def test_ops_manager_jwt_claims(self):
        """Ops manager with site scope receives field_role='MANAGER' and resolved site IDs."""
        ops_user = User.objects.create_user(
            username="ops@test.com",
            email="ops@test.com",
            password="Password123!",
            first_name="Ops",
            last_name="Manager",
            org=self.org,
        )
        UserRoleAssignment.objects.create(user=ops_user, role=self.role_ops_mgr, scope_node=self.site_scope)

        token = EmailTokenObtainPairSerializer.get_token(ops_user)
        self.assertTrue(token['field_access'])
        self.assertEqual(token['field_role'], 'MANAGER')
        self.assertIn(str(self.site.id), token['field_site_scope'])
        self.assertIsNone(token['deployment_site_id'])

    def test_sales_manager_jwt_claims(self):
        """Sales manager receives field_role='SALES'."""
        sales_user = User.objects.create_user(
            username="sales@test.com",
            email="sales@test.com",
            password="Password123!",
            first_name="Sales",
            last_name="Manager",
            org=self.org,
        )
        UserRoleAssignment.objects.create(user=sales_user, role=self.role_sales_mgr, scope_node=self.client_scope)

        token = EmailTokenObtainPairSerializer.get_token(sales_user)
        self.assertTrue(token['field_access'])
        self.assertEqual(token['field_role'], 'SALES')
        self.assertIn(str(self.site.id), token['field_site_scope'])
        self.assertIsNone(token['deployment_site_id'])

    def test_unentitled_role_jwt_claims(self):
        """HR Admin with no field_tracking.read capability receives field_access=False, field_role=None."""
        hr_user = User.objects.create_user(
            username="hr@test.com",
            email="hr@test.com",
            password="Password123!",
            first_name="HR",
            last_name="Admin",
            org=self.org,
        )
        UserRoleAssignment.objects.create(user=hr_user, role=self.role_hr_admin, scope_node=self.root_scope)

        token = EmailTokenObtainPairSerializer.get_token(hr_user)
        self.assertFalse(token['field_access'])
        self.assertIsNone(token['field_role'])
        self.assertEqual(token['field_site_scope'], [])
        self.assertIsNone(token['deployment_site_id'])

    def test_field_employee_pin_login_success(self):
        """Deployed employee can authenticate with 6-digit PIN and receive 8h/24h tokens."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-1001",
            first_name="John",
            last_name="Doe",
            email="john.doe@test.com",
            status="active",
        )
        employee.set_field_pin("123456")
        employee.save()

        deployment = SiteDeployment.objects.create(
            org=self.org,
            employee=employee,
            site=self.site,
            job_role=self.job_role,
            status="active",
            start_date="2026-01-01",
        )

        url = "/api/field-employee-token/"
        payload = {
            "org_id": self.org.id,
            "employee_code": "EMP-1001",
            "pin": "123456",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        # Decode access token and verify claims
        access_payload = jwt.decode(response.data["access"], options={"verify_signature": False})
        self.assertEqual(access_payload["user_type"], "field")
        self.assertTrue(access_payload["field_access"])
        self.assertEqual(access_payload["field_role"], "EMPLOYEE")
        self.assertEqual(access_payload["field_site_scope"], [str(self.site.id)])
        self.assertEqual(access_payload["deployment_site_id"], self.site.id)
        self.assertEqual(access_payload["logicon_employee_id"], employee.id)
        self.assertEqual(access_payload["logicon_deployment_id"], deployment.id)

    def test_field_employee_pin_login_synthetic_email(self):
        """Employee with blank email gets synthetic email claim."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-9999",
            first_name="NoEmail",
            last_name="Worker",
            email="",
            status="active",
        )
        employee.set_field_pin("654321")
        employee.save()

        SiteDeployment.objects.create(
            org=self.org,
            employee=employee,
            site=self.site,
            job_role=self.job_role,
            status="active",
            start_date="2026-01-01",
        )

        response = self.client.post("/api/field-employee-token/", {
            "org_id": self.org.id,
            "employee_code": "EMP-9999",
            "pin": "654321",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        access_payload = jwt.decode(response.data["access"], options={"verify_signature": False})
        self.assertEqual(access_payload["email"], "emp-9999@logicon-employee.internal")

    def test_field_employee_pin_login_invalid_pin_and_lockout(self):
        """Failed PIN attempts increment counter and lock out after 10 attempts."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-2002",
            first_name="Jane",
            last_name="Smith",
            status="active",
        )
        employee.set_field_pin("111222")
        employee.save()

        SiteDeployment.objects.create(
            org=self.org,
            employee=employee,
            site=self.site,
            job_role=self.job_role,
            status="active",
            start_date="2026-01-01",
        )

        url = "/api/field-employee-token/"

        # Short PIN validation failure
        resp = self.client.post(url, {"org_id": self.org.id, "employee_code": "EMP-2002", "pin": "123"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Wrong PIN attempts (9 attempts)
        for i in range(1, 10):
            resp = self.client.post(url, {"org_id": self.org.id, "employee_code": "EMP-2002", "pin": "999999"}, format="json")
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            employee.refresh_from_db()
            self.assertEqual(employee.field_login_failed_attempts, i)
            self.assertFalse(employee.field_is_locked)

        # 10th failed attempt triggers lockout
        resp = self.client.post(url, {"org_id": self.org.id, "employee_code": "EMP-2002", "pin": "999999"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        employee.refresh_from_db()
        self.assertEqual(employee.field_login_failed_attempts, 10)
        self.assertTrue(employee.field_is_locked)

        # Subsequent attempts are rejected due to lock
        resp = self.client.post(url, {"org_id": self.org.id, "employee_code": "EMP-2002", "pin": "111222"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Account is locked", str(resp.data))

    def test_field_employee_pin_login_no_active_deployment(self):
        """Employee without active deployment is rejected."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-3003",
            first_name="Sam",
            last_name="Taylor",
            status="active",
        )
        employee.set_field_pin("333444")
        employee.save()

        # No SiteDeployment created

        response = self.client.post("/api/field-employee-token/", {
            "org_id": self.org.id,
            "employee_code": "EMP-3003",
            "pin": "333444",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No active deployment found", str(response.data))
