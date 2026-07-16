# Hiring Lane Frontend Implementation Plan

## Corrections Applied (from review)

1. **PoolCandidateSummary excluded** - Lane belongs to demand/application, not candidate summary
2. **Helper fallback is strict** - No guessing from `billing_type`, show "Lane unavailable" if missing
3. **Client Review Page** - Backend is source of truth, frontend is defensive only
4. **Offer gate uses `status === 'selected'`** - Non-billable still needs internal selection clearance
5. **MRF strictness expanded** - Includes MRFCreateWorkspaceDrawer.tsx, MRFReadinessPanel.tsx
6. **Added `isClientBillable()` and `hasLaneInfo()` helpers**
7. **Post-implementation audit** - Search for old lane-guessing patterns

---

## Overview

**Goal:** Stop inferring lane behavior from scattered fields (role, user, client_visible, status labels) and consume authoritative backend fields:
- `hiring_lane` - `'client_billable'` | `'internal_non_billable'`
- `hiring_lane_label` - Display label from backend
- `requires_client_review` - Boolean flag
- `billing_type` - `'billable'` | `'non_billable'`
- Department and resolved budget fields on demand rows

---

## Phase 1: Foundation

### Task 1: Update Types

**File:** `src/features/hiring/types.ts`

Add to `HiringDemandRow`:
```typescript
billing_type?: 'billable' | 'non_billable' | string | null
hiring_lane?: 'client_billable' | 'internal_non_billable' | string | null
hiring_lane_label?: string | null
requires_client_review?: boolean | null
// Department fields
requesting_department_id?: number | null
requesting_department_name?: string | null
requesting_department_code?: string | null
required_department_id?: number | null
required_department_name?: string | null
required_department_code?: string | null
// Resolved budget fields
resolved_budget_plan_id?: number | null
resolved_budget_plan_name?: string | null
resolved_budget_plan_code?: string | null
```

Add to `HiringApplicationRow`:
```typescript
billing_type?: 'billable' | 'non_billable' | string | null
hiring_lane?: 'client_billable' | 'internal_non_billable' | string | null
hiring_lane_label?: string | null
requires_client_review?: boolean | null
```

Also update: `CandidatePoolResultRow`, `ClientReviewApplicationRow`

**Note:** Do NOT update `PoolCandidateSummary` - lane belongs to demand/application, not candidate summary. For `ResumePoolDrawer`, use the parent `demand` object for lane context.

---

### Task 2: Create Shared Helper Module

**New File:** `src/features/hiring/hiringLaneLabels.ts`

```typescript
import type { HiringDemandRow, HiringApplicationRow } from '@/features/hiring/types'

export type HiringLane = 'client_billable' | 'internal_non_billable' | string
export type BillingType = 'billable' | 'non_billable' | string

export interface HiringLaneSource {
  hiring_lane?: HiringLane | null
  hiring_lane_label?: string | null
  billing_type?: BillingType | null
  requires_client_review?: boolean | null
}

export type BadgeVariant = 'neutral' | 'success' | 'danger' | 'info' | 'warning' | 'attention'

/** Returns display label for hiring lane badge */
export function hiringLaneBadgeLabel(source: HiringLaneSource): string {
  if (source.hiring_lane_label?.trim()) return source.hiring_lane_label.trim()
  if (source.hiring_lane === 'client_billable') return 'Client Billable'
  if (source.hiring_lane === 'internal_non_billable') return 'Internal'
  // Do NOT guess from billing_type - show explicit unknown state
  return 'Lane unavailable'
}

/** Returns badge color variant for hiring lane */
export function hiringLaneBadgeVariant(source: HiringLaneSource): BadgeVariant {
  if (source.hiring_lane === 'client_billable') return 'info'
  if (source.hiring_lane === 'internal_non_billable') return 'warning'
  // Unknown lane gets neutral
  return 'neutral'
}

/** Returns true if requires client review - backend is STRICT source of truth */
export function requiresClientReview(source: HiringLaneSource): boolean {
  // Only return true if backend explicitly says so
  return source.requires_client_review === true
}

/** Returns true if internal non-billable lane */
export function isInternalNonBillable(source: HiringLaneSource): boolean {
  return source.hiring_lane === 'internal_non_billable'
}

/** Returns true if client billable lane */
export function isClientBillable(source: HiringLaneSource): boolean {
  return source.hiring_lane === 'client_billable'
}

/** Returns true if lane info is available from backend */
export function hasLaneInfo(source: HiringLaneSource): boolean {
  return source.hiring_lane != null && source.requires_client_review != null
}

// Convenience wrappers
export const demandRequiresClientReview = (d: HiringDemandRow) => requiresClientReview(d)
export const demandIsInternalNonBillable = (d: HiringDemandRow) => isInternalNonBillable(d)
export const demandIsClientBillable = (d: HiringDemandRow) => isClientBillable(d)
export const applicationRequiresClientReview = (a: HiringApplicationRow) => requiresClientReview(a)
export const applicationIsInternalNonBillable = (a: HiringApplicationRow) => isInternalNonBillable(a)
export const applicationIsClientBillable = (a: HiringApplicationRow) => isClientBillable(a)
```

