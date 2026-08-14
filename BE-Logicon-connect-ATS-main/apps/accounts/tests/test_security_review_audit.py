import hashlib
from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken

from apps.core.models import Organization, ScopeNode
from apps.sites.models import Client, SiteProfile
from apps.jobs.models import JobRole
from apps.deployment.models import Employee, SiteDeployment
from apps.accounts.serializers import EmailTokenObtainPairSerializer, resolve_user_field_claims

User = get_user_model()


class SecurityReviewAuditTests(APITestCase):

    def setUp(self):
        self.org = Organization.objects.create(name="Audit Org", code="AUDITORG")
        self.scope = ScopeNode.objects.create(
            org=self.org,
            name="Audit Scope",
            code="AUDITSCOPE",
            node_type="organization",
            path="auditorg",
        )
        self.client_obj = Client.objects.create(
            org=self.org,
            name="Audit Client",
            code="CLI-AUDIT",
            scope_node=self.scope,
        )
        self.site = SiteProfile.objects.create(
            org=self.org,
            client=self.client_obj,
            name="Audit Site",
            code="SITE-AUDIT",
            scope_node=self.scope,
        )
        self.job_role = JobRole.objects.create(org=self.org, name="Auditor", code="AUDITOR")

        # Create Role Test Matrix Users
        self.admin = User.objects.create_superuser(
            username="admin_audit@test.com", email="admin_audit@test.com", password="Password123!", org=self.org
        )
        self.sales_mgr = User.objects.create(
            username="sales_mgr@test.com", email="sales_mgr@test.com", org=self.org, user_type="staff"
        )
        self.non_entitled = User.objects.create(
            username="client_admin@test.com", email="client_admin@test.com", org=self.org, user_type="client"
        )

    def test_r1_jwt_claim_integrity(self):
        """R1: Claims are derived from JWT signatures, not client input."""
        token = EmailTokenObtainPairSerializer.get_token(self.admin)
        self.assertIn("field_access", token)
        self.assertIn("field_role", token)
        self.assertIn("field_site_scope", token)
        self.assertEqual(token["field_role"], "ADMIN")

    def test_r2_sales_role_entitlement(self):
        """R2: Sales manager role is granted field_access=True per spike resolution."""
        from apps.access.models import AccessRole, Permission, AccessRolePermission, UserRoleAssignment
        sales_role, _ = AccessRole.objects.get_or_create(org=self.org, code="sales_manager", name="Sales Manager")
        perm, _ = Permission.objects.get_or_create(code="field_tracking.read", defaults={'action': 'read', 'resource': 'field_tracking'})
        AccessRolePermission.objects.get_or_create(role=sales_role, permission=perm)
        UserRoleAssignment.objects.get_or_create(user=self.sales_mgr, role=sales_role, scope_node=self.scope)

        claims = resolve_user_field_claims(self.sales_mgr)
        self.assertTrue(claims["field_access"])
        self.assertEqual(claims["field_role"], "SALES")



    def test_r3_non_entitled_role_rejection(self):
        """R3: Non-entitled role (client_admin) receives field_access=False."""
        claims = resolve_user_field_claims(self.non_entitled)
        self.assertFalse(claims["field_access"])

    def test_r4_pin_lockout_enforcement(self):
        """R4: PIN authentication triggers lockout after 10 failed attempts."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-LOCKOUT-01",
            first_name="Lockout",
            last_name="Test",
            status="active",
        )
        employee.set_field_pin("654321")
        employee.save()

        for _ in range(10):
            self.client.post(
                "/api/field-employee-token/",
                {"org_id": self.org.id, "employee_code": "EMP-LOCKOUT-01", "pin": "000000"},
                format="json",
            )

        employee.refresh_from_db()
        self.assertTrue(employee.field_is_locked)

        resp = self.client.post(
            "/api/field-employee-token/",
            {"org_id": self.org.id, "employee_code": "EMP-LOCKOUT-01", "pin": "654321"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("locked", str(resp.data))

    def test_r5_plaintext_pin_not_stored(self):
        """R5: Raw PIN is never stored in DB plaintext."""
        employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-PIN-02",
            first_name="RawPin",
            last_name="Check",
        )
        employee.set_field_pin("987654")
        employee.save()

        self.assertNotIn("987654", employee.field_pin_hash)
        from django.contrib.auth.hashers import check_password
        self.assertTrue(check_password("987654", employee.field_pin_hash))

