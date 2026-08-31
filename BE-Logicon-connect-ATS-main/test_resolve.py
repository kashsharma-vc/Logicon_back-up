from apps.workflow.services import resolve_step_assignment
from apps.core.models import Organization
from django.utils import timezone

org = Organization.objects.first()
try:
    resolve_step_assignment('mrf', org, 'client_final_review', on_date=timezone.now().date())
    print('SUCCESS: client_final_review')
except Exception as e:
    print('ERROR client_final_review:', type(e), e)

try:
    resolve_step_assignment('mrf', org, 'client_initial_review', on_date=timezone.now().date())
    print('SUCCESS: client_initial_review')
except Exception as e:
    print('ERROR client_initial_review:', type(e), e)
