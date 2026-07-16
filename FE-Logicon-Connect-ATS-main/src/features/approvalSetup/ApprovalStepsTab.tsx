import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createApprovalStep,
  deleteApprovalStep,
  listApprovalFlows,
  listApprovalSteps,
  updateApprovalStep,
} from '@/api/approvalSetup'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { ApprovalStepForm } from '@/features/approvalSetup/ApprovalStepForm'
import { ASSIGNMENT_MODE_LABEL } from '@/features/approvalSetup/labels'
import type { ApprovalFlowRow, ApprovalStepRow, ApprovalStepWriteInput } from '@/features/approvalSetup/types'

export function ApprovalStepsTab() {
  const caps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canManage = hasAnyCapability(caps, [CAP.WORKFLOW_CONFIG_MANAGE])

  const [flows, setFlows] = useState<ApprovalFlowRow[]>([])
  const [flowFilter, setFlowFilter] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ApprovalStepRow[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalStepRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = 'approval-step-form'
  const [siblingSteps, setSiblingSteps] = useState<ApprovalStepRow[]>([])

  const flowOptions = useMemo(() => flows.map((f) => ({ id: f.id, label: `${f.name} (${f.code})` })), [flows])

  const loadSiblings = useCallback(async (templateId: number) => {
    try {
      const res = await listApprovalSteps({ template: templateId, page: 1 })
      setSiblingSteps(res.items)
    } catch {
      setSiblingSteps([])
    }
  }, [])

  useEffect(() => {
    if (!drawerOpen) return
    if (editing) {
      void loadSiblings(editing.template)
      return
    }
    if (flowFilter) {
      const tid = Number(flowFilter)
      if (Number.isFinite(tid) && tid > 0) void loadSiblings(tid)
      else setSiblingSteps([])
    } else {
      setSiblingSteps([])
    }
  }, [drawerOpen, editing?.id, editing?.template, flowFilter, loadSiblings])

  const loadFlows = useCallback(async () => {
    try {
      const res = await listApprovalFlows({ page: 1 })
      setFlows(res.items)
    } catch {
      setFlows([])
    }
  }, [])

  const refreshSteps = useCallback(async () => {
    setLoading(true)
    setError(null)
    const tid = flowFilter ? Number(flowFilter) : undefined
    try {
      const res = await listApprovalSteps({
        template: tid && Number.isFinite(tid) && tid > 0 ? tid : undefined,
        page: 1,
      })
      setRows(res.items)
    } catch (e: unknown) {
      setRows([])
      setError(parseApiError(e, 'Failed to load approval steps').message)
    } finally {
      setLoading(false)
    }
  }, [flowFilter])

  useEffect(() => {
    void loadFlows()
  }, [loadFlows])

  useEffect(() => {
    void refreshSteps()
  }, [refreshSteps])

  function openCreate() {
    setEditing(null)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(r: ApprovalStepRow) {
    setEditing(r)
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
    setFormError(null)
    setSubmitting(false)
  }

  async function submit(values: ApprovalStepWriteInput) {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateApprovalStep(editing.id, values)
      } else {
        await createApprovalStep(values)
      }
      closeDrawer()
      await refreshSteps()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(r: ApprovalStepRow) {
    if (!canManage) return
    const ok = window.confirm(`Delete approval step "${r.name}"?`)
    if (!ok) return
    try {
      await deleteApprovalStep(r.id)
      await refreshSteps()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
  }

  const flowIdForForm = editing ? editing.template : flowFilter ? Number(flowFilter) : null

  if (loading && rows.length === 0 && !error) return <Spinner label="Loading steps..." />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Select
          id="steps_flow_filter"
          label="Approval flow"
          value={flowFilter}
          onChange={(e) => setFlowFilter(e.target.value)}
        >
          <option value="">All flows</option>
          {flowOptions.map((f) => (
            <option key={f.id} value={String(f.id)}>
              {f.label}
            </option>
          ))}
        </Select>
        {canManage ? (
          <Button type="button" onClick={openCreate} disabled={flows.length === 0}>
            Create approval step
          </Button>
        ) : null}
      </div>
      {!flowFilter ? <p className="text-xs text-app-subtle">Select a flow to narrow steps, or leave as all flows.</p> : null}

      {rows.length === 0 ? (
        <EmptyState title="No steps" description="Pick a flow filter or create a step on an existing flow." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH className="py-2">Order</TH>
                <TH className="py-2">Step name</TH>
                <TH className="py-2">Code</TH>
                <TH className="py-2">Responsible type</TH>
                <TH className="py-2">When approved</TH>
                <TH className="py-2">When rejected</TH>
                <TH className="py-2">Comment rules</TH>
                {canManage ? <TH className="py-2 text-right">Actions</TH> : null}
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="py-2 text-sm text-app-secondary">{r.order}</TD>
                  <TD className="py-2 text-sm font-medium text-app-text">{r.name}</TD>
                  <TD className="py-2 font-mono text-xs text-app-secondary">{r.code}</TD>
                  <TD className="py-2 text-xs text-app-secondary">{ASSIGNMENT_MODE_LABEL[r.assignment_mode] ?? r.assignment_mode}</TD>
                  <TD className="max-w-[140px] truncate py-2 text-xs text-app-secondary" title={r.on_approve_next || '(next)'}>
                    {!r.on_approve_next ? 'Next step' : r.on_approve_next === 'END' ? 'Finish approval' : r.on_approve_next}
                  </TD>
                  <TD className="max-w-[140px] truncate py-2 text-xs text-app-secondary" title={r.on_reject_target || ''}>
                    {!r.on_reject_target ? 'End as rejected' : r.on_reject_target}
                  </TD>
                  <TD className="py-2 text-xs text-app-secondary">
                    {r.requires_comment_on_reject ? 'Reject comment' : ''}
                    {r.requires_comment_on_reject && r.requires_comment_on_request_changes ? ' Â/ ' : ''}
                    {r.requires_comment_on_request_changes ? 'Changes comment' : ''}
                  </TD>
                  {canManage ? (
                    <TD className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(r)}>
                          Edit
                        </Button>
                        <Button variant="danger" className="min-h-9 px-3" onClick={() => void remove(r)}>
                          Delete
                        </Button>
                      </div>
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit approval step' : 'Create approval step'}
        description="Transition targets must reference step codes that exist on the same flow."
        onClose={closeDrawer}
        footer={
          canManage ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeDrawer} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" form={formId} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : null
        }
      >
        <ApprovalStepForm
          formId={formId}
          initial={editing}
          flowId={flowIdForForm}
          flowOptions={flowOptions}
          stepsInFlow={siblingSteps}
          submitting={submitting}
          errorMessage={formError}
          onSubmit={submit}
          onTemplateChange={(tid) => void loadSiblings(tid)}
        />
      </Drawer>
    </div>
  )
}

