/**
 * Hiring Lane Helpers
 *
 * Centralized logic for hiring lane display and behavior.
 * Backend is the strict source of truth. These helpers do not guess lane
 * behavior from billing_type or other legacy fields.
 */
import type { HiringDemandRow, HiringApplicationRow, ClientReviewApplicationRow } from '@/features/hiring/types'

export type HiringLane = 'client_billable' | 'internal_non_billable' | string
export type BillingType = 'billable' | 'non_billable' | string

export interface HiringLaneSource {
  hiring_lane?: HiringLane | null
  hiring_lane_label?: string | null
  billing_type?: BillingType | null
  requires_client_review?: boolean | null
}

export type BadgeVariant = 'neutral' | 'success' | 'danger' | 'info' | 'warning' | 'attention'

export function hiringLaneBadgeLabel(source: HiringLaneSource): string {
  if (source.hiring_lane_label?.trim()) return source.hiring_lane_label.trim()
  if (source.hiring_lane === 'client_billable') return 'Client Billable'
  if (source.hiring_lane === 'internal_non_billable') return 'Internal'
  return 'Lane unavailable'
}

export function hiringLaneBadgeVariant(source: HiringLaneSource): BadgeVariant {
  if (source.hiring_lane === 'client_billable') return 'info'
  if (source.hiring_lane === 'internal_non_billable') return 'warning'
  return 'neutral'
}

export function requiresClientReview(source: HiringLaneSource): boolean {
  return source.requires_client_review === true
}

export function isInternalNonBillable(source: HiringLaneSource): boolean {
  return source.hiring_lane === 'internal_non_billable'
}

export function isClientBillable(source: HiringLaneSource): boolean {
  return source.hiring_lane === 'client_billable'
}

export function hasLaneInfo(source: HiringLaneSource): boolean {
  return source.hiring_lane != null && source.requires_client_review != null
}

export function demandRequiresClientReview(demand: HiringDemandRow): boolean {
  return requiresClientReview(demand)
}

export function demandIsInternalNonBillable(demand: HiringDemandRow): boolean {
  return isInternalNonBillable(demand)
}

export function demandIsClientBillable(demand: HiringDemandRow): boolean {
  return isClientBillable(demand)
}

export function demandHasLaneInfo(demand: HiringDemandRow): boolean {
  return hasLaneInfo(demand)
}

export function applicationRequiresClientReview(app: HiringApplicationRow | ClientReviewApplicationRow): boolean {
  return requiresClientReview(app)
}

export function applicationIsInternalNonBillable(app: HiringApplicationRow | ClientReviewApplicationRow): boolean {
  return isInternalNonBillable(app)
}

export function applicationIsClientBillable(app: HiringApplicationRow | ClientReviewApplicationRow): boolean {
  return isClientBillable(app)
}

export function applicationHasLaneInfo(app: HiringApplicationRow | ClientReviewApplicationRow): boolean {
  return hasLaneInfo(app)
}
