from decimal import Decimal
from django.test import TestCase
from rest_framework import status as http_status
from rest_framework.test import APIClient

from apps.access.capabilities import (
    SALES_SURVEY_READ,
    SALES_SURVEY_UPDATE,
)
from apps.access.models import AccessRole, UserRoleAssignment
from apps.access.tests.utils import bootstrap_role_permissions
from apps.accounts.models import User
from apps.core.models import Organization, ScopeNode
from apps.jobs.models import JobRole
from apps.sales.models import (
    SalesLead,
    SalesLeadSite,
    SiteSurvey,
    SiteSurveyShiftDeployment,
    SurveyRoleMapping,
)


from apps.sales.tests.proposal_wage_fixtures import ensure_wage_category


def _org(code):
    return Organization.objects.create(name=f'Org {code}', code=code)


def _scope(org):
    return ScopeNode.objects.create(
        org=org, code=org.code, name=org.code, node_type='company',
        parent=None, depth=0, path=org.code, is_active=True,
    )


def _user(username, org, caps=None):
    u = User.objects.create_user(username=username, password='pass')
    u.org = org
    u.save()
    if caps:
        role, _ = AccessRole.objects.get_or_create(
            org=org, code=f'role_{username}', defaults={'name': f'role_{username}'},
        )
        bootstrap_role_permissions(role, caps=caps)
        UserRoleAssignment.objects.create(user=u, role=role, scope_node=_scope(org))
    return u


def _survey(org):
    lead = SalesLead.objects.create(org=org, client_name=f'{org.code} Client')
    site = SalesLeadSite.objects.create(lead=lead, site_name='Site 1')
    return SiteSurvey.objects.create(lead=lead, site=site)


