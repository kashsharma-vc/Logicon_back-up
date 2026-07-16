/**
 * Notification types and interfaces
 */

export type NotificationType =
  | 'workflow_task_assigned'
  | 'workflow_completed'
  | 'sales_survey_assigned'
  | 'sales_survey_completed'
  | 'mobilisation_operations_assigned'
  | 'mobilisation_setup_completed'
  | 'system'

export interface NotificationRow {
  id: number
  org: number
  recipient: number
  recipient_username: string
  actor: number | null
  actor_username: string | null
  title: string
  message: string
  notification_type: NotificationType | string
  target_type: string
  target_id: number | null
  target_url: string
  metadata: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationUnreadCount {
  unread_count: number
}

export interface NotificationListParams {
  is_read?: boolean
  notification_type?: string
  target_type?: string
  search?: string
  page?: number
}

export interface UnreadByArea {
  workflow: number
  sales: number
  operationsSurveys: number
  mobilisation: number
  mrf: number
}
