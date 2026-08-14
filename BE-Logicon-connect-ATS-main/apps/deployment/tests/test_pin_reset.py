from unittest.mock import patch
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from apps.core.models import Organization, ScopeNode
from apps.deployment.models import Employee, FieldProvisioningLog
from apps.access.models import AccessRole, Permission, AccessRolePermission, UserScopeAssignment, UserRoleAssignment

User = get_user_model()


class PINResetActionTests(APITestCase):

    def setUp(self):
        self.org = Organization.objects.create(name="PIN Reset Test Org", code="PINORG")
        self.scope = ScopeNode.objects.create(
            org=self.org,
            name="PIN Scope",
            code="PINSCOPE",
            node_type="organization",
            path="pinorg",
        )
        self.perm_emp_update, _ = Permission.objects.get_or_create(
            action="update",
            resource="employee",
            defaults={"code": "employee.update"},
        )
        self.hr_role = AccessRole.objects.create(org=self.org, name="HR Manager", code="HR_MGR")
        AccessRolePermission.objects.create(role=self.hr_role, permission=self.perm_emp_update)

        self.hr_user = User.objects.create_superuser(
            username="hr_manager@test.com", email="hr_manager@test.com", password="Password123!", org=self.org
        )

        self.unauth_user = User.objects.create_user(
            username="unauth_user@test.com", email="unauth_user@test.com", password="Password123!", org=self.org
        )


        self.employee = Employee.objects.create(
            org=self.org,
            employee_code="EMP-LOCKED-01",
            first_name="Locked",
            last_name="Worker",
            phone="+1234567890",
            email="locked.worker@test.com",
            field_pin_hash="old_invalid_hash",
            field_is_locked=True,
            field_login_failed_attempts=10,
            status="active",
        )



    @patch("apps.notifications.sms_service.send_field_credentials_notification")
    def test_hr_reset_field_pin_success_and_unlock(self, mock_sms):
        """HR user resets PIN: unlocks account, dispatches SMS, logs audit entry, returns generated PIN."""
        self.client.force_authenticate(user=self.hr_user)
        url = f"/api/deployment/employees/{self.employee.id}/reset_field_pin/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("pin", response.data)
        self.assertEqual(len(response.data["pin"]), 6)

        self.employee.refresh_from_db()
        self.assertFalse(self.employee.field_is_locked)
        self.assertEqual(self.employee.field_login_failed_attempts, 0)
        self.assertNotEqual(self.employee.field_pin_hash, "old_invalid_hash")

        # Verify SMS dispatched
        mock_sms.assert_called_once()

        # Verify audit log entry
        audit_log = FieldProvisioningLog.objects.filter(employee=self.employee, action="pin_reset").first()
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.status, "success")

    def test_unauthorized_user_reset_field_pin_rejected(self):
        """User without employee.update capability receives 403 Forbidden."""
        self.client.force_authenticate(user=self.unauth_user)
        url = f"/api/deployment/employees/{self.employee.id}/reset_field_pin/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

