import { api } from '@/api/client'

export interface UserActivityLog {
  id: number
  user: number
  username: string
  first_name: string
  last_name: string
  email: string
  employee_code: string
  department_name: string | null
  department_code: string | null
  role_name: string | null
  login_time: string
  logout_time: string | null
  ip_address: string | null
  user_agent: string | null
  session_status: 'active' | 'completed' | 'timed_out'
  attendance_status: 'present' | 'late' | 'under_hours' | 'absent'
}

export interface ActivityStats {
  kpis: {
    total_sessions: number
    active_now: number
    present_today: number
    late_today: number
  }
  department_breakdown: Record<string, number>
  role_breakdown: Record<string, number>
  device_breakdown: {
    Desktop: number
    Mobile: number
    Tablet: number
  }
}

export interface FetchLogsParams {
  page?: number
  search?: string
  session_status?: string
  attendance_status?: string
  date?: string
  start_date?: string
  end_date?: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export async function fetchUserActivityLogs(params: FetchLogsParams = {}): Promise<PaginatedResponse<UserActivityLog>> {
  const { data } = await api.get<PaginatedResponse<UserActivityLog>>('/api/audit/user-activity/', { params })
  return data
}

export async function fetchUserActivityStats(params: FetchLogsParams = {}): Promise<ActivityStats> {
  const { data } = await api.get<ActivityStats>('/api/audit/user-activity/stats/', { params })
  return data
}

export async function exportUserActivityExcel(params: FetchLogsParams = {}): Promise<Blob> {
  const { data } = await api.get<Blob>('/api/audit/user-activity/export_excel/', {
    params,
    responseType: 'blob'
  })
  return data
}

export interface EmailSettings {
  id?: number
  subject: string
  body: string
  is_enabled: boolean
}

export async function fetchEmailSettings(): Promise<EmailSettings> {
  const { data } = await api.get<EmailSettings>('/api/audit/email-settings/')
  return data
}

export async function updateEmailSettings(payload: EmailSettings): Promise<EmailSettings> {
  const { data } = await api.post<EmailSettings>('/api/audit/email-settings/', payload)
  return data
}

export async function sendTestEmail(): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>('/api/audit/email-settings/test_email/')
  return data
}



