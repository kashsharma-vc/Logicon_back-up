import { useEffect, useState, useMemo } from 'react'
import { api } from '@/api/client'
import { listUsers, type UserRow } from '@/api/users'
import { unwrapDrfResults } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Drawer } from '@/components/ui/Drawer'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { AlertTriangle, Clock, ShieldAlert, ArrowRightLeft, CalendarClock, Settings } from 'lucide-react'

interface TATSetting {
  id: number
  trigger_type: string
  default_sla_hours: number
}

interface StepTemplate {
  id: number
  template: number
  template_name?: string
  order: number
  code: string
  name: string
  assignment_mode: string
  sla_hours: number | null
}

interface WorkflowFlow {
  id: number
  name: string
  trigger_type: string
}

interface ActiveTATStep {
  id: number
  workflow_id: number
  step_order: number
  step_code: string
  step_name: string
  status: string
  assigned_user: number | null
  assigned_user_display: {
    id: number
    username: string
    email: string
    full_name: string
  } | null
  assigned_department: number | null
  assigned_department_name_snapshot: string | null
  activated_at: string | null
  due_at: string | null
  sla_hours: number | null
  time_elapsed_hours: number
  tat_status: 'overdue' | 'on_track'
  target_info: {
    type: 'mrf' | 'sales_proposal' | 'mobilisation'
    id: number
    title: string
    url: string
    trigger_type_label: string
  } | null
}

