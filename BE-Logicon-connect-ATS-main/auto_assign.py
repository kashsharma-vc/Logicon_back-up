from apps.workflow.models import WorkflowStepTemplate, StepAssignmentConfig
from apps.access.models import AccessRole

# Find the roles
client_role = AccessRole.objects.filter(code='client').first()
hr_role = AccessRole.objects.filter(code='operations_manager').first() or AccessRole.objects.filter(code='admin').first()

# Update the steps to be role-based instead of named_user
steps = WorkflowStepTemplate.objects.filter(template__code='mrf_fast_track')
for step in steps:
    step.assignment_mode = 'role'
    step.save()

# Create assignments
for step in steps:
    # clear old ones
    StepAssignmentConfig.objects.filter(step=step).delete()
    
    if step.code in ('client_initial_review', 'client_final_review'):
        if client_role:
            StepAssignmentConfig.objects.create(
                step=step,
                role=client_role,
                assignment_type='role'
            )
            print(f"Assigned {step.code} to {client_role.name}")
    elif step.code == 'hr_review':
        if hr_role:
            StepAssignmentConfig.objects.create(
                step=step,
                role=hr_role,
                assignment_type='role'
            )
            print(f"Assigned {step.code} to {hr_role.name}")

print("Auto-assignment complete.")
