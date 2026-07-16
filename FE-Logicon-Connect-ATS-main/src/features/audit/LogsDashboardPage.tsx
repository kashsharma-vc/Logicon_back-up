import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Monitor, Smartphone, Tablet, Download, RefreshCw, AlertCircle, Clock, ShieldAlert, Mail } from 'lucide-react'
import { fetchUserActivityLogs, fetchUserActivityStats, exportUserActivityExcel, fetchEmailSettings, updateEmailSettings, sendTestEmail, type UserActivityLog, type ActivityStats, type EmailSettings } from '@/api/userActivity'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Drawer } from '@/components/ui/Drawer'

function parsePage(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return undefined
  return Math.floor(n)
}

export function LogsDashboardPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const session_status = params.get('session_status') ?? ''
  const attendance_status = params.get('attendance_status') ?? ''
  const start_date = params.get('start_date') ?? ''
  const end_date = params.get('end_date') ?? ''
  const page = parsePage(params.get('page')) ?? 1

  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)

  const [logs, setLogs] = useState<UserActivityLog[]>([])
  const [count, setCount] = useState<number>(0)
  const [stats, setStats] = useState<ActivityStats | null>(null)

  // Email Configuration State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    subject: 'Daily Attendance & Session Logs Report',
    body: 'Hello Admin,\n\nPlease find attached the daily user attendance and session activity report.\n\nRegards,\nLogicon Team',
    is_enabled: true
  })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function loadLogs() {
    setLogsLoading(true)
    setLogsError(null)
    try {
      const data = await fetchUserActivityLogs({
        page,
        search: search || undefined,
        session_status: session_status || undefined,
        attendance_status: attendance_status || undefined,
        start_date: start_date || undefined,
        end_date: end_date || undefined
      })
      setLogs(data.results)
      setCount(data.count)
    } catch (e: unknown) {
      setLogsError(e instanceof Error ? e.message : 'Failed to load activity logs')
    } finally {
      setLogsLoading(false)
    }
  }

  async function loadStats() {
    try {
      const data = await fetchUserActivityStats({
        start_date: start_date || undefined,
        end_date: end_date || undefined
      })
      setStats(data)
    } catch (e: unknown) {
      console.error('Failed to load statistics', e)
    }
  }

  useEffect(() => {
    void loadLogs()
    void loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, session_status, attendance_status, start_date, end_date, page])

  useEffect(() => {
    async function getSettings() {
      try {
        const s = await fetchEmailSettings()
        setEmailSettings(s)
      } catch (e) {
        console.error('Failed to load email settings', e)
      }
    }
    void getSettings()
  }, [])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(count / 100))
  }, [count])

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.session_status !== undefined || next.attendance_status !== undefined || next.start_date !== undefined || next.end_date !== undefined) {
      p.delete('page')
    }
    setParams(p)
  }

  const handleExport = async () => {
    try {
      const data = await exportUserActivityExcel({
        search: search || undefined,
        session_status: session_status || undefined,
        attendance_status: attendance_status || undefined,
        start_date: start_date || undefined,
        end_date: end_date || undefined
      })
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Logicon_Activity_Logs_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Failed to export Excel report', e)
    }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    setToastMsg(null)
    try {
      const updated = await updateEmailSettings(emailSettings)
      setEmailSettings(updated)
      setToastMsg({ type: 'success', text: 'Email report settings saved successfully.' })
    } catch (e) {
      setToastMsg({ type: 'error', text: 'Failed to save email settings.' })
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleSendTest = async () => {
    setTestSending(true)
    setToastMsg(null)
    try {
      const res = await sendTestEmail()
      setToastMsg({ type: 'success', text: res.detail })
    } catch (e: any) {
      setToastMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to send test email.' })
    } finally {
      setTestSending(false)
    }
  }

  const formatDuration = (login: string, logout: string | null) => {
    if (!logout) return 'Active Now'
    const diff = new Date(logout).getTime() - new Date(login).getTime()
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }

  const deviceIcons = {
    Desktop: <Monitor className="h-4 w-4 text-brand-600 dark:text-brand-400" />,
    Mobile: <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    Tablet: <Tablet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
  }

  const anomalies = useMemo(() => {
    return logs.filter(log => {
      const hour = new Date(log.login_time).getHours()
      const isOffHours = hour < 7 || hour > 21
      return isOffHours || !log.employee_code
    })
  }, [logs])

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-app-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Logs & Attendance</h1>
          <p className="text-app-secondary text-sm">Real-time session audit, security telemetry and department-wise attendance metrics.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email Settings
          </Button>
          <Button variant="secondary" onClick={() => { void loadLogs(); void loadStats(); }} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="primary" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-surface border border-app-border rounded-panel p-5 shadow-panel relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-app-secondary uppercase tracking-wider">Total Active Sessions</span>
            <div className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-app-text">{stats?.kpis.active_now ?? 0}</span>
            <span className="text-xs text-status-success font-medium">online now</span>
          </div>
          <div className="mt-2 text-xs text-app-secondary flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-status-success" />
            Live network session connections
          </div>
        </div>

        <div className="bg-app-surface border border-app-border rounded-panel p-5 shadow-panel relative overflow-hidden">
          <span className="text-xs font-semibold text-app-secondary uppercase tracking-wider">Present In Range</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-app-text">{stats?.kpis.present_today ?? 0}</span>
            <span className="text-xs text-app-secondary font-normal">staff registered</span>
          </div>
          <div className="mt-2 text-xs text-app-secondary flex items-center gap-1">
            <Clock className="h-3 w-3 text-app-secondary" />
            First daily login activity
          </div>
        </div>

        <div className="bg-app-surface border border-app-border rounded-panel p-5 shadow-panel relative overflow-hidden">
          <span className="text-xs font-semibold text-app-secondary uppercase tracking-wider">Late Arrivals</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-status-warning">{stats?.kpis.late_today ?? 0}</span>
            <span className="text-xs text-status-warning/90 font-normal">after 09:30 AM</span>
          </div>
          <div className="mt-2 text-xs text-app-secondary flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-status-warning" /> Requires shift attention
          </div>
        </div>

        <div className="bg-app-surface border border-app-border rounded-panel p-5 shadow-panel relative overflow-hidden">
          <span className="text-xs font-semibold text-app-secondary uppercase tracking-wider">Total Audited Sessions</span>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-app-text">{stats?.kpis.total_sessions ?? 0}</span>
          </div>
          <div className="mt-2 text-xs text-app-secondary">Historical database logs</div>
        </div>
      </div>

      {/* Visual Analytics grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Breakdowns */}
        <div className="bg-app-surface border border-app-border rounded-panel p-5 shadow-panel">
          <h3 className="text-base font-bold text-app-text mb-4">Department-wise Today</h3>
          <div className="space-y-4">
            {stats && Object.keys(stats.department_breakdown).length > 0 ? (
              Object.entries(stats.department_breakdown).map(([dept, count]) => {
                const total = Object.values(stats.department_breakdown).reduce((a, b) => a + b, 0)
                const percentage = Math.round((count / (total || 1)) * 100)
                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-app-text font-medium">{dept}</span>
                      <span className="text-app-secondary text-xs">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-app-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand-600 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-app-secondary text-sm text-center py-6">No logins registered today</p>
            )}
          </div>
        </div>

        {/* Roles Breakdowns */}
        <div className="bg-app-surface border border-app-border rounded-panel p-5 shadow-panel">
          <h3 className="text-base font-bold text-app-text mb-4">Roles-wise Daily Logins</h3>
          <div className="space-y-4">
            {stats && Object.keys(stats.role_breakdown).length > 0 ? (
              Object.entries(stats.role_breakdown).map(([role, count]) => {
                const total = Object.values(stats.role_breakdown).reduce((a, b) => a + b, 0)
                const percentage = Math.round((count / (total || 1)) * 100)
                return (
                  <div key={role} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-app-text font-medium">{role}</span>
                      <span className="text-app-secondary text-xs">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-app-muted rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-app-secondary text-sm text-center py-6">No roles breakdown available today</p>
            )}
          </div>
        </div>

        {/* Device breakdown & security warnings */}
        <div className="bg-app-surface border border-app-border rounded-panel p-5 shadow-panel flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-app-text mb-4">Device Usage Telemetry</h3>
            <div className="grid grid-cols-3 gap-2 text-center mt-2">
              {stats && Object.entries(stats.device_breakdown).map(([device, value]) => {
                const total = Object.values(stats.device_breakdown).reduce((a, b) => a + b, 0)
                const pct = Math.round((value / (total || 1)) * 100)
                return (
                  <div key={device} className="bg-app-muted/30 p-3 border border-app-border rounded-panel flex flex-col items-center">
                    <div className="p-1.5 bg-app-surface rounded-lg mb-1.5 border border-app-border">
                      {deviceIcons[device as keyof typeof deviceIcons]}
                    </div>
                    <span className="text-[11px] text-app-secondary block">{device}</span>
                    <span className="text-base font-extrabold text-app-text mt-0.5">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-app-border">
            <div className="flex items-center gap-2 text-status-warning font-semibold text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Security / Telemetry Flags
            </div>
            <p className="text-xs text-app-secondary mt-1">
              Detected <span className="text-app-text font-medium">{anomalies.length}</span> off-hours logins or sessions missing formal employee identifiers.
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Data Table */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-app-surface border border-app-border rounded-panel p-4 shadow-panel flex flex-col lg:flex-row gap-4 items-end">
          <div className="relative flex-1 w-full">
            <label className="text-sm font-medium text-app-secondary block mb-1">Search Logs</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-app-secondary" />
              <input
                type="text"
                placeholder="Search name, email, employee code..."
                value={search}
                onChange={(e) => updateParam({ search: e.target.value })}
                className="w-full bg-app-surface border border-app-border text-app-text rounded-panel py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-sm font-medium text-app-secondary">Start Date</label>
              <input
                type="date"
                value={start_date}
                onChange={(e) => updateParam({ start_date: e.target.value })}
                className="bg-app-surface border border-app-border text-app-text rounded-panel py-2 px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 w-full sm:w-40"
              />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-sm font-medium text-app-secondary">End Date</label>
              <input
                type="date"
                value={end_date}
                onChange={(e) => updateParam({ end_date: e.target.value })}
                className="bg-app-surface border border-app-border text-app-text rounded-panel py-2 px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 w-full sm:w-40"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Select
                label="Session Status"
                value={session_status}
                onChange={(e) => updateParam({ session_status: e.target.value })}
                className="w-full sm:w-44"
              >
                <option value="">All Session Statuses</option>
                <option value="active">Active Now</option>
                <option value="completed">Completed Logout</option>
                <option value="timed_out">Timed Out</option>
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Select
                label="Attendance"
                value={attendance_status}
                onChange={(e) => updateParam({ attendance_status: e.target.value })}
                className="w-full sm:w-44"
              >
                <option value="">All Attendance</option>
                <option value="present">Present</option>
                <option value="late">Late Arrival</option>
                <option value="under_hours">Under Hours</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        {logsLoading ? (
          <div className="py-20 flex justify-center items-center">
            <Spinner />
          </div>
        ) : logsError ? (
          <div className="p-8">
            <ErrorState message={logsError} />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-app-surface border border-app-border rounded-panel p-20 text-center text-app-secondary shadow-panel">
            <AlertCircle className="h-10 w-10 mx-auto text-app-secondary opacity-60 mb-3" />
            <p className="text-base font-medium">No activity logs match your filters</p>
          </div>
        ) : (
          <div>
            <Table>
              <THead>
                <TR>
                  <TH className="py-4">Employee</TH>
                  <TH className="py-4">Role</TH>
                  <TH className="py-4">Department</TH>
                  <TH className="py-4">Login Time</TH>
                  <TH className="py-4">Logout Time</TH>
                  <TH className="py-4">Duration</TH>
                  <TH className="py-4">Attendance</TH>
                  <TH className="py-4">IP & Connection</TH>
                </TR>
              </THead>
              <TBody>
                {logs.map((log) => (
                  <TR key={log.id}>
                    <TD className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-sm">
                          {log.first_name?.[0]}{log.last_name?.[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-app-text block text-sm">{log.first_name} {log.last_name}</span>
                          <span className="text-xs text-app-secondary block">Code: {log.employee_code || 'N/A'}</span>
                        </div>
                      </div>
                    </TD>
                    <TD className="py-3">
                      {log.role_name ? (
                        <Badge variant="info">{log.role_name}</Badge>
                      ) : (
                        <span className="text-app-secondary text-xs">-</span>
                      )}
                    </TD>
                    <TD className="py-3">
                      {log.department_name ? (
                        <Badge variant="neutral">{log.department_name}</Badge>
                      ) : (
                        <span className="text-app-secondary text-xs">-</span>
                      )}
                    </TD>
                    <TD className="py-3 text-sm text-app-secondary">
                      {new Date(log.login_time).toLocaleString()}
                    </TD>
                    <TD className="py-3 text-sm text-app-secondary">
                      {log.logout_time ? new Date(log.logout_time).toLocaleString() : (
                        <span className="flex items-center gap-1.5 text-status-success font-semibold text-xs animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
                          Active Now
                        </span>
                      )}
                    </TD>
                    <TD className="py-3 text-sm text-app-text font-medium">
                      {formatDuration(log.login_time, log.logout_time)}
                    </TD>
                    <TD className="py-3">
                      {log.attendance_status === 'present' && <Badge variant="success">Present</Badge>}
                      {log.attendance_status === 'late' && <Badge variant="warning">Late Arrival</Badge>}
                      {log.attendance_status === 'under_hours' && <Badge variant="attention">Under Hours</Badge>}
                      {log.attendance_status === 'absent' && <Badge variant="danger">Absent</Badge>}
                    </TD>
                    <TD className="py-3 text-xs text-app-secondary">
                      <span className="block font-mono font-medium text-app-text">{log.ip_address || 'Unknown'}</span>
                      <span className="block text-[10px] text-app-secondary truncate max-w-[150px]" title={log.user_agent || ''}>{log.user_agent || 'N/A'}</span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-app-border flex justify-between items-center bg-app-surface/50">
                <span className="text-xs text-app-secondary">Showing page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => updateParam({ page: String(page - 1) })}
                    className="text-xs px-3 py-1.5"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => updateParam({ page: String(page + 1) })}
                    className="text-xs px-3 py-1.5"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Report Settings Drawer */}
      <Drawer
        open={isSettingsOpen}
        onClose={() => { setIsSettingsOpen(false); setToastMsg(null); }}
        title="Email Report Configuration"
        description="Modify template subject, body, and enable scheduled daily logs delivery at 8:30 PM."
      >
        <div className="space-y-4 py-2">
          {toastMsg && (
            <div className={`p-3 rounded-panel text-sm font-medium ${toastMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'}`}>
              {toastMsg.text}
            </div>
          )}

          <div className="flex items-center justify-between border-b border-app-border pb-3">
            <div>
              <span className="font-semibold text-app-text block text-sm">Send Daily Report</span>
              <span className="text-xs text-app-secondary">Schedule report at office close (8:30 PM) daily</span>
            </div>
            <input
              type="checkbox"
              checked={emailSettings.is_enabled}
              onChange={(e) => setEmailSettings({ ...emailSettings, is_enabled: e.target.checked })}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-app-border rounded"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-app-text block">Email Subject</label>
            <input
              type="text"
              value={emailSettings.subject}
              onChange={(e) => setEmailSettings({ ...emailSettings, subject: e.target.value })}
              className="w-full bg-app-surface border border-app-border text-app-text rounded-panel py-2 px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Daily Attendance Report"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-app-text block">Email Body Template</label>
            <textarea
              rows={6}
              value={emailSettings.body}
              onChange={(e) => setEmailSettings({ ...emailSettings, body: e.target.value })}
              className="w-full bg-app-surface border border-app-border text-app-text rounded-panel py-2 px-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-sans"
              placeholder="Enter message body..."
            />
            <span className="text-[11px] text-app-secondary">Note: The system automatically generates and attaches the corporate styled daily Excel spreadsheet to this email.</span>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-app-border">
            <Button
              variant="secondary"
              onClick={handleSendTest}
              disabled={testSending}
              className="text-xs"
            >
              {testSending ? 'Sending...' : 'Send Test Email Now'}
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="text-xs"
            >
              {settingsSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
