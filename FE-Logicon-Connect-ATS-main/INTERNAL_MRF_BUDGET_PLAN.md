# Internal MRF + Internal Hiring Budgets - Frontend Implementation Plan

## Overview

This plan implements frontend support for the internal hiring budget flow:
- Internal hiring budgets: `budget_nature=non_billable`, `budget_type=hiring`, scoped to `department`
- Non-billable MRF requires `required_department` and resolves to internal hiring budget
- Backend is source of truth for budget resolution and readiness

---

## Current State Analysis

### What Already Exists

| Feature | File | Status |
|---------|------|--------|
| Budget CRUD with all filters | `BudgetPlansPage.tsx`, `BudgetPlanForm.tsx` | ✅ Complete |
| Budget lookup helpers | `budgetLookup.ts` | ✅ `loadNonBillableBudgetOptionsForDepartments()` exists |
| MRF form with billing_type | `MRFForm.tsx` | ✅ Has requesting/required department fields |
| MRF line item form | `MRFLineItemForm.tsx` | ✅ Has budget_min/budget_max for non-billable |
| Readiness panel | `MRFReadinessPanel.tsx` | ✅ Shows budget info |
| Hiring lane helpers | `hiringLaneLabels.ts` | ✅ Fully implemented |

### What Needs Enhancement

1. **Budget UI**: No dedicated "Internal Budgets" section/preset
2. **MRF Form**: `required_department` not mandatory for non-billable
3. **Budget Resolution**: No auto-resolution to internal hiring budget
4. **Budget Form**: No shortcut for creating internal hiring budgets
5. **Readiness Panel**: No blocking message for missing internal budget

---

## Implementation Tasks

### Task 1: Internal Budgets Preset Filter (BudgetPlansPage.tsx)

**Goal**: Add a quick-access button/tab to filter for internal hiring budgets.

**Changes**:
```tsx
// Add preset buttons above filter panel
<div className="flex flex-wrap gap-2 mb-3">
  <Button
    variant={isInternalHiringPreset ? 'primary' : 'secondary'}
    size="sm"
    onClick={() => {
      updateParam({
        budget_nature: 'non_billable',
        budget_type: 'hiring',
        client: null,
        site: null
      })
    }}
  >
    Internal hiring budgets
  </Button>
  <Button
    variant={isBillablePreset ? 'primary' : 'secondary'}
    size="sm"
    onClick={() => {
      updateParam({ budget_nature: 'billable', budget_type: null })
    }}
  >
    Billable budgets
  </Button>
  <Button
    variant={!isAnyPreset ? 'primary' : 'secondary'}
    size="sm"
    onClick={() => {
      updateParam({ budget_nature: null, budget_type: null })
    }}
  >
    All budgets
  </Button>
</div>
```

**File**: `src/features/budgets/BudgetPlansPage.tsx`

---

### Task 2: Internal Hiring Budget Quick-Create (BudgetPlanForm.tsx)

**Goal**: When creating with internal hiring preset, auto-set fields and hide irrelevant ones.

**Changes**:
- Add `presetMode?: 'internal_hiring' | null` prop
- When `presetMode='internal_hiring'`:
  - Force `budget_nature='non_billable'`
  - Force `budget_type='hiring'`
  - Hide client/site fields (show department only)
  - Auto-focus department field
  - Show helpful description

**Form behavior**:
```tsx
// In BudgetPlanForm, add logic:
const isInternalHiringMode = presetMode === 'internal_hiring'

// Lock nature/type if preset
if (isInternalHiringMode) {
  // Hide nature/type selects or show read-only badges
  // Hide client/site fields
  // Make department required
}
```

**File**: `src/features/budgets/BudgetPlanForm.tsx`

---

### Task 3: Add `loadInternalHiringBudgetForDepartment()` Helper

**Goal**: Strict lookup for internal hiring budget by department.

**New function in `budgetLookup.ts`**:
```typescript
/**
 * Load active internal hiring budget for a specific department.
 * Filters: budget_nature=non_billable, budget_type=hiring,
 *          department=deptId, status=active, is_active=true
 */
export async function loadInternalHiringBudgetForDepartment(
  departmentId: number
): Promise<{ ok: true; budget: BudgetPlanRow | null } | { ok: false; error: string }> {
  try {
    const res = await listBudgetPlans({
      budget_nature: 'non_billable',
      budget_type: 'hiring',
      department: departmentId,
      status: 'active',
      is_active: true,
      page: 1,
    })
    // Return first match or null
    const budget = res.items.length > 0 ? res.items[0] : null
    return { ok: true, budget }
  } catch (e) {
    return { ok: false, error: parseApiError(e, 'Budget lookup failed').message }
  }
}
```

**File**: `src/features/budgets/budgetLookup.ts`

---

### Task 4: Make Required Department Mandatory for Non-Billable MRF

**Goal**: For `billing_type=non_billable`, require `required_department`.

