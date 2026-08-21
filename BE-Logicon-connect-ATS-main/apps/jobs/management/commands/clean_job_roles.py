import re
from django.core.management.base import BaseCommand
from apps.jobs.models import JobRole
from apps.talent.models import Candidate, Resume


def is_invalid_role_name(name: str) -> bool:
    if not name:
        return True
    s = str(name).strip()
    # Reject email addresses
    if '@' in s or re.search(r'@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', s):
        return True
    # Reject dates or timestamps
    if '00:00:00' in s or re.search(r'\d{4}-\d{2}-\d{2}', s) or re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', s):
        return True
    # Reject mostly numeric strings / phone numbers
    digits = ''.join(filter(str.isdigit, s))
    if len(digits) >= 8 and (len(digits) / max(1, len(s)) > 0.6):
        return True
    # Reject URLs
    if s.startswith('http://') or s.startswith('https://') or s.startswith('www.'):
        return True
    # Reject excessively long strings (> 70 chars)
    if len(s) > 70:
        return True
    return False


class Command(BaseCommand):
    help = 'Clean up invalid JobRoles (e.g. emails, dates, numbers) from the database and remap associated candidates.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report invalid roles without deleting them',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        all_roles = list(JobRole.objects.all())
        self.stdout.write(f"Total JobRoles in DB: {len(all_roles)}")

        invalid_roles = [r for r in all_roles if is_invalid_role_name(r.name)]
        self.stdout.write(f"Invalid JobRoles found: {len(invalid_roles)}")

        if not invalid_roles:
            self.stdout.write(self.style.SUCCESS("All JobRoles in the database are clean!"))
            return

        for r in invalid_roles[:20]:
            self.stdout.write(f"  - ID {r.id}: '{r.name}' (Org: {r.org_id})")

        if len(invalid_roles) > 20:
            self.stdout.write(f"  ... and {len(invalid_roles) - 20} more.")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run complete. No changes made."))
            return

        # Remap candidates and resumes before deletion
        org_ids = set(r.org_id for r in invalid_roles if r.org_id)
        default_roles_by_org = {}
        for org_id in org_ids:
            role, _ = JobRole.objects.get_or_create(
                org_id=org_id,
                name="General Candidate",
                defaults={"code": "general_candidate", "skill_category": "unskilled"},
            )
            default_roles_by_org[org_id] = role

        remapped_candidates = 0
        remapped_resumes = 0

        for r in invalid_roles:
            default_role = default_roles_by_org.get(r.org_id)
            c_cnt = Candidate.objects.filter(target_job_role_id=r.id).update(target_job_role=default_role)
            res_cnt = Resume.objects.filter(target_job_role_id=r.id).update(target_job_role=default_role)
            remapped_candidates += c_cnt
            remapped_resumes += res_cnt

        invalid_ids = [r.id for r in invalid_roles]
        deleted_count, _ = JobRole.objects.filter(id__in=invalid_ids).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully deleted {deleted_count} invalid JobRoles. "
                f"Remapped {remapped_candidates} candidates and {remapped_resumes} resumes."
            )
        )
