from django.core.management.base import BaseCommand
from apps.deployment.models import Employee as LogiconEmployee, SiteDeployment
from apps.deployment.tasks import provision_employee_in_fieldsense


class Command(BaseCommand):
    help = 'Backfills logicon_employee_id into pre-existing FieldSense Employee accounts matching by email'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report matching employees without running provision task',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        self.stdout.write(f"Starting FieldSense employee backfill (dry_run={dry_run})...")

        active_deployments = SiteDeployment.objects.filter(status='active').select_related('employee', 'site')
        total = active_deployments.count()
        processed = 0

        for dep in active_deployments:
            emp = dep.employee
            self.stdout.write(
                f"Active deployment: Employee #{emp.id} [{emp.employee_code}] ({emp.email}) @ Site #{dep.site_id}"
            )
            if not dry_run:
                try:
                    provision_employee_in_fieldsense(emp.id, dep.id)
                    processed += 1
                except Exception as exc:
                    self.stderr.write(f"Failed to backfill employee #{emp.id}: {exc}")

        self.stdout.write(
            self.style.SUCCESS(f"Backfill finished. Total active deployments checked: {total}, Processed: {processed}")
        )