**Changes to MRFForm.tsx**:
```tsx
// Add validation
const requiredDepartmentError = useMemo(() => {
  if (isNonBillable && !values.required_department) {
    return 'Required department is mandatory for non-billable MRF.'
  }
  return null
}, [isNonBillable, values.required_department])

// Update canSubmit
const canSubmit = !submitting && !siteError && !requiredByError &&
  !clientFieldsError && !lookupError && !requiredDepartmentError

// Update UI - show required indicator
<Select
  id="mrf_required_department"
  label={isNonBillable ? 'Required department *' : 'Required department'}
  error={requiredDepartmentError ?? undefined}
  ...
>
```

**File**: `src/features/mrf/MRFForm.tsx`

---

### Task 5: Internal Hiring Budget Resolution Card (MRFForm.tsx)

**Goal**: When `billing_type=non_billable` and `required_department` is selected, auto-resolve and show internal hiring budget.

**Add state and effect**:
```tsx
const [internalBudget, setInternalBudget] = useState<BudgetPlanRow | null>(null)
const [internalBudgetLoading, setInternalBudgetLoading] = useState(false)
const [internalBudgetError, setInternalBudgetError] = useState<string | null>(null)

useEffect(() => {
  if (!isNonBillable || !values.required_department) {
    setInternalBudget(null)
    setInternalBudgetError(null)
    return
  }

  let cancelled = false
  void (async () => {
    setInternalBudgetLoading(true)
    setInternalBudgetError(null)
    const res = await loadInternalHiringBudgetForDepartment(
      Number(values.required_department)
    )
    if (cancelled) return
    if (res.ok) {
      setInternalBudget(res.budget)
      if (!res.budget) {
        setInternalBudgetError(
          'No active internal hiring budget is configured for this department. ' +
          'Create one before submitting this MRF.'
        )
      }
    } else {
      setInternalBudget(null)
      setInternalBudgetError(res.error)
    }
    setInternalBudgetLoading(false)
  })()
  return () => { cancelled = true }
}, [isNonBillable, values.required_department])
```

**Add UI card**:
```tsx
{isNonBillable && values.required_department && (
  <div className="rounded-panel border border-app-border bg-app-muted/30 p-4">
    <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">
      Internal Hiring Budget
    </p>
    {internalBudgetLoading ? (
      <p className="text-sm text-app-secondary">Resolving budget...</p>
    ) : internalBudgetError ? (
      <div className="mt-2 rounded border border-status-danger/30 bg-status-danger/5 p-3">
        <p className="text-sm text-status-danger">{internalBudgetError}</p>
      </div>
    ) : internalBudget ? (
      <div className="mt-2 space-y-1 text-sm">
        <p className="font-medium text-app-text">
          {internalBudget.name}
          <span className="ml-1 font-mono text-xs text-app-secondary">
            ({internalBudget.code})
          </span>
        </p>
        <p className="text-app-secondary">
          Total: {formatMoneyAmount(internalBudget.amount, internalBudget.currency)}
        </p>
        <p className="text-app-secondary">
          Reserved: {formatMoneyAmount(internalBudget.reserved_amount, internalBudget.currency)}
        </p>
        <p className="text-app-secondary">
          Committed: {formatMoneyAmount(internalBudget.committed_amount, internalBudget.currency)}
        </p>
        <p className="text-app-secondary">
          Available: {formatMoneyAmount(internalBudget.available_amount, internalBudget.currency)}
        </p>
      </div>
    ) : null}
  </div>
)}
```

**Block submission if no budget**:
```tsx
const canSubmit = ... && !(isNonBillable && values.required_department && !internalBudget)
```

**File**: `src/features/mrf/MRFForm.tsx`

---

### Task 6: Update Non-Billable Line Item Labels

**Goal**: Clarify field labels and help text for internal/non-billable line items.

**Changes to MRFLineItemForm.tsx**:
```tsx
// Update budget fields section for non-billable
{!isBillable ? (
  <div className="space-y-3">
    <div className="rounded-panel border border-app-border bg-app-muted/20 p-3">
      <p className="text-xs font-semibold text-app-text">Internal hiring line item</p>
      <p className="mt-1 text-xs text-app-secondary">
        No site role requirement needed. Enter budget amount directly.
      </p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        id="mrf_li_budget_min"
        label="Monthly cost (min)"
        ...
      />
      <Input
        id="mrf_li_budget_max"
        label="Monthly cost (max)"
        ...
      />
    </div>
  </div>
) : null}
```

**File**: `src/features/mrf/MRFLineItemForm.tsx`

---

### Task 7: Enhance MRFReadinessPanel for Internal Budget

**Goal**: Show resolved internal budget details and blocking message if missing.

