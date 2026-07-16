import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createApprovalRule,
  deleteApprovalRule,
  listApprovalFlows,
  listApprovalRules,
  updateApprovalRule,
} from '@/api/approvalSetup'
import { listClients, type ClientRow } from '@/api/clients'
import { listSites, type SiteProfileRow } from '@/api/sites'
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
import { ApprovalRuleForm } from '@/features/approvalSetup/ApprovalRuleForm'
import { mappingLevelLabel, requestTypeLabel } from '@/features/approvalSetup/labels'
import type { ApprovalFlowRow, ApprovalRuleRow, ApprovalRuleWriteInput } from '@/features/approvalSetup/types'

export function ApprovalRulesTab() {
  const me = useAuthStore((s) => s.me)
  const caps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canManage = hasAnyCapability(caps, [CAP.WORKFLOW_CONFIG_MANAGE])
  const orgId = me?.org ?? null

  const [flows, setFlows] = useState<ApprovalFlowRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [filterRt, setFilterRt] = useState('')
  const [filterClient, setFilterClient] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ApprovalRuleRow[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalRuleRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = 'approval-rule-form'

  const flowOptions = useMemo(() => flows.map((f) => ({ id: f.id, label: `${f.name} (${f.code})` })), [flows])
  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` })), [clients])

  const siteOptionsForForm = useMemo(
    () => sites.map((s) => ({ id: s.id, label: `${s.name} (${s.code})`, client: s.client })),
    [sites],
  )

  const loadLookups = useCallback(async () => {
    try {
      const [f, c, s] = await Promise.all([
        listApprovalFlows({ page: 1 }),
        listClients({ search: '', page: 1 }),
        listSites({ search: '', page: 1 }),
      ])
      setFlows(f.items)
      setClients(c.items)
      setSites(s.items)
    } catch {
      setFlows([])
      setClients([])
      setSites([])
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listApprovalRules({
        trigger_type: filterRt || undefined,
        client: filterClient ? Number(filterClient) : undefined,
        page: 1,
      })
      setRows(res.items)
    } catch (e: unknown) {
      setRows([])
      setError(parseApiError(e, 'Failed to load where-it-applies rules').message)
    } finally {
      setLoading(false)
    }
  }, [filterRt, filterClient])

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

  function openEdit(r: ApprovalRuleRow) {
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

  async function submit(values: ApprovalRuleWriteInput) {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await updateApprovalRule(editing.id, values)
      } else {
        await createApprovalRule(values)
      }
      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(r: ApprovalRuleRow) {
    if (!canManage) return
    const ok = window.confirm('Remove this rule?')
    if (!ok) return
    try {
      await deleteApprovalRule(r.id)
      await refresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
  }

  if (loading && rows.length === 0 && !error) return <Spinner label="Loading rules..." />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      <p className="text-sm text-app-secondary">Choose which approval flow applies to your company, a client, or a site.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select id="rule_f_rt" label="Request type" value={filterRt} onChange={(e) => setFilterRt(e.target.value)}>
          <option value="">All</option>
          <option value="mrf">{requestTypeLabel('mrf')}</option>
          <option value="client_onboarding">{requestTypeLabel('client_onboarding')}</option>
        </Select>
        <Select id="rule_f_client" label="Client" value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
          <option value="">All</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.label}
            </option>
          ))}
        </Select>
        {canManage ? (
          <div className="flex items-end">
            <Button type="button" onClick={openCreate} disabled={flows.length === 0}>
              Create rule
            </Button>
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No rules yet" description="Add a company default or client/site rule to connect flows to work." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH className="py-2">Request type</TH>
                <TH className="py-2">Applies to</TH>
                <TH className="py-2">Flow</TH>
                <TH className="py-2">Active</TH>
                {canManage ? <TH className="py-2 text-right">Actions</TH> : null}
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="py-2 text-sm text-app-secondary">{requestTypeLabel(r.trigger_type)}</TD>
                  <TD className="py-2 text-sm text-app-secondary">{mappingLevelLabel(r.mapping_level)}</TD>
                  <TD className="py-2 text-sm text-app-text">{r.template_name ?? r.template_code ?? `#${r.template}`}</TD>
                  <TD className="py-2 text-xs text-app-secondary">{r.is_active ? 'Yes' : 'No'}</TD>
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
        title={editing ? 'Edit where it applies' : 'Create where it applies'}
        description="The selected approval flow must match the request type."
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
        <ApprovalRuleForm
          formId={formId}
          initial={editing}
          orgId={orgId}
          flowOptions={flowOptions}
          clientOptions={clientOptions}
          siteOptions={siteOptionsForForm}
          submitting={submitting}
          errorMessage={formError}
          onSubmit={submit}
        />
      </Drawer>
    </div>
  )
}

