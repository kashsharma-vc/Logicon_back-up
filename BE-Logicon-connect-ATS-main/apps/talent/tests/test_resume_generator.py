"""
apps/talent/tests/test_resume_generator.py

Unit tests for professional ATS resume generator and bulk resume regeneration.
"""

from decimal import Decimal
from datetime import date
from io import BytesIO

from django.test import TestCase
from django.core.management import call_command
from pypdf import PdfReader

from apps.core.models import Organization
from apps.jobs.models import JobRole
from apps.talent.models import (
    Candidate, Resume, CandidateSkill, CandidateExperience, CandidateEducation
)
from apps.talent.resume_generator import (
    generate_candidate_resume_pdf_bytes,
    build_candidate_text_summary,
)
from apps.talent.tasks import generate_bulk_candidate_resumes_task


class TestResumeGenerator(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name='Test Org', code='test-org')
        self.role = JobRole.objects.create(
            org=self.org,
            name='Senior Electrician',
            code='sr_elec',
            skill_category='skilled',
        )
        self.candidate = Candidate.objects.create(
            org=self.org,
            phone='9876543210',
            alternate_phone='9876543211',
            phone_normalized='9876543210',
            first_name='Rahul',
            last_name='Sharma',
            email='rahul.sharma@example.com',
            current_location='Mumbai',
            preferred_location='Pune',
            total_experience_years=Decimal('5.5'),
            current_company='ABC Electricals',
            current_role='Electrician Lead',
            target_job_role=self.role,
            collar_type='blue_collar',
            billing_type='billable',
            notice_period_days=15,
            current_ctc=Decimal('450000'),
            expected_ctc=Decimal('550000'),
            source='import_',
        )
        CandidateSkill.objects.create(
            candidate=self.candidate,
            skill_name='High Voltage Wiring',
            normalized_skill_name='high voltage wiring',
            proficiency='expert',
            years_experience=Decimal('5.0'),
            source='excel_import',
        )
        CandidateExperience.objects.create(
            candidate=self.candidate,
            job_title='Electrician Specialist',
            company_name='XYZ Power Ltd',
            start_date=date(2021, 1, 1),
            end_date=date(2024, 6, 30),
            is_current=False,
            description='Maintained transformer units and secondary power distribution grids.',
        )
        CandidateEducation.objects.create(
            candidate=self.candidate,
            degree='Diploma in Electrical Engineering',
            institute='Government Polytechnic Mumbai',
            end_year=2020,
        )

    def test_generate_pdf_bytes_rich_candidate(self):
        pdf_bytes = generate_candidate_resume_pdf_bytes(self.candidate)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 1000)

        reader = PdfReader(BytesIO(pdf_bytes))
        self.assertGreater(len(reader.pages), 0)
        text = reader.pages[0].extract_text()
        self.assertIn('Rahul Sharma', text)
        self.assertIn('9876543210', text)
        self.assertIn('rahul.sharma@example.com', text)
        self.assertIn('SENIOR ELECTRICIAN', text)
        self.assertIn('Mumbai', text)
        self.assertIn('High Voltage Wiring', text)
        self.assertIn('XYZ Power Ltd', text)
        self.assertIn('Government Polytechnic Mumbai', text)

    def test_generate_pdf_bytes_minimal_candidate(self):
        minimal_cand = Candidate.objects.create(
            org=self.org,
            phone='9999988888',
            phone_normalized='9999988888',
            first_name='Amit',
            last_name='Kumar',
        )
        pdf_bytes = generate_candidate_resume_pdf_bytes(minimal_cand)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 1000)

        reader = PdfReader(BytesIO(pdf_bytes))
        text = reader.pages[0].extract_text()
        self.assertIn('Amit Kumar', text)
        self.assertIn('9999988888', text)

    def test_text_summary_builder(self):
        summary = build_candidate_text_summary(self.candidate)
        self.assertIn('Rahul Sharma', summary)
        self.assertIn('9876543210', summary)
        self.assertIn('High Voltage Wiring', summary)
        self.assertIn('XYZ Power Ltd', summary)
        self.assertIn('Diploma in Electrical Engineering', summary)

    def test_generate_bulk_candidate_resumes_task(self):
        res = generate_bulk_candidate_resumes_task([self.candidate.id])
        self.assertEqual(res['processed'], 1)
        self.assertEqual(res['created'], 1)

        resume = Resume.objects.filter(candidate=self.candidate).first()
        self.assertIsNotNone(resume)
        self.assertEqual(resume.status, 'indexed')
        self.assertEqual(resume.content_type, 'application/pdf')
        self.assertGreater(resume.size_bytes, 1000)
        self.assertIn('Rahul', resume.original_filename)

    def test_regenerate_management_command(self):
        # Create a dummy resume first
        Resume.objects.create(
            candidate=self.candidate,
            original_filename='dummy.pdf',
            content_type='application/pdf',
            size_bytes=100,
            status='uploaded',
            source_type='excel_import',
            document_type='pdf',
        )
        call_command('regenerate_candidate_resumes', candidate_id=self.candidate.id)
        resume = Resume.objects.filter(candidate=self.candidate).first()
        self.assertIsNotNone(resume)
        self.assertEqual(resume.status, 'indexed')
        self.assertGreater(resume.size_bytes, 1000)