**Changes to MRFReadinessPanel.tsx**:
```tsx
// Add internal budget context
const isInternalMrf = mrf.billing_type === 'non_billable'

// In hints logic, add internal budget hint
if (isInternalMrf && !readiness.budget.plan_id && !readiness.budget.budget_plan_id) {
  hints.push('Configure internal hiring budget for required department')
}

// Update budget block for internal budgets
{isInternalMrf && readiness.budget && (
  <div className="mt-4 rounded-panel border border-app-border bg-app-muted/20 p-3">
    <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">
      Internal Hiring Budget
    </p>
    {readiness.budget.plan_name ? (
      <div className="mt-2 space-y-1 text-sm">
        <p className="font-medium text-app-text">
          {readiness.budget.plan_name}
          {readiness.budget.plan_code && (
            <span className="ml-1 font-mono text-xs">({readiness.budget.plan_code})</span>
          )}
        </p>
        <div className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
          <p>Total: {formatMoney(readiness.budget.total_amount, currency)}</p>
          <p>Reserved: {formatMoney(readiness.budget.reserved_amount, currency)}</p>
          <p>Committed: {formatMoney(readiness.budget.committed_amount, currency)}</p>
          <p>Available: {formatMoney(readiness.budget.available_amount, currency)}</p>
          <p className="font-medium">
            Requested: {formatMoney(readiness.budget.requested_amount, currency)}
          </p>
        </div>
      </div>
    ) : (
      <p className="mt-2 text-sm text-status-danger">
        No active internal hiring budget found for this department.
      </p>
    )}
  </div>
)}
```

**File**: `src/features/mrf/MRFReadinessPanel.tsx`

---

### Task 8: MRF Detail Page - Internal Lane Display

**Goal**: Show "Internal Non-Billable" badge and department info on MRF detail.

**Changes to MRFDetailPage.tsx** (if exists):
```tsx
// Import hiring lane helpers
import {
  hiringLaneBadgeLabel,
  hiringLaneBadgeVariant,
  isInternalNonBillable
} from '@/features/hiring/hiringLaneLabels'

// Add lane badge display
{mrf.billing_type === 'non_billable' && (
  <Badge variant="warning">Internal Non-Billable</Badge>
)}

// Show department info prominently
{mrf.requesting_department_name && (
  <p className="text-sm text-app-secondary">
    Requesting: {mrf.requesting_department_name}
  </p>
)}
{mrf.required_department_name && (
  <p className="text-sm text-app-secondary">
    Required: {mrf.required_department_name}
  </p>
)}
```

**File**: `src/features/mrf/MRFDetailPage.tsx`

---

### Task 9: Hiring Demand - Internal Lane Display

**Goal**: Ensure approved internal MRF demands show correct lane info (already mostly done).

**Verify in HiringDemandDetailPage.tsx**:
```tsx
// Already implemented via hiringLaneLabels.ts
// Verify these are working:
const needsClientReview = requiresClientReview(demand)  // Should be false for internal
const laneLabel = hiringLaneBadgeLabel(demand)  // Should show "Internal"

// Client review section should be hidden for internal
{needsClientReview && (
  // Client review UI - should not show for internal
)}
```

**File**: `src/features/hiring/HiringDemandDetailPage.tsx` (verify existing)

---

## Task Summary

| # | Task | File(s) | Priority |
|---|------|---------|----------|
| 1 | Internal budgets preset filter | `BudgetPlansPage.tsx` | High |
| 2 | Internal hiring budget quick-create | `BudgetPlanForm.tsx` | High |
| 3 | `loadInternalHiringBudgetForDepartment()` | `budgetLookup.ts` | High |
| 4 | Required department mandatory | `MRFForm.tsx` | High |
| 5 | Internal budget resolution card | `MRFForm.tsx` | High |
| 6 | Non-billable line item labels | `MRFLineItemForm.tsx` | Medium |
| 7 | Readiness panel internal budget | `MRFReadinessPanel.tsx` | Medium |
| 8 | MRF detail lane display | `MRFDetailPage.tsx` | Medium |
| 9 | Verify hiring demand display | `HiringDemandDetailPage.tsx` | Low |

---

## Dependencies

- Backend must provide `budget_nature`, `budget_type` filters on `/api/budgets/plans/`
- Backend must validate MRF readiness and return budget info
- Backend must set `hiring_lane`, `requires_client_review` on approved demands

---

## Verification Commands

```bash
# Build check
npm run build

# No unsafe patterns
rg "alert\(|confirm\(|prompt\(" src/features/mrf src/features/budgets src/features/hiring src/api

# No any types
rg ": any\b|as any\b|<any>|TODO" src/features/mrf src/features/budgets src/features/hiring src/api
```

---

## Manual Test Checklist

1. [ ] Create internal hiring budget for HR department
2. [ ] Verify budget appears with preset filter
3. [ ] Create non-billable MRF, select HR as required department
4. [ ] Verify budget summary card appears
5. [ ] Add line item with job role + headcount + budget amount
6. [ ] Try submit without budget for another department → blocked
7. [ ] Submit valid MRF → workflow starts
8. [ ] Approve MRF → verify budget committed
9. [ ] Check hiring demand shows "Internal Non-Billable"
10. [ ] Verify no client review step on hiring demand