export function TATPage() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'config'>('monitoring')
  
  // States for Config Tab
  const [tatSettings, setTatSettings] = useState<TATSetting[]>([])
  const [stepTemplates, setStepTemplates] = useState<StepTemplate[]>([])
  const [flows, setFlows] = useState<WorkflowFlow[]>([])
  const [configLoading, setConfigLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  
  // States for Monitoring Tab
  const [activeSteps, setActiveSteps] = useState<ActiveTATStep[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [monitoringLoading, setMonitoringLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Drawer states
  const [selectedStep, setSelectedStep] = useState<ActiveTATStep | null>(null)
  const [actionType, setActionType] = useState<'reassign' | 'override' | null>(null)
  const [newAssigneeId, setNewAssigneeId] = useState<string>('')
  const [reassignComment, setReassignComment] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newSlaHours, setNewSlaHours] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Step Template editing state
  const [editingStepId, setEditingStepId] = useState<number | null>(null)
  const [editingSlaValue, setEditingSlaValue] = useState<string>('')

  // Load defaults
  useEffect(() => {
    loadMonitoringData()
    loadConfigData()
  }, [])

  const loadMonitoringData = async () => {
    setMonitoringLoading(true)
    try {
      const [monRes, usersRes] = await Promise.all([
        api.get<ActiveTATStep[]>('/api/workflow/tat-monitoring/'),
        listUsers({ is_active: true })
      ])
      setActiveSteps(monRes.data)
      setUsers(usersRes.items || [])
    } catch (err) {
      console.error('Failed to load active TATs', err)
    } finally {
      setMonitoringLoading(false)
    }
  }

  const loadConfigData = async () => {
    setConfigLoading(true)
    try {
      const [settingsRes, stepsRes, flowsRes] = await Promise.all([
        api.get<TATSetting[]>('/api/workflow/tat-settings/'),
        api.get('/api/workflow/config/steps/'),
        api.get('/api/workflow/config/flows/')
      ])
      setTatSettings(settingsRes.data)
      
      const unwrappedSteps = unwrapDrfResults<StepTemplate>(stepsRes.data)
      setStepTemplates(unwrappedSteps.items)
      
      const unwrappedFlows = unwrapDrfResults<WorkflowFlow>(flowsRes.data)
      setFlows(unwrappedFlows.items)
    } catch (err) {
      console.error('Failed to load config data', err)
    } finally {
      setConfigLoading(false)
    }
  }

  // Save general default TAT settings
  const handleSaveDefaultSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      await api.post('/api/workflow/tat-settings/', tatSettings)
      alert('TAT configuration saved successfully!')
      loadConfigData()
    } catch (err) {
      console.error('Failed to save settings', err)
      alert('Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleUpdateDefaultHours = (triggerType: string, val: string) => {
    const hours = parseInt(val) || 0
    setTatSettings(prev => prev.map(s => s.trigger_type === triggerType ? { ...s, default_sla_hours: hours } : s))
  }

  // Inline SLA hour editing
  const startEditingSla = (step: StepTemplate) => {
    setEditingStepId(step.id)
    setEditingSlaValue(step.sla_hours !== null ? String(step.sla_hours) : '')
  }

  const saveSlaOverride = async (stepId: number) => {
    try {
      const hours = editingSlaValue === '' ? null : parseInt(editingSlaValue)
      await api.patch(`/api/workflow/config/steps/${stepId}/`, {
        sla_hours: hours
      })
      setEditingStepId(null)
      loadConfigData()
    } catch (err) {
      console.error('Failed to update step SLA', err)
      alert('Failed to update SLA')
    }
  }

  // Active step management action submit
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStep) return
    setActionSubmitting(true)
    setActionError(null)

    try {
      if (actionType === 'reassign') {
        if (!newAssigneeId) throw new Error('Please select a new assignee')
        await api.post(`/api/workflow/instances/${selectedStep.workflow_id}/steps/${selectedStep.id}/reassign/`, {
          new_user: parseInt(newAssigneeId),
          comment: reassignComment || 'Reassigned via TAT Administration Page'
        })
      } else if (actionType === 'override') {
        if (!newDueDate) throw new Error('Please select a new due date')
        await api.post(`/api/workflow/instances/${selectedStep.workflow_id}/steps/${selectedStep.id}/override-tat/`, {
          due_at: new Date(newDueDate).toISOString(),
          sla_hours: newSlaHours ? parseInt(newSlaHours) : null
        })
      }
      setSelectedStep(null)
      setActionType(null)
      setNewAssigneeId('')
      setReassignComment('')
      setNewDueDate('')
      setNewSlaHours('')
      loadMonitoringData()
    } catch (err: any) {
      setActionError(err.response?.data?.detail || err.message || 'Operation failed')
    } finally {
      setActionSubmitting(false)
    }
  }

  // Helpers
  const flowMap = useMemo(() => {
    return new Map(flows.map(f => [f.id, f]))
  }, [flows])

  const filteredSteps = useMemo(() => {
    return activeSteps.filter(s => {
      const titleMatches = s.target_info?.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.step_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           s.assigned_user_display?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const typeMatches = typeFilter === 'all' || s.target_info?.type === typeFilter
      const statusMatches = statusFilter === 'all' || s.tat_status === statusFilter
      
      return titleMatches && typeMatches && statusMatches
    })
  }, [activeSteps, searchQuery, typeFilter, statusFilter])

  const stats = useMemo(() => {
    const total = activeSteps.length
    const overdue = activeSteps.filter(s => s.tat_status === 'overdue').length
    const onTrack = total - overdue
    return { total, overdue, onTrack }
  }, [activeSteps])

  return (
    <div className="w-full space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-app-text">TAT Management & Monitoring</h2>
          <p className="text-sm text-app-secondary">
            Monitor Turnaround Times, resolve overdue steps, and configure SLA policy guidelines.
          </p>
        </div>
        
        {/* Quick Stats Badges */}
        <div className="flex gap-4">
          <div className="bg-app-bg/60 border border-app-border rounded-lg p-3 flex items-center gap-3 shadow-sm min-w-[120px]">
            <Clock className="w-5 h-5 text-brand-500" />
            <div>
              <p className="text-[10px] uppercase font-bold text-app-subtle">Active steps</p>
              <p className="text-lg font-bold text-app-text">{stats.total}</p>
            </div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3 shadow-sm min-w-[120px]">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-[10px] uppercase font-bold text-red-400">Overdue (&gt;72h)</p>
              <p className="text-lg font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-app-border gap-8">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'monitoring' ? 'border-brand-500 text-brand-500' : 'border-transparent text-app-secondary hover:text-app-text'
          }`}
        >
          Active TAT Monitoring
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'config' ? 'border-brand-500 text-brand-500' : 'border-transparent text-app-secondary hover:text-app-text'
          }`}
        >
          SLA & TAT Configuration
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'monitoring' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-app-bg border border-app-border rounded-xl p-4 shadow-sm">
            <div className="w-full md:w-72 relative">
              <input
                type="text"
                placeholder="Search by target, step, assignee..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-app-bg/50 border border-app-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            
            <div className="flex gap-4 w-full md:w-auto justify-end">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="all">All Request Types</option>
                <option value="mrf">MRF Approvals</option>
                <option value="mobilisation">Mobilisation</option>
                <option value="sales_proposal">Sales Proposals</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="overdue">Overdue</option>
                <option value="on_track">On Track</option>
              </select>
            </div>
          </div>

          {/* Active Steps Table */}
          {monitoringLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : filteredSteps.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-app-border rounded-xl">
              <Clock className="w-8 h-8 text-app-subtle mx-auto mb-2" />
              <p className="text-sm font-semibold text-app-text">No active TAT items match your filters</p>
            </div>
          ) : (
            <div className="border border-app-border rounded-xl overflow-hidden shadow-sm bg-app-bg">
              <Table>
                <THead>
                  <TR>
                    <TH>Target Details</TH>
                    <TH>Step Name</TH>
                    <TH>Current Assignee</TH>
                    <TH>Time Elapsed</TH>
                    <TH>Deadline / Due At</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredSteps.map(step => (
                    <TR key={step.id}>
                      <TD>
                        <div>
                          <p className="font-semibold text-sm text-app-text">{step.target_info?.title || `Instance #${step.workflow_id}`}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-app-border text-app-secondary font-bold uppercase">
                            {step.target_info?.trigger_type_label}
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <span className="font-medium text-app-text">{step.step_name}</span>
                        <p className="text-[10px] text-app-secondary font-mono">{step.step_code}</p>
                      </TD>
                      <TD>
                        {step.assigned_user_display ? (
                          <div>
                            <p className="text-sm font-semibold text-app-text">{step.assigned_user_display.full_name}</p>
                            <p className="text-xs text-app-subtle">{step.assigned_user_display.email}</p>
                            {step.assigned_department_name_snapshot && (
                              <p className="text-[10px] text-brand-500 font-bold">{step.assigned_department_name_snapshot}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-app-secondary italic">Unassigned / Queue</span>
                        )}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-app-secondary" />
                          <span className="text-sm font-bold text-app-text">{step.time_elapsed_hours} hrs</span>
                        </div>
                      </TD>
                      <TD>
                        <span className="text-sm text-app-text">
                          {step.due_at ? new Date(step.due_at).toLocaleString() : `${step.sla_hours || 72} hrs (Default)`}
                        </span>
                      </TD>
                      <TD>
                        {step.tat_status === 'overdue' ? (
                          <Badge variant="danger">Overdue</Badge>
                        ) : (
                          <Badge variant="success">On Track</Badge>
                        )}
                      </TD>
                      <TD className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setSelectedStep(step)
                              setActionType('reassign')
                            }}
                            className="flex items-center gap-1"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" /> Reassign
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setSelectedStep(step)
                              setActionType('override')
                              if (step.due_at) {
                                const d = new Date(step.due_at)
                                const offset = d.getTimezoneOffset()
                                const local = new Date(d.getTime() - (offset*60*1000))
                                setNewDueDate(local.toISOString().slice(0, 16))
                              }
                              setNewSlaHours(step.sla_hours ? String(step.sla_hours) : '')
                            }}
                            className="flex items-center gap-1"
                          >
                            <CalendarClock className="w-3.5 h-3.5" /> Override
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Default Hour settings */}
          <div className="lg:col-span-1 bg-app-bg border border-app-border rounded-xl p-5 shadow-sm space-y-4 h-fit">
            <div className="flex items-center gap-2 border-b border-app-border pb-3">
              <Settings className="w-5 h-5 text-brand-500" />
              <h3 className="font-bold text-app-text text-sm uppercase">Global Defaults</h3>
            </div>
            
            {configLoading ? (
              <div className="flex justify-center p-4"><Spinner /></div>
            ) : (
              <form onSubmit={handleSaveDefaultSettings} className="space-y-4">
                {tatSettings.map(setting => (
                  <div key={setting.id}>
                    <Input
                      label={`${setting.trigger_type === 'mrf' ? 'MRF Workflow' : 
                             setting.trigger_type === 'client_onboarding' ? 'Mobilisation Setup' : 
                             'Sales Proposal'} Default Limit (Hours)`}
                      type="number"
                      min="1"
                      value={setting.default_sla_hours}
                      onChange={e => handleUpdateDefaultHours(setting.trigger_type, e.target.value)}
                      required
                    />
                  </div>
                ))}
                
                <Button type="submit" className="w-full" disabled={savingSettings}>
                  {savingSettings ? 'Saving...' : 'Save Default Limits'}
                </Button>
              </form>
            )}
          </div>

          {/* Steps Templates List */}
          <div className="lg:col-span-2 bg-app-bg border border-app-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-app-text text-sm uppercase border-b border-app-border pb-3">
              Step Specific SLAs (SLA overrides by Workflow step)
            </h3>
            
            {configLoading ? (
              <div className="flex justify-center p-8"><Spinner /></div>
            ) : (
              <div className="border border-app-border rounded-lg overflow-hidden">
                <Table>
                  <THead>
                    <TR>
                      <TH>Workflow Flow</TH>
                      <TH>Step Code / Name</TH>
                      <TH>SLA Target Hours</TH>
                      <TH className="text-right">Action</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {stepTemplates.map(step => {
                      const flow = flowMap.get(step.template)
                      return (
                        <TR key={step.id}>
                          <TD>
                            <span className="font-semibold text-sm text-app-text">{flow?.name || `Flow #${step.template}`}</span>
                            <p className="text-[10px] text-app-subtle capitalize">{(flow?.trigger_type || '').replace('_', ' ')}</p>
                          </TD>
                          <TD>
                            <span className="text-sm text-app-text">{step.name}</span>
                            <p className="text-[10px] text-app-secondary font-mono">{step.code}</p>
                          </TD>
                          <TD>
                            {editingStepId === step.id ? (
                              <Input
                                label=""
                                type="number"
                                placeholder="e.g. 48"
                                className="w-20"
                                value={editingSlaValue}
                                onChange={e => setEditingSlaValue(e.target.value)}
                              />
                            ) : (
                              <span className="text-sm font-bold">
                                {step.sla_hours !== null ? `${step.sla_hours} hrs` : <span className="text-app-secondary font-normal italic">Use default</span>}
                              </span>
                            )}
                          </TD>
                          <TD className="text-right">
                            {editingStepId === step.id ? (
                              <div className="flex gap-2 justify-end">
                                <Button onClick={() => saveSlaOverride(step.id)}>
                                  Save
                                </Button>
                                <Button variant="secondary" onClick={() => setEditingStepId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button variant="secondary" onClick={() => startEditingSla(step)}>
                                Edit SLA
                              </Button>
                            )}
                          </TD>
                        </TR>
                      )
                    })}
                  </TBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reassign / Override Drawer */}
      <Drawer
        open={selectedStep !== null}
        onClose={() => {
          setSelectedStep(null)
          setActionType(null)
        }}
        title={actionType === 'reassign' ? 'Reassign Workflow Step' : 'Override Turnaround Deadline'}
      >
        {selectedStep && (
          <form onSubmit={handleActionSubmit} className="space-y-6">
            <div className="bg-app-bg border border-app-border rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-app-secondary">Target</p>
                <p className="text-sm font-semibold text-app-text">{selectedStep.target_info?.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-app-secondary">Step Name</p>
                  <p className="text-sm text-app-text">{selectedStep.step_name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-app-secondary">Time Active</p>
                  <p className="text-sm text-app-text font-semibold">{selectedStep.time_elapsed_hours} hrs</p>
                </div>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionType === 'reassign' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-app-secondary">Choose New Assignee</label>
                  <select
                    value={newAssigneeId}
                    onChange={e => setNewAssigneeId(e.target.value)}
                    required
                    className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Select user...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <Input
                  label="Comment / Reason (Optional)"
                  placeholder="Enter reason for reassignment..."
                  value={reassignComment}
                  onChange={e => setReassignComment(e.target.value)}
                />
              </div>
            )}

            {actionType === 'override' && (
              <div className="space-y-4">
                <Input
                  label="New Due Date & Time"
                  type="datetime-local"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  required
                />
                <Input
                  label="Specific SLA hours (Optional)"
                  type="number"
                  placeholder="e.g. 96"
                  value={newSlaHours}
                  onChange={e => setNewSlaHours(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-app-border">
              <Button type="submit" className="flex-1" disabled={actionSubmitting}>
                {actionSubmitting ? 'Submitting...' : 'Submit Change'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedStep(null)
                  setActionType(null)
                }}
                disabled={actionSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  )
}
