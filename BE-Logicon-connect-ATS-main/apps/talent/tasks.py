"""
apps/talent/tasks.py

Celery tasks for the talent pipeline.
"""

from celery import shared_task


@shared_task(bind=True, max_retries=0, name='talent.process_resume')
def process_resume_task(self, resume_id: int, force: bool = False) -> None:
    """
    Parse a resume through the full extraction → LLM → validation → persist pipeline.

    Skips resumes that are already 'indexed' (unless force=True).
    Skips 'duplicate_file' resumes unconditionally.
    All status transitions and error handling are inside run_pipeline().
    """
    from apps.talent.models import Resume
    from apps.talent.resume_parser.orchestration import run_pipeline

    try:
        resume = Resume.objects.select_related('candidate').get(pk=resume_id)
    except Resume.DoesNotExist:
        return

    if resume.status == 'duplicate_file':
        return

    if resume.status == 'indexed' and not force:
        return

    run_pipeline(resume)


@shared_task(bind=True, max_retries=0, name='talent.process_resume_import_item')
def process_resume_import_item_task(self, item_id: int) -> None:
    """Process one file from a bulk resume import batch."""
    from apps.talent.services import process_resume_import_item

    process_resume_import_item(item_id)


@shared_task(bind=True, max_retries=0, name='talent.process_excel_import_batch')
def process_excel_import_batch_task(self, batch_id: int, chunk_size: int = 500) -> None:
    """Process an Excel/CSV candidate import batch in chunks asynchronously."""
    from apps.talent.services import process_excel_import_batch

    process_excel_import_batch(batch_id, chunk_size=chunk_size)


@shared_task(
    bind=True,
    max_retries=0,
    name='talent.generate_bulk_candidate_resumes'
)
def generate_bulk_candidate_resumes_task(self, candidate_ids):
    """
    Generate professional resume PDFs for candidates in a small batch.

    Safe to run again:
    skips Candidate + target_job_role combinations
    that already have a Resume.
    """
    import re
    import hashlib

    from django.core.files.base import ContentFile
    from apps.talent.models import Candidate, Resume
    from apps.talent.resume_generator import (
        generate_candidate_resume_pdf_bytes,
        build_candidate_text_summary,
    )

    candidates = (
        Candidate.objects
        .filter(id__in=candidate_ids)
        .select_related('target_job_role', 'org')
        .prefetch_related('skills', 'experiences', 'educations')
    )

    existing_resume_keys = set(
        Resume.objects
        .filter(candidate_id__in=candidate_ids)
        .values_list(
            'candidate_id',
            'target_job_role_id'
        )
    )

    created_count = 0

    for candidate in candidates:
        job_role = candidate.target_job_role
        role_id = job_role.id if job_role else None

        dedup_key = (candidate.id, role_id)

        # Already has resume for this role
        if dedup_key in existing_resume_keys:
            continue

        name = candidate.full_name.strip() or f"Candidate_{candidate.id}"
        designation = (
            job_role.name
            if job_role
            else candidate.current_role or "General Candidate"
        )

        # -------- Generate professional candidate PDF & text summary --------
        try:
            pdf_bytes = generate_candidate_resume_pdf_bytes(candidate)
        except Exception:
            continue

        text_summary = build_candidate_text_summary(candidate)
        file_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # -------- Safe filename --------
        safe_name = re.sub(
            r'[^A-Za-z0-9_-]+',
            '_',
            name
        ).strip('_')[:100]

        safe_role = re.sub(
            r'[^A-Za-z0-9_-]+',
            '_',
            designation
        ).strip('_')[:80]

        safe_name = safe_name or f"candidate_{candidate.id}"
        safe_role = safe_role or "role"

        # -------- Create Resume --------
        resume = Resume(
            candidate=candidate,
            original_filename=f"{safe_name}_{safe_role}.pdf",
            content_type="application/pdf",
            size_bytes=len(pdf_bytes),
            status='indexed',
            source_type='excel_import',
            document_type='pdf',
            target_job_role=job_role,
            file_hash=file_hash,
            raw_text=text_summary,
            cleaned_text=text_summary,
            parser_confidence=1.0,
            extraction_confidence=1.0,
            extraction_engine='auto_generated_pdf',
            parser_engine='talent_profile_v1',
        )

        resume.file.save(
            f"{safe_name}_{safe_role}_resume.pdf",
            ContentFile(pdf_bytes),
            save=False,
        )

        resume.save()

        existing_resume_keys.add(dedup_key)
        created_count += 1

    return {
        "processed": len(candidate_ids),
        "created": created_count,
    }
