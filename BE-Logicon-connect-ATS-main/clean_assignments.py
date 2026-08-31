from apps.workflow.models import StepAssignmentConfig, WorkflowStepTemplate

# Fix WorkflowStepTemplate assignment_mode
bad_steps = WorkflowStepTemplate.objects.filter(template__code='mrf_fast_track', assignment_mode='role')
for step in bad_steps:
    step.assignment_mode = 'named_user'
    step.save()
    print(f"Fixed step {step.code} assignment_mode to named_user")

# Delete bad configs
bad_configs = StepAssignmentConfig.objects.filter(named_user__isnull=True)
count = bad_configs.count()
bad_configs.delete()
print(f"Deleted {count} invalid StepAssignmentConfig records without a named_user")
