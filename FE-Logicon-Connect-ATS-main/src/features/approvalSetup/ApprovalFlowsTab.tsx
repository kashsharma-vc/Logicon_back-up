import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createApprovalFlow,
  deleteApprovalFlow,
  listApprovalFlows,
  updateApprovalFlow,
} from '@/api/approvalSetup'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { ApprovalFlowForm } from '@/features/approvalSetup/ApprovalFlowForm'
import { requestTypeLabel } from '@/features/approvalSetup/labels'
import type { ApprovalFlowRow, ApprovalFlowWriteInput } from '@/features/approvalSetup/types'

export function ApprovalFlowsTab() {
  const caps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canManage = hasAnyCapability(caps, [CAP.WORKFLOW_CONFIG_MANAGE])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ApprovalFlowRow[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalFlowRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = 'approval-flow-form'

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listApprovalFlows({ page: 1 })
      setRows(res.items)
    } catch (e: unknown) {
      setRows([])
      setError(parseApiError(e, 'Failed to load approval flows').message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function openCreate() {
    setEditing(null)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(r: ApprovalFlowRow) {
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

  async function submit(values: ApprovalFlowWriteInput) {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateApprovalFlow(editing.id, values)
      } else {
        await createApprovalFlow(values)
      }
      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  async function deactivate(r: ApprovalFlowRow) {
    if (!canManage) return
    const ok = window.confirm(`Deactivate approval flow "${r.name}"?`)
    if (!ok) return
    try {
      await updateApprovalFlow(r.id, { is_active: false })
      await refresh()
    } catch (e1: unknown) {
      try {
        await deleteApprovalFlow(r.id)
        await refresh()
      } catch (e2: unknown) {
        alert(parseApiError(e2, 'Deactivate failed').message)
      }
    }
  }

  const mobile = useMemo(
    () => (
      <div className="grid gap-3 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
            <p className="font-semibold text-app-text">{r.name}</p>
            <p className="text-xs text-app-secondary">{requestTypeLabel(r.trigger_type)} Â/ v{r.version}</p>
            <p className="mt-2 text-xs text-app-subtle">{r.is_active ? 'Active' : 'Inactive'}</p>
            {canManage ? (
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(r)}>
                  Edit
                </Button>
                {r.is_active ? (
                  <Button variant="danger" className="min-h-9 px-3" onClick={() => void deactivate(r)}>
                    Deactivate
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    ),
    [rows, canManage],
  )

  if (loading) return <Spinner label="Loading approval flows..." />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-app-secondary">Define named approval flows for each request type.</p>
        {canManage ? (
          <Button type="button" onClick={openCreate}>
            Create approval flow
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No approval flows" description="Create a flow to begin configuring steps and assignments." />
      ) : (
        <>
          {mobile}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">Flow name</TH>
                  <TH className="py-2">Request type</TH>
                  <TH className="py-2">Version</TH>
                  <TH className="py-2">Active</TH>
                  <TH className="py-2">Description</TH>
                  {canManage ? <TH className="py-2 text-right">Actions</TH> : null}
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="py-2 font-medium text-app-text">{r.name}</TD>
                    <TD className="py-2 text-sm text-app-secondary">{requestTypeLabel(r.trigger_type)}</TD>
                    <TD className="py-2 text-sm text-app-secondary">{r.version}</TD>
                    <TD className="py-2 text-sm text-app-secondary">{r.is_active ? 'Yes' : 'No'}</TD>
                    <TD className="max-w-xs truncate py-2 text-xs text-app-secondary" title={r.description}>
                      {r.description || '-'}
                    </TD>
                    {canManage ? (
                      <TD className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(r)}>
                            Edit
                          </Button>
                          {r.is_active ? (
                            <Button variant="danger" className="min-h-9 px-3" onClick={() => void deactivate(r)}>
                              Deactivate
                            </Button>
                          ) : null}
                        </div>
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit approval flow' : 'Create approval flow'}
        description="Codes must stay unique within your organization."
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
        <ApprovalFlowForm formId={formId} initial={editing} submitting={submitting} errorMessage={formError} onSubmit={submit} />
      </Drawer>
    </div>
  )
}