---

## Phase 2: Core Demand/Application Flow

### Task 3: Update Hiring Demands Page

**File:** `src/features/hiring/HiringDemandsPage.tsx`

Changes:
1. Add lane badge column to table after "Client / site"
2. For non-billable rows, show `required_department_name` and `resolved_budget_plan_name`
3. Add filters above table:
   - Billing type: All / Billable / Non-billable
   - Hiring lane: All / Client Billable / Internal Non-billable
4. Use backend query params: `?billing_type=...&hiring_lane=...`

---

### Task 4: Update Demand Detail Page

**File:** `src/features/hiring/HiringDemandDetailPage.tsx`

Changes:

1. **DemandSummary section**: Add lane badge next to billing_type, add department info row for non-billable

2. **"Send to client" button** (ApplicationsTab):
   - Change from `canSendToClient &&` to `canSendToClient && demandRequiresClientReview(demand) &&`
   - Hide entirely for non-billable demands

3. **APP_GROUPS in ApplicationsTab**:
   - Conditionally show/hide "Sent to client" and "Client approved" groups based on `demandRequiresClientReview(demand)`
   - For non-billable: Shortlisted → Ready for offer (skip client review)

4. **categorizeApp function**:
   - Pass `requiresClientReview` parameter
   - For non-billable: `shortlisted` goes directly to `approved` category

5. **Success messages after shortlisting**:
   - Billable: "Send shortlisted candidates to client for review."
   - Non-billable: "Shortlisted candidates are ready for interview/offer."

---

### Task 5: Update Candidate Pool / Shortlist Flow

**File:** `src/features/hiring/HiringDemandDetailPage.tsx` (CandidatePoolTab)

Changes:
1. Update `justShortlisted` success message to branch:
   - Billable: "Candidate shortlisted. Send shortlisted candidates to client review."
   - Non-billable: "Candidate shortlisted. Continue with internal interview workflow."

---

## Phase 3: Client Review & Offers

### Task 6: Update Client Review Page

**File:** `src/features/hiring/ClientReviewPage.tsx`

Changes:
1. **Backend is source of truth** - backend already filters out non-billable applications from client review endpoints
2. **Frontend defensive filter** (fallback only): exclude rows where `applicationIsInternalNonBillable(app)` is true
3. Update `ClientReviewApplicationRow` type with lane fields
4. Do NOT add fake client-review flow for non-billable - backend prevents this

**Important:** Frontend should not duplicate client-review logic. If backend returns a row, it's valid for client review.

---

### Task 7: Update Application Detail Page

**File:** `src/features/hiring/HiringApplicationDetailPage.tsx`

Changes:

1. **Offer section gate logic**:
```typescript
const needsClientReview = applicationRequiresClientReview(row)
// For billable: requires client approval
// For non-billable: requires internal selection (status === 'selected')
const clientApproved = row.client_decision === 'approved'
const internalCleared = row.status === 'selected'
const readyForOffer = needsClientReview ? clientApproved : internalCleared

{!offer && !readyForOffer ? (
  <p className="text-sm text-app-secondary">
    {needsClientReview
      ? "Client approval required before creating an offer."
      : "Complete internal interview/selection clearance before creating an offer."}
  </p>
) : ...}
```

2. **Offer button visibility**:
   - `status === 'selected'` remains the clean offer-ready signal for both lanes
   - Billable: requires `client_decision === 'approved'` which sets `status === 'selected'`
   - Non-billable: internal process sets `status === 'selected'` directly

3. **Hero header**: Add lane badge next to status badge

4. **Journey**: Pass lane info to HiringApplicationJourney

---

## Phase 4: Pipeline & Supplementary

### Task 8: Update Interview Pipeline

**File:** `src/features/hiring/InterviewPipelineCard.tsx`

Changes:
1. Add lane badge to card (next to existing badges)
2. No special lane-based action restrictions needed

**File:** `src/features/hiring/InterviewPipelinePage.tsx`

Changes:
1. Add hiring_lane filter dropdown
2. Update `matchesFilter` function for lane filtering

---

### Task 9: Update Resume Pool Drawer

**File:** `src/features/hiring/ResumePoolDrawer.tsx`

Changes:
1. Show lane context in demand summary: `${demand.job_role_name} | ${demand.site_name} | ${hiringLaneBadgeLabel(demand)}`
2. Update success message after linking:
   - Billable: "Next: Send to client for review from the demand page."
   - Non-billable: "Next: Proceed with interview/offer process."

---

### Task 10: Update Journey Component

**File:** `src/features/hiring/HiringJourney.tsx`

Changes:

1. **HiringDemandJourney**: Conditionally include client review steps based on `demandRequiresClientReview(demand)`

