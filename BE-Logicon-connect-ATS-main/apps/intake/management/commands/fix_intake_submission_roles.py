import re
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils.text import slugify

from apps.intake.models import IntakeSubmission, QRCampaign
from apps.jobs.models import JobRole
from apps.talent.models import Candidate


class Command(BaseCommand):
    help = (
        "Inspect and fix existing IntakeSubmission records so that all submissions have "
        "accurate JobRole names, link 'other_role_title' to clean JobRoles, and sync Candidate roles."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview fixes without committing changes to the database.',
        )
        parser.add_argument(
            '--campaign-id',
            type=int,
            default=None,
            help='Limit fix to a specific Campaign ID.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        campaign_id = options.get('campaign_id')

        qs = IntakeSubmission.objects.select_related('job_role', 'candidate', 'campaign')
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)

        total_submissions = qs.count()
        self.stdout.write(self.style.MIGRATE_HEADING(f"=== Intake Submissions Role Audit (Total: {total_submissions}) ==="))

        if total_submissions == 0:
            self.stdout.write(self.style.WARNING("No intake submissions found."))
            return

        with_valid_role = 0
        fixed_from_other_title = 0
        fixed_from_candidate = 0
        cleaned_role_names = 0
        synced_candidates = 0

        # Cache existing roles per org
        roles_cache = {}

        def get_or_create_role(org, role_name_raw):
            clean_name = re.sub(r'\s+', ' ', str(role_name_raw or '')).strip()
            if not clean_name:
                return None
            key = (org.id if org else None, clean_name.lower())
            if key in roles_cache:
                return roles_cache[key]

            role = JobRole.objects.filter(
                Q(org=org) | Q(org__isnull=True),
                name__iexact=clean_name,
            ).first()

            if not role and not dry_run:
                base_code = slugify(clean_name)[:55] or 'role'
                code = base_code
                counter = 1
                while JobRole.objects.filter(Q(org=org) | Q(org__isnull=True), code=code).exists():
                    code = f"{base_code[:50]}_{counter}"
                    counter += 1
                role = JobRole.objects.create(
                    org=org,
                    name=clean_name,
                    code=code,
                    skill_category='unskilled',
                    is_active=True,
                )
            elif not role and dry_run:
                role = JobRole(
                    org=org,
                    name=clean_name,
                    code=slugify(clean_name)[:55] or 'role',
                    skill_category='unskilled',
                    is_active=True,
                )

            if role:
                roles_cache[key] = role
            return role

        with transaction.atomic():
            for sub in qs.iterator():
                updated = False
                org = sub.campaign.org if sub.campaign else None

                # 1. Check if job_role exists and has clean name
                if sub.job_role:
                    with_valid_role += 1
                    raw_role_name = sub.job_role.name or ''
                    clean_role_name = re.sub(r'\s+', ' ', raw_role_name).strip()
                    if raw_role_name != clean_role_name and clean_role_name:
                        if not dry_run:
                            sub.job_role.name = clean_role_name
                            sub.job_role.save(update_fields=['name'])
                        cleaned_role_names += 1
                elif sub.other_role_title and sub.other_role_title.strip():
                    # 2. Fix from other_role_title
                    target_role = get_or_create_role(org, sub.other_role_title)
                    if target_role:
                        sub.job_role = target_role
                        updated = True
                        fixed_from_other_title += 1
                elif sub.candidate:
                    # 3. Fallback to candidate's target_job_role or current_role
                    cand = sub.candidate
                    if cand.target_job_role:
                        sub.job_role = cand.target_job_role
                        updated = True
                        fixed_from_candidate += 1
                    elif cand.current_role and cand.current_role.strip():
                        target_role = get_or_create_role(org, cand.current_role)
                        if target_role:
                            sub.job_role = target_role
                            updated = True
                            fixed_from_candidate += 1

                # 4. Sync candidate profile if missing target role
                if sub.candidate and sub.job_role:
                    cand = sub.candidate
                    cand_updated = False
                    if not cand.target_job_role_id:
                        cand.target_job_role = sub.job_role
                        cand_updated = True
                    if not cand.current_role:
                        cand.current_role = sub.job_role.name
                        cand_updated = True
                    if cand_updated:
                        if not dry_run:
                            cand.save(update_fields=['target_job_role', 'current_role', 'updated_at'])
                        synced_candidates += 1

                if updated and not dry_run:
                    sub.save(update_fields=['job_role', 'updated_at'])

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=== Execution Summary ==="))
        self.stdout.write(f"  • Total Submissions Audited: {total_submissions}")
        self.stdout.write(f"  • Submissions with Existing Valid Role: {with_valid_role}")
        self.stdout.write(f"  • Submissions Linked from 'Other Role Title': {fixed_from_other_title}")
        self.stdout.write(f"  • Submissions Linked from Candidate Profile: {fixed_from_candidate}")
        self.stdout.write(f"  • Cleaned Role Name Whitespace: {cleaned_role_names}")
        self.stdout.write(f"  • Candidate Profiles Synced: {synced_candidates}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] No changes were committed to the database."))
            self.stdout.write("Run without --dry-run to apply these fixes permanently:")
            self.stdout.write(self.style.MIGRATE_LABEL("  python manage.py fix_intake_submission_roles"))
        else:
            self.stdout.write(self.style.SUCCESS("\n[SUCCESS] Database successfully updated with clean role mappings!"))
