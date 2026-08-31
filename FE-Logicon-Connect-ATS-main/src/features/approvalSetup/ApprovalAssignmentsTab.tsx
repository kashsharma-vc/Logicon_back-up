import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createApprovalAssignment,
  deleteApprovalAssignment,
  listApprovalAssignments,
  listApprovalFlows,
  listApprovalSteps,
  updateApprovalAssignment,
} from '@/api/approvalSetup'
import { listClients, type ClientRow } from '@/api/clients'
import { listDepartments } from '@/api/departments'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { listUsers } from '@/api/users'
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
import { ApprovalAssignmentForm } from '@/features/approvalSetup/ApprovalAssignmentForm'
import { mappingLevelLabel, requestTypeLabel } from '@/features/approvalSetup/labels'
import type {
  ApprovalAssignmentRow,
  ApprovalAssignmentWriteInput,
  ApprovalFlowRow,
  ApprovalStepRow,
} from '@/features/approvalSetup/types'

export function ApprovalAssignmentsTab() {
  const me = useAuthStore((s) => s.me)
  const caps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canManage = hasAnyCapability(caps, [CAP.WORKFLOW_CONFIG_MANAGE])
  const orgId = me?.org ?? null

  const [flows, setFlows] = useState<ApprovalFlowRow[]>([])
  const [steps, setSteps] = useState<ApprovalStepRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [departments, setDepartments] = useState<{ id: number; name: string; code: string }[]>([])
  const [users, setUsers] = useState<{ id: number; label: string; department?: number | null }[]>([])

  const [filterRt, setFilterRt] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterFlow, setFilterFlow] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ApprovalAssignmentRow[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalAssignmentRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = 'approval-assignment-form'

  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` })), [clients])
  const siteOptions = useMemo(
    () => sites.map((s) => ({ id: s.id, label: `${s.name} (${s.code})`, client: s.client })),
    [sites],
  )
  const departmentOptions = useMemo(
    () => departments.map((d) => ({ id: d.id, label: `${d.name} (${d.code})` })),
    [departments],
  )

  const stepCodeOptions = useMemo(() => {
    const tid = filterFlow ? Number(filterFlow) : null
    const list = tid && Number.isFinite(tid) && tid > 0 ? steps.filter((s) => s.template === tid) : steps
    return [...list]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ code: s.code, label: `${s.order}. ${s.name} (${s.code})` }))
  }, [steps, filterFlow])

  const loadLookups = useCallback(async () => {
    try {
      const [f, st, c, s, d, u] = await Promise.all([
        listApprovalFlows({ page: 1 }),
        listApprovalSteps({ page: 1 }),
        listClients({ search: '', page: 1 }),
        listSites({ search: '', page: 1 }),
        listDepartments({ is_active: true, page: 1 }),
        listUsers({ is_active: true, page: 1 }),
      ])
      setFlows(f.items)
      setSteps(st.items)
      setClients(c.items)
      setSites(s.items)
      setDepartments(d.items.map((x) => ({ id: x.id, name: x.name, code: x.code })))
      setUsers(
        u.items.map((usr) => ({
          id: usr.id,
          label: [usr.first_name, usr.last_name].filter(Boolean).join(' ') || usr.username,
          department: usr.department ?? null,
        })),
      )
    } catch {
      setFlows([])
      setSteps([])
      setClients([])
      setSites([])
      setDepartments([])
      setUsers([])
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listApprovalAssignments({
        trigger_type: filterRt || undefined,
        client: filterClient ? Number(filterClient) : undefined,
        site: filterSite ? Number(filterSite) : undefined,
        template: filterFlow ? Number(filterFlow) : undefined,
        page: 1,
      })
      setRows(res.items)
    } catch (e: unknown) {
      setRows([])
      setError(parseApiError(e, 'Failed to load responsible people').message)
    } finally {
      setLoading(false)
    }
  }, [filterRt, filterClient, filterSite, filterFlow])

  useEffect(() => {
    void loadLookups()
  }, [loadLookups])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function openCreate() {
    setEditing(null)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(r: ApprovalAssignmentRow) {
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

  async function submit(values: ApprovalAssignmentWriteInput) {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateApprovalAssignment(editing.id, values)
      } else {
        await createApprovalAssignment(values)
      }
      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(r: ApprovalAssignmentRow) {
    if (!canManage) return
    const ok = window.confirm('Remove this assignment?')
    if (!ok) return
    try {
      await deleteApprovalAssignment(r.id)
      await refresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
  }

  if (loading && rows.length === 0 && !error) return <Spinner label="Loading assignments..." />
  if (error) return <ErrorState message={error} />

  const flowOpts = flows.map((f) => ({ id: f.id, label: `${f.name} (${f.code})` }))

  return (
    <div className="space-y-4">
      <p className="text-sm text-app-secondary">Choose who handles each approval step at company, client, or site level.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select id="asg_rt" label="Request type" value={filterRt} onChange={(e) => setFilterRt(e.target.value)}>
          <option value="">All</option>
          <option value="mrf">{requestTypeLabel('mrf')}</option>
          <option value="client_onboarding">{requestTypeLabel('client_onboarding')}</option>
        </Select>
        <Select id="asg_client" label="Client" value={filterClient} onChange={(e) => { setFilterClient(e.target.value); setFilterSite('') }}>
          <option value="">All</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select id="asg_site" label="Site" value={filterSite} onChange={(e) => setFilterSite(e.target.value)} disabled={!filterClient}>
          <option value="">All</option>
          {sites
            .filter((s) => !filterClient || s.client === Number(filterClient))
            .map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
        </Select>
        <Select id="asg_flow" label="Approval flow (step filter)" value={filterFlow} onChange={(e) => setFilterFlow(e.target.value)}>
          <option value="">All flows</option>
          {flowOpts.map((f) => (
            <option key={f.id} value={String(f.id)}>
              {f.label}
            </option>
          ))}
        </Select>
        {canManage ? (
          <div className="flex items-end">
            <Button type="button" onClick={openCreate}>
              Create assignment
            </Button>
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No assignments" description="Define who is responsible for each step in context." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH className="py-2">Request type</TH>
                <TH className="py-2">Step</TH>
                <TH className="py-2">Applies to</TH>
                <TH className="py-2">Department</TH>
                <TH className="py-2">Responsible person</TH>
                <TH className="py-2">Active</TH>
                <TH className="py-2">Effective</TH>
                {canManage ? <TH className="py-2 text-right">Actions</TH> : null}
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="py-2 text-xs text-app-secondary">{requestTypeLabel(r.trigger_type)}</TD>
                  <TD className="py-2 text-sm text-app-text">{r.step_name ?? r.step_code}</TD>
                  <TD className="py-2 text-xs text-app-secondary">{mappingLevelLabel(r.assignment_level)}</TD>
                  <TD className="py-2 text-xs text-app-secondary">{r.department_name ?? '-'}</TD>
                  <TD className="py-2 text-xs text-app-secondary">{r.named_user_name ?? '-'}</TD>
                  <TD className="py-2 text-xs text-app-secondary">{r.is_active ? 'Yes' : 'No'}</TD>
                  <TD className="py-2 text-xs text-app-secondary">
                    {r.effective_from ?? '-'} to {r.effective_to ?? '-'}
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
        title={editing ? 'Edit responsible person' : 'Create responsible person'}
        description="Only specific person mode is supported today. The server validates department and scope."
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
        <ApprovalAssignmentForm
          formId={formId}
          initial={editing}
          orgId={orgId}
          stepCodeOptions={stepCodeOptions}
          clientOptions={clientOptions}
          siteOptions={siteOptions}
          departmentOptions={departmentOptions}
          userOptions={users}
          submitting={submitting}
          errorMessage={formError}
          onSubmit={submit}
        />
      </Drawer>
    </div>
  )
}