2. **applicationJourneySteps**: Accept `requiresReview` parameter
   - Billable: ['Shortlisted', 'Sent to client', 'Client approved', 'Offer released', 'Offer accepted', 'Deployed']
   - Non-billable: ['Shortlisted', 'Ready for offer', 'Offer released', 'Offer accepted', 'Deployed']

3. **HiringApplicationJourney**: Pass `applicationRequiresClientReview(app)` to steps function

---

## Phase 5: MRF Strictness

### Task 11: Update MRF Frontend

**Files to inspect and update:**
- `src/features/mrf/MRFForm.tsx` - Main form
- `src/features/mrf/MRFCreateWorkspaceDrawer.tsx` - Create drawer
- `src/features/mrf/MRFReadinessPanel.tsx` - Readiness display
- Client/internal create paths
- Budget-plan select/autofill behavior

**Principle:** Frontend should display backend readiness errors clearly instead of duplicating full budget logic. Backend is source of truth for budget validation.

**MRFForm.tsx Changes:**

1. **Required department validation** (frontend hint only):
```typescript
const requiredDepartmentError = useMemo(() => {
  if (isNonBillable && !values.required_department.trim()) {
    return 'Required department is mandatory for non-billable MRFs.'
  }
  return null
}, [isNonBillable, values.required_department])
```

2. **Show backend readiness errors clearly** - don't duplicate budget logic:
```typescript
// Display backend readiness.errors directly instead of frontend budget calculation
{readiness?.errors?.map((err) => (
  <p key={err} className="text-xs text-status-danger">{err}</p>
))}
```

3. **Block submit based on backend readiness**:
```typescript
const canSubmit = !submitting && readiness?.is_ready !== false && !requiredDepartmentError
```

**MRFReadinessPanel.tsx Changes:**
- Show lane-specific messaging in readiness warnings
- Display department requirement as readiness check for non-billable
- Show resolved budget context from backend (budget plan name, available, requested)

**MRFCreateWorkspaceDrawer.tsx Changes:**
- Ensure non-billable path requires department selection before proceeding
- Show budget context after department selection

---

## Implementation Sequence

| Order | Tasks | Description |
|-------|-------|-------------|
| 1 | Tasks 1-2 | Foundation: Types + Helper module |
| 2 | Tasks 3-5 | Core demand/application flow |
| 3 | Tasks 6-7 | Client review & offers |
| 4 | Tasks 8-10 | Pipeline & supplementary |
| 5 | Task 11 | MRF strictness |

---

## Critical Rules

**DO NOT:**
- Infer lane from `client_visible`
- Infer lane from user role
- Hide client review based only on `billing_type` if `requires_client_review` exists
- Hardcode client names, departments, or statuses
- Create frontend-only fake budget logic

**ALWAYS:**
- Use backend `requires_client_review` as source of truth
- Use helper functions from `hiringLaneLabels.ts`
- Pass lane info through component props

---

## Verification

```bash
npm run build
rg "alert\(|confirm\(|prompt\(" src/features/hiring src/features/mrf src/api
rg ": any\b|as any\b|<any>|TODO" src/features/hiring src/features/mrf src/api
```

**Post-implementation audit for old lane-guessing patterns:**
```bash
rg "client_visible|billing_type.*billable|requested_by_type|user_type" src/features/hiring
```
Manually inspect hits and ensure they are NOT used to decide lane flow when `requires_client_review` exists.

Manual testing:
- [ ] Billable demand shows client review flow
- [ ] Internal non-billable demand skips client review
- [ ] Non-billable application can reach offer without client approval
- [ ] Billable application still requires client approval
- [ ] Demand filters by `billing_type` and `hiring_lane`
- [ ] Internal MRF readiness blocks missing required department budget

---

## Key Files

| File | Changes |
|------|---------|
| `src/features/hiring/types.ts` | Add lane/department/budget fields to types |
| `src/features/hiring/hiringLaneLabels.ts` | **NEW** - Shared helper functions (strict, no guessing) |
| `src/features/hiring/HiringDemandsPage.tsx` | Lane badge, filters |
| `src/features/hiring/HiringDemandDetailPage.tsx` | Conditional client review flow |
| `src/features/hiring/HiringApplicationDetailPage.tsx` | Lane-aware offer gate (`status === 'selected'` is gate) |
| `src/features/hiring/HiringJourney.tsx` | Conditional journey steps |
| `src/features/hiring/ClientReviewPage.tsx` | Defensive filter (backend is source of truth) |
| `src/features/hiring/InterviewPipelineCard.tsx` | Lane badge |
| `src/features/hiring/InterviewPipelinePage.tsx` | Lane filter |
| `src/features/hiring/ResumePoolDrawer.tsx` | Lane context from parent demand (not candidate) |
| `src/features/mrf/MRFForm.tsx` | Department validation, show backend readiness errors |
| `src/features/mrf/MRFCreateWorkspaceDrawer.tsx` | Non-billable path requires department |
| `src/features/mrf/MRFReadinessPanel.tsx` | Lane-specific messaging, budget context display |
