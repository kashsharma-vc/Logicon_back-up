from apps.workflow.models import WorkflowTemplate, WorkflowStepTemplate

template = WorkflowTemplate.objects.filter(code='mrf_fast_track').first()

if template:
    # Delete existing steps
    WorkflowStepTemplate.objects.filter(template=template).delete()

    # Re-create steps: client -> hr -> client
    # Step 10: Client Initial Review
    WorkflowStepTemplate.objects.create(
        template=template,
        order=10,
        code='client_initial_review',
        name='Client Initial Review',
        assignment_mode='named_user',
        actor_type='client',
        on_approve_next='hr_review',
        on_reject_target='',
        on_request_changes_target='',
    )
    
    # Step 20: HR Review
    WorkflowStepTemplate.objects.create(
        template=template,
        order=20,
        code='hr_review',
        name='HR Review',
        assignment_mode='named_user',
        actor_type='internal',
        on_approve_next='client_final_review',
        on_reject_target='client_initial_review',
        on_request_changes_target='client_initial_review',
    )
    
    # Step 30: Client Final Review
    WorkflowStepTemplate.objects.create(
        template=template,
        order=30,
        code='client_final_review',
        name='Client Final Review',
        assignment_mode='named_user',
        actor_type='client',
        on_approve_next='END',
        on_reject_target='hr_review',
        on_request_changes_target='hr_review',
    )
    
    print("Successfully updated Fast Track workflow to Client -> HR -> Client.")
else:
    print("Could not find mrf_fast_track template.")
