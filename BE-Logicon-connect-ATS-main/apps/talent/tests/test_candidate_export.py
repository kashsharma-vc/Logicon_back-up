"""
apps/talent/tests/test_candidate_export.py

Unit test for candidate list CSV export endpoint.
"""

from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import Organization
from apps.jobs.models import JobRole
from apps.accounts.models import User
from apps.talent.models import Candidate, CandidateSkill, Resume


class TestCandidateExport(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name='Export Test Org', code='export_org')
        self.user = User.objects.create(
            username='hr_export',
            email='hr_export@example.com',
            org=self.org,
            is_superuser=True,
            is_active=True,
        )
        self.role = JobRole.objects.create(
            org=self.org,
            name='Field Technician',
            code='field_tech',
        )
        self.candidate = Candidate.objects.create(
            org=self.org,
            phone='9811122233',
            first_name='Vikas',
            last_name='Verma',
            email='vikas@example.com',
            current_location='Noida',
            preferred_location='Delhi',
            target_job_role=self.role,
            total_experience_years=Decimal('3.0'),
            current_company='Tech Services',
            current_role='Technician',
            collar_type='blue_collar',
            billing_type='billable',
        )
        CandidateSkill.objects.create(
            candidate=self.candidate,
            skill_name='Fiber Splicing',
            normalized_skill_name='fiber splicing',
        )
        Resume.objects.create(
            candidate=self.candidate,
            original_filename='vikas_resume.pdf',
            content_type='application/pdf',
            size_bytes=3500,
            status='indexed',
        )
        self.client = APIClient(SERVER_NAME='127.0.0.1')
        self.client.force_authenticate(user=self.user)

    def test_export_candidates_csv(self):
        response = self.client.get('/api/talent/candidates/export/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv; charset=utf-8')
        self.assertIn('candidates_export_', response['Content-Disposition'])

        lines = [line.decode('utf-8') for line in response.streaming_content]
        self.assertGreater(len(lines), 1)
        header = lines[0]
        self.assertIn('Candidate ID', header)
        self.assertIn('Full Name', header)
        self.assertIn('Phone', header)
        self.assertIn('Target Role', header)
        self.assertIn('Skills', header)

        content = ''.join(lines[1:])
        self.assertIn('Vikas Verma', content)
        self.assertIn('9811122233', content)
        self.assertIn('Fiber Splicing', content)
        self.assertIn('Field Technician', content)
