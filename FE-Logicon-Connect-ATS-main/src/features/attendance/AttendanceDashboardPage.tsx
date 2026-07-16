import { useState, useEffect } from "react"
import { format, subDays } from "date-fns"
import { 
  Clock, Search, RefreshCw, Download, 
  MapPin, AlertTriangle, Building2, Activity, Mail
} from "lucide-react"

import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { fetchAttendanceDashboard, exportAttendanceReport, AttendanceDashboardData } from "@/api/attendance"
import { EmailReportDrawer } from "./EmailReportDrawer"

export function AttendanceDashboardPage() {
  const todayStr = format(new Date(), "yyyy-MM-dd")
  const defaultStartStr = format(subDays(new Date(), 7), "yyyy-MM-dd")
  
  const [dateStart, setDateStart] = useState(defaultStartStr)
  const [dateEnd, setDateEnd] = useState(todayStr)
  const [searchQuery, setSearchQuery] = useState("")
  const [sessionStatusFilter, setSessionStatusFilter] = useState("all")
  const [attendanceFilter, setAttendanceFilter] = useState("all")
  const [data, setData] = useState<AttendanceDashboardData[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [isEmailDrawerOpen, setIsEmailDrawerOpen] = useState(false)

  const lateThreshold = "09:30"

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await fetchAttendanceDashboard(dateStart, dateEnd)
      setData(result || [])
    } catch (err) {
      console.error("Failed to load attendance data", err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportAttendanceReport(dateStart, dateEnd)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_report_${dateStart}_to_${dateEnd}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Failed to export report", err)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dateStart, dateEnd])

  const filteredData = data.filter((item) => {
    const matchesSearch = item.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
    let matchesSession = true
    if (sessionStatusFilter !== "all") {
      matchesSession = item.session_status?.toLowerCase() === sessionStatusFilter.toLowerCase()
    }
    let matchesAttendance = true
    if (attendanceFilter !== "all") {
      const isPresent = item.check_in_time != null
      if (attendanceFilter === "present" && !isPresent) matchesAttendance = false
      if (attendanceFilter === "absent" && isPresent) matchesAttendance = false
    }
    return matchesSearch && matchesSession && matchesAttendance
  })

  const activeFieldStaff = data.filter(d => d.session_status === "Active Now").length
  const totalStaff = new Set(data.map(d => d.employee_id)).size
  
  const lateArrivals = data.filter(d => {
    if (!d.check_in_time) return false
    const timeStr = format(new Date(d.check_in_time), 'HH:mm')
    return timeStr > lateThreshold
  }).length

  const totalHoursSum = data.reduce((acc, curr) => acc + Number(curr.total_hours), 0)

  const deptMap: Record<string, number> = {}
  data.forEach(d => {
    if (d.check_in_time) {
      const dept = d.department || 'Unassigned'
      deptMap[dept] = (deptMap[dept] || 0) + 1
    }
  })
  const deptArray = Object.entries(deptMap).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 4)

  const exceptions = data.filter(d => {
    if (d.session_status === "Active Now" && Number(d.total_hours) > 12) return true
    return false
  }).slice(0, 3)

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-slate-800">Field Operations & Attendance</h2>
            <p className="text-muted-foreground text-sm">Real-time tracking of field staff attendance and daily hours.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setIsEmailDrawerOpen(true)} className="text-[#1e58a2] border-[#1e58a2] hover:bg-[#eaf2fb] border">
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            <Button variant="secondary" onClick={loadData} className="text-slate-600 bg-white border-slate-200 border">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
            <Button 
              className="bg-[#1e58a2] hover:bg-[#16427d] text-white"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export Report'}
            </Button>
          </div>
        </div>

        {/* Top KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Field Staff</p>
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 animate-pulse"></div>
            </div>
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-slate-800">{activeFieldStaff}</span>
                <span className="text-sm font-medium text-slate-500">/ {totalStaff} total</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-2 font-medium">
                <MapPin className="w-3.5 h-3.5" />
                Currently in the field
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col justify-between h-full">
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Late Arrivals</p>
            </div>
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-amber-500">{lateArrivals}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <Clock className="w-3.5 h-3.5" />
                Checked in after {lateThreshold} AM
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col justify-between h-full">
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aggregate Field Hours</p>
            </div>
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-slate-800">{totalHoursSum.toFixed(1)}</span>
                <span className="text-sm font-medium text-slate-500">hours</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <Activity className="w-3.5 h-3.5" />
                Combined workforce productivity
              </div>
            </div>
          </div>
        </div>

        {/* Middle Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Department Attendance */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col">
            <div className="pb-2 px-5 pt-5 border-b border-slate-100">
              <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                Department Attendance
              </h3>
            </div>
            <div className="p-0 flex-1">
              {deptArray.length === 0 ? (
                <div className="flex items-center justify-center h-full p-5">
                  <p className="text-sm text-slate-400">No attendance data available.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deptArray.map((dept, i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                      <span className="text-[13px] font-medium text-slate-700">{dept.name}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#1e58a2]/10 text-[#1e58a2]">
                        {dept.count} Present
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Operational Exceptions */}
          <div className="border border-slate-200 shadow-sm rounded-xl flex flex-col bg-gradient-to-b from-white to-amber-50/30">
            <div className="pb-2 px-5 pt-5 border-b border-amber-100/50">
              <h3 className="text-[14px] font-bold text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Operational Exceptions
              </h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {exceptions.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-400">No operational anomalies detected.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exceptions.map((ex, i) => (
                    <div key={i} className="p-3 bg-white border border-amber-200 rounded-lg shadow-sm">
                      <p className="text-[13px] font-semibold text-slate-800 mb-1">{ex.employee_name}</p>
                      <p className="text-[11px] text-amber-600 font-medium">
                        Active in field for over 12 hours ({ex.duration_formatted}) without checkout.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Table Section */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Search Staff</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  label=""
                  placeholder="Search name, code..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Start Date</label>
              <Input 
                label=""
                type="date" 
                value={dateStart} 
                onChange={(e: any) => setDateStart(e.target.value)}
                className="h-10"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-2 block">End Date</label>
              <Input 
                label=""
                type="date" 
                value={dateEnd} 
                onChange={(e: any) => setDateEnd(e.target.value)}
                className="h-10"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Session Status</label>
              <Select label="" value={sessionStatusFilter} onChange={(e: any) => setSessionStatusFilter(e.target.value)} className="h-10">
                <option value="all">All Sessions</option>
                <option value="active now">Active Now (In Field)</option>
                <option value="closed">Closed (Checked Out)</option>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Attendance</label>
              <Select label="" value={attendanceFilter} onChange={(e: any) => setAttendanceFilter(e.target.value)} className="h-10">
                <option value="all">All Attendance</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] text-slate-500 font-bold uppercase bg-slate-50 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="px-6 py-4">EMPLOYEE</th>
                  <th className="px-6 py-4">ROLE & DEPT</th>
                  <th className="px-6 py-4">FIELD TIMES</th>
                  <th className="px-6 py-4">DURATION</th>
                  <th className="px-6 py-4">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mb-3" />
                        <p>Loading field logs...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 border-b border-slate-100">
                      No field records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record, idx) => {
                    const isPresent = record.check_in_time != null;
                    const loginStr = record.check_in_time ? format(new Date(record.check_in_time), 'h:mm a') : '-';
                    const logoutStr = record.check_out_time ? format(new Date(record.check_out_time), 'h:mm a') : '-';
                    
                    return (
                      <tr key={`${record.employee_id}-${record.date}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#1e58a2]/10 flex items-center justify-center text-xs font-bold text-[#1e58a2] shadow-sm">
                              {record.employee_name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-[13px] group-hover:text-[#1e58a2] transition-colors">{record.employee_name}</p>
                              <p className="text-[11px] text-slate-500">ID: {record.employee_id} • {format(new Date(record.date), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-800 font-medium text-[13px]">{record.role || '-'}</p>
                          <p className="text-slate-500 text-[11px]">{record.department || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          {isPresent ? (
                            <div className="flex items-center gap-2 text-[12px]">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">In: {loginStr}</span>
                              {record.check_out_time ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">Out: {logoutStr}</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-100 animate-pulse">Active</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[12px]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-800 font-medium text-[13px]">{record.duration_formatted || '-'}</td>
                        <td className="px-6 py-4">
                          {isPresent ? (
                            record.session_status === 'Active Now' ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200/50 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></div>
                                In Field
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></div>
                                Checked Out
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-100 shadow-sm">
                              Absent
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EmailReportDrawer 
        open={isEmailDrawerOpen}
        onClose={() => setIsEmailDrawerOpen(false)}
        dateStart={dateStart}
        dateEnd={dateEnd}
      />
    </div>
  )
}