class TestBulkApplyRange(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.org_a = _org('alpha')
        cls.org_b = _org('beta')

        caps = [SALES_SURVEY_READ, SALES_SURVEY_UPDATE]
        cls.user_a = _user('user_a', cls.org_a, caps=caps)
        cls.user_b = _user('user_b', cls.org_b, caps=caps)

        cls.survey_a = _survey(cls.org_a)
        cls.survey_b = _survey(cls.org_b)

        cls.role_electrician = JobRole.objects.create(
            org=cls.org_a, name='Electrician', code='elec', skill_category='skilled', is_active=True,
        )
        cls.role_plumber = JobRole.objects.create(
            org=cls.org_a, name='Plumber', code='plumb', skill_category='skilled', is_active=True,
        )
        wage_cat = ensure_wage_category('skilled', 'Skilled')
        cls.mapping_plumber = SurveyRoleMapping.objects.create(
            org=cls.org_a, job_role=cls.role_plumber, description_text='Plumber', is_active=True,
            wage_category=wage_cat,
        )

    def setUp(self):
        self.api = APIClient()
        self.api.force_authenticate(self.user_a)

    def test_bulk_apply_range_success_mapped_roles(self):
        row_elec = SiteSurveyShiftDeployment.objects.create(
            survey=self.survey_a,
            job_role=self.role_electrician,
            description='Electrician',
            general_count=0,
            first_shift_count=0,
            second_shift_count=0,
            night_shift_count=0,
            total_count=0,
            line_type='item',
            is_applicable=True,
            sort_order=1,
        )
        row_plumber = SiteSurveyShiftDeployment.objects.create(
            survey=self.survey_a,
            job_role=None,
            description='Plumber',
            general_count=0,
            first_shift_count=0,
            second_shift_count=0,
            night_shift_count=0,
            total_count=0,
            line_type='item',
            is_applicable=True,
            sort_order=2,
        )
        row_header = SiteSurveyShiftDeployment.objects.create(
            survey=self.survey_a,
            description='Technical Staff',
            line_type='header',
            is_applicable=True,
            sort_order=0,
        )

        resp = self.api.post(
            '/api/sales/site-survey-shift-deployments/bulk-apply-range/',
            data={
                'survey': self.survey_a.pk,
                'general_count': 1,
                'first_shift_count': 2,
                'second_shift_count': 1,
                'night_shift_count': 0,
                'remarks': 'Standard Shift Pattern',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 2)

        row_elec.refresh_from_db()
        row_plumber.refresh_from_db()
        row_header.refresh_from_db()

        self.assertEqual(row_elec.general_count, Decimal('1.00'))
        self.assertEqual(row_elec.first_shift_count, Decimal('2.00'))
        self.assertEqual(row_elec.second_shift_count, Decimal('1.00'))
        self.assertEqual(row_elec.night_shift_count, Decimal('0.00'))
        self.assertEqual(row_elec.total_count, Decimal('4.00'))
        self.assertEqual(row_elec.remarks, 'Standard Shift Pattern')

        self.assertEqual(row_plumber.general_count, Decimal('1.00'))
        self.assertEqual(row_plumber.first_shift_count, Decimal('2.00'))
        self.assertEqual(row_plumber.second_shift_count, Decimal('1.00'))
        self.assertEqual(row_plumber.night_shift_count, Decimal('0.00'))
        self.assertEqual(row_plumber.total_count, Decimal('4.00'))
        self.assertEqual(row_plumber.remarks, 'Standard Shift Pattern')

        self.assertEqual(row_header.total_count, Decimal('0.00'))

    def test_bulk_apply_range_tenant_isolation(self):
        resp = self.api.post(
            '/api/sales/site-survey-shift-deployments/bulk-apply-range/',
            data={
                'survey': self.survey_b.pk,
                'general_count': 1,
            },
            format='json',
        )
        self.assertEqual(resp.status_code, http_status.HTTP_403_FORBIDDEN)

    def test_bulk_apply_range_negative_count_rejected(self):
        resp = self.api.post(
            '/api/sales/site-survey-shift-deployments/bulk-apply-range/',
            data={
                'survey': self.survey_a.pk,
                'general_count': -1,
            },
            format='json',
        )
        self.assertEqual(resp.status_code, http_status.HTTP_400_BAD_REQUEST)

    def test_quick_actions_turn_off_unused(self):
        # row_elec has total_count=0, row_plumber has total_count=4 from setUp
        row_elec = SiteSurveyShiftDeployment.objects.create(
            survey=self.survey_a,
            description='Test Unused Role',
            total_count=Decimal('0.00'),
            is_applicable=True,
            line_type='item',
            sort_order=10,
        )
        row_active = SiteSurveyShiftDeployment.objects.create(
            survey=self.survey_a,
            description='Test Active Role',
            total_count=Decimal('2.00'),
            is_applicable=True,
            line_type='item',
            sort_order=11,
        )

        resp = self.api.post(
            '/api/sales/site-survey-shift-deployments/quick-actions/',
            data={
                'survey': self.survey_a.pk,
                'action': 'turn_off_unused',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)
        row_elec.refresh_from_db()
        row_active.refresh_from_db()
        self.assertFalse(row_elec.is_applicable)
        self.assertTrue(row_active.is_applicable)

    def test_quick_actions_turn_all_off_and_on(self):
        SiteSurveyShiftDeployment.objects.create(
            survey=self.survey_a,
            description='Test Role 1',
            total_count=Decimal('0.00'),
            is_applicable=True,
            line_type='item',
            sort_order=1,
        )
        SiteSurveyShiftDeployment.objects.create(
            survey=self.survey_a,
            description='Test Role 2',
            total_count=Decimal('3.00'),
            is_applicable=True,
            line_type='item',
            sort_order=2,
        )

        resp = self.api.post(
            '/api/sales/site-survey-shift-deployments/quick-actions/',
            data={
                'survey': self.survey_a.pk,
                'action': 'turn_all_off',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, http_status.HTTP_200_OK)
        self.assertEqual(
            SiteSurveyShiftDeployment.objects.filter(survey=self.survey_a, line_type='item', is_applicable=True).count(),
            0,
        )

        resp2 = self.api.post(
            '/api/sales/site-survey-shift-deployments/quick-actions/',
            data={
                'survey': self.survey_a.pk,
                'action': 'turn_all_on',
            },
            format='json',
        )
        self.assertEqual(resp2.status_code, http_status.HTTP_200_OK)
        self.assertEqual(
            SiteSurveyShiftDeployment.objects.filter(survey=self.survey_a, line_type='item', is_applicable=True).count(),
            2,
        )

    def test_quick_actions_tenant_isolation(self):
        resp = self.api.post(
            '/api/sales/site-survey-shift-deployments/quick-actions/',
            data={
                'survey': self.survey_b.pk,
                'action': 'turn_off_unused',
            },
            format='json',
        )
        self.assertEqual(resp.status_code, http_status.HTTP_403_FORBIDDEN)

    def test_delete_shift_deployment_row(self):
        row = SiteSurveyShiftDeployment.objects.create(
            survey=self.survey_a,
            description='Role To Delete',
            line_type='item',
            sort_order=99,
        )
        resp = self.api.delete(f'/api/sales/site-survey-shift-deployments/{row.pk}/')
        self.assertEqual(resp.status_code, http_status.HTTP_204_NO_CONTENT)
        self.assertFalse(SiteSurveyShiftDeployment.objects.filter(pk=row.pk).exists())
