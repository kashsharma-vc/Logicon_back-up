"""
apps/talent/management/commands/regenerate_candidate_resumes.py

Fast multi-threaded management command to regenerate professional resume PDFs for candidates.
Overwrites disk files directly and performs bulk database updates for maximum speed.
"""

import os
import re
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.conf import settings

from apps.talent.models import Candidate, Resume
from apps.talent.resume_generator import (
    generate_candidate_resume_pdf_bytes,
    build_candidate_text_summary,
)


def _process_single_resume(resume_data):
    """
    Worker function to generate PDF bytes and prepare updated fields.
    """
    resume, candidate, org, target_role = resume_data
    if not candidate:
        return None

    try:
        pdf_bytes = generate_candidate_resume_pdf_bytes(candidate)
        text_summary = build_candidate_text_summary(candidate)
        file_hash = hashlib.sha256(pdf_bytes).hexdigest()

        job_role = target_role or candidate.target_job_role
        role_name = (job_role.name if job_role else candidate.current_role) or 'role'

        safe_name = re.sub(
            r'[^A-Za-z0-9_-]+',
            '_',
            candidate.full_name.strip() or f"Candidate_{candidate.id}"
        ).strip('_')[:100]

        safe_role = re.sub(
            r'[^A-Za-z0-9_-]+',
            '_',
            role_name
        ).strip('_')[:80]

        safe_name = safe_name or f"candidate_{candidate.id}"
        safe_role = safe_role or "role"

        resume.original_filename = f"{safe_name}_{safe_role}.pdf"
        resume.content_type = "application/pdf"
        resume.size_bytes = len(pdf_bytes)
        resume.status = 'indexed'
        resume.document_type = 'pdf'
        resume.file_hash = file_hash
        resume.raw_text = text_summary
        resume.cleaned_text = text_summary
        resume.parser_confidence = 1.0
        resume.extraction_confidence = 1.0
        resume.extraction_engine = 'auto_generated_pdf'
        resume.parser_engine = 'talent_profile_v1'

        # Write directly to existing file on disk if it exists
        if resume.file and resume.file.name:
            try:
                full_path = resume.file.path
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'wb') as f:
                    f.write(pdf_bytes)
            except Exception:
                resume.file.save(f"{safe_name}_{safe_role}_resume.pdf", ContentFile(pdf_bytes), save=False)
        else:
            resume.file.save(f"{safe_name}_{safe_role}_resume.pdf", ContentFile(pdf_bytes), save=False)

        return resume
    except Exception as exc:
        return (resume.id, str(exc))


class Command(BaseCommand):
    help = 'Fast multi-threaded candidate resume PDF regeneration.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--candidate-id',
            type=int,
            help='Regenerate resume for a specific candidate ID.',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Regenerate resumes for ALL candidates with resumes.',
        )
        parser.add_argument(
            '--dummy-only',
            action='store_true',
            default=True,
            help='Regenerate only placeholder/small resumes (<= 2500 bytes). Default: True.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Maximum number of resumes to process.',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Chunk batch size for parallel workers (default 1000).',
        )
        parser.add_argument(
            '--workers',
            type=int,
            default=16,
            help='Number of parallel worker threads (default 16).',
        )

    def handle(self, *args, **options):
        candidate_id = options.get('candidate_id')
        process_all = options.get('all')
        limit = options.get('limit')
        batch_size = options.get('batch_size')
        workers = options.get('workers')

        qs = Resume.objects.order_by('-id')

        if candidate_id:
            qs = qs.filter(candidate_id=candidate_id)
        elif not process_all:
            qs = qs.filter(size_bytes__lte=2500)

        resume_ids = list(qs.values_list('id', flat=True))
        if limit:
            resume_ids = resume_ids[:limit]

        total = len(resume_ids)
        self.stdout.write(self.style.NOTICE(f"Found {total} resumes to regenerate (using {workers} threads)."))

        if total == 0:
            self.stdout.write(self.style.SUCCESS("All candidate resumes are already up to date."))
            return

        success_count = 0
        failed_count = 0

        for start in range(0, total, batch_size):
            chunk_ids = resume_ids[start : start + batch_size]
            batch_resumes = list(
                Resume.objects
                .filter(id__in=chunk_ids)
                .select_related('candidate', 'candidate__target_job_role', 'candidate__org', 'target_job_role')
                .prefetch_related('candidate__skills', 'candidate__experiences', 'candidate__educations')
            )

            work_items = [
                (r, r.candidate, getattr(r.candidate, 'org', None), r.target_job_role)
                for r in batch_resumes
                if r.candidate
            ]

            resumes_to_update = []

            with ThreadPoolExecutor(max_workers=workers) as executor:
                futures = [executor.submit(_process_single_resume, item) for item in work_items]
                for future in as_completed(futures):
                    result = future.result()
                    if isinstance(result, Resume):
                        resumes_to_update.append(result)
                        success_count += 1
                    elif isinstance(result, tuple):
                        failed_count += 1
                        self.stdout.write(self.style.ERROR(f"Failed resume #{result[0]}: {result[1]}"))

            if resumes_to_update:
                Resume.objects.bulk_update(
                    resumes_to_update,
                    [
                        'original_filename',
                        'content_type',
                        'size_bytes',
                        'status',
                        'document_type',
                        'file_hash',
                        'raw_text',
                        'cleaned_text',
                        'parser_confidence',
                        'extraction_confidence',
                        'extraction_engine',
                        'parser_engine',
                        'file',
                    ],
                    batch_size=500,
                )

            self.stdout.write(f"Processed {min(start + batch_size, total)} / {total} resumes...")

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully regenerated {success_count} resumes ({failed_count} failed)."
            )
        )
