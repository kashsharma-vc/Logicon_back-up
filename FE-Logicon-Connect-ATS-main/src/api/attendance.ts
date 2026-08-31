import { api } from '@/api/client'

export interface AttendanceDashboardData {
  employee_id: number;
  employee_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number;
  meetings_total: number;
  meetings_completed: number;
  meetings_pending: number;
  role?: string;
  department?: string;
  session_status?: string;
  duration_formatted?: string;
  ip_address?: string;
}

export const fetchAttendanceDashboard = async (
  dateStart: string,
  dateEnd: string,
  employeeId?: number
): Promise<AttendanceDashboardData[]> => {
  const params: any = {
    date_start: dateStart,
    date_end: dateEnd
  }
  if (employeeId) {
    params.employee_id = employeeId
  }
  const res = await api.get('/api/attendance/dashboard/', { params })
  return res.data as AttendanceDashboardData[]
}

export const exportAttendanceReport = async (
  dateStart: string,
  dateEnd: string
): Promise<Blob> => {
  const params = { date_start: dateStart, date_end: dateEnd }
  const res = await api.get('/api/attendance/export/', { 
    params,
    responseType: 'blob' 
  })
  return res.data
}

export const sendAttendanceEmailReport = async (data: {
  dateStart: string
  dateEnd: string
  subject: string
  body: string
  to?: string
  cc?: string
}): Promise<{ message: string }> => {
  const res = await api.post('/api/attendance/send-report/', data)
  return res.data
}